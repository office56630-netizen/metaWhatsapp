import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, User, Client, Plan } from './server/db';
import { CreditService } from './server/services/credit';
import { WhatsAppCloudApiService } from './server/services/whatsapp';
import { ContactService } from './server/services/contact';
import { ImportService } from './server/services/import';
import { CampaignService } from './server/services/campaign';
import { cloudFirestore } from './server/services/firestore';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      clientAccount?: Client;
      currentUser?: User;
      isImpersonating?: boolean;
      originalAdminId?: string;
    }
  }
}

// -------------------------------------------------------------
// CLIENT API TOKEN AUTHENTICATION MIDDLEWARE (/api/v1/...)
// -------------------------------------------------------------
const authenticateClientApiToken = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTHORIZATION_HEADER',
        message: 'Missing or malformed Authorization header. Expected: Bearer YOUR_API_TOKEN'
      }
    });
  }

  const token = authHeader.substring(7).trim();
  const client = db.getClientByToken(token);

  if (!client) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or revoked client API token.'
      }
    });
  }

  if (client.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CLIENT_SUSPENDED',
        message: 'Client account has been suspended by Super Admin.'
      }
    });
  }

  if (client.api_status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'API_ACCESS_SUSPENDED',
        message: 'Client API access has been temporarily suspended.'
      }
    });
  }

  req.clientAccount = client;

  // Log API request on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    db.addApiLog({
      id: `LOG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_id: client.id,
      endpoint: req.originalUrl,
      method: req.method,
      request_id: `req_${crypto.randomBytes(6).toString('hex')}`,
      status_code: res.statusCode,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      execution_time_ms: duration,
      created_at: new Date().toISOString()
    });
  });

  next();
};

// -------------------------------------------------------------
// FRONTEND SESSION AUTH HELPER (Simulated session tokens)
// -------------------------------------------------------------
// Simple in-memory session store for client & admin frontend sessions
interface SessionData {
  userId: string;
  role: 'super_admin' | 'client_admin' | 'client_user';
  clientId: string | null;
  impersonating?: boolean;
  originalAdminId?: string;
}
const sessions = new Map<string, SessionData>();

// Initialize default sessions for quick seamless login
const ADMIN_SESSION_TOKEN = 'session_superadmin_master_token_2026';
sessions.set(ADMIN_SESSION_TOKEN, {
  userId: 'USR-SUPERADMIN',
  role: 'super_admin',
  clientId: null
});

const CLIENT1_SESSION_TOKEN = 'session_client1_abc_salon_token_2026';
sessions.set(CLIENT1_SESSION_TOKEN, {
  userId: 'USR-CLT1-ADMIN',
  role: 'client_admin',
  clientId: 'CLT-00001'
});

const authenticateSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.status(401).json({ success: false, error: 'Unauthorized session' });
  }

  const s = sessions.get(sessionToken)!;
  const user = db.getUsers().find(u => u.id === s.userId);
  if (!user || user.status === 'suspended') {
    return res.status(401).json({ success: false, error: 'User inactive or not found' });
  }

  req.currentUser = user;
  req.isImpersonating = !!s.impersonating;
  req.originalAdminId = s.originalAdminId;

  if (s.clientId) {
    const client = db.getClientById(s.clientId);
    if (client) req.clientAccount = client;
  }

  next();
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.currentUser?.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super Admin privileges required.' });
  }
  next();
};

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES (/api/auth)
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.getUsers().find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());

  if (!user || user.password_hash !== password) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
  }

  const token = `session_${crypto.randomBytes(16).toString('hex')}`;
  sessions.set(token, {
    userId: user.id,
    role: user.role,
    clientId: user.client_id || null
  });

  const client = user.client_id ? db.getClientById(user.client_id) : null;

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: user.id,
    user_name: user.name,
    client_id: user.client_id || null,
    action: 'USER_LOGIN',
    details: `User logged in (${user.role})`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      client_id: user.client_id
    },
    client,
    isImpersonating: false
  });
});

app.get('/api/auth/me', authenticateSession, (req, res) => {
  const client = req.clientAccount || (req.currentUser?.client_id ? db.getClientById(req.currentUser.client_id) : null);
  res.json({
    success: true,
    user: {
      id: req.currentUser!.id,
      name: req.currentUser!.name,
      email: req.currentUser!.email,
      role: req.currentUser!.role,
      client_id: req.currentUser!.client_id
    },
    client,
    isImpersonating: req.isImpersonating,
    originalAdminId: req.originalAdminId
  });
});

// Admin impersonation: "Login as Client"
app.post('/api/auth/impersonate', authenticateSession, requireSuperAdmin, (req, res) => {
  const { clientId } = req.body;
  const targetClient = db.getClientById(clientId);
  if (!targetClient) {
    return res.status(404).json({ success: false, error: 'Target client not found' });
  }

  const clientAdminUser = db.getUsers().find(u => u.client_id === clientId) || {
    id: `IMP-${targetClient.id}`,
    name: `${targetClient.company_name} Admin`,
    email: targetClient.email,
    role: 'client_admin' as const,
    client_id: targetClient.id,
    status: 'active' as const,
    password_hash: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const impersonationToken = `session_imp_${crypto.randomBytes(16).toString('hex')}`;
  sessions.set(impersonationToken, {
    userId: clientAdminUser.id,
    role: 'client_admin',
    clientId: targetClient.id,
    impersonating: true,
    originalAdminId: req.currentUser!.id
  });

  db.addImpersonationLog({
    id: `IMP-LOG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    admin_id: req.currentUser!.id,
    admin_email: req.currentUser!.email,
    client_id: targetClient.id,
    client_company: targetClient.company_name,
    login_time: new Date().toISOString(),
    ip: req.ip || '127.0.0.1'
  });

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: targetClient.id,
    action: 'ADMIN_IMPERSONATION_START',
    details: `Super Admin started viewing as client ${targetClient.company_name} (${targetClient.id})`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    token: impersonationToken,
    client: targetClient,
    user: clientAdminUser
  });
});

app.post('/api/auth/stop-impersonation', authenticateSession, (req, res) => {
  if (!req.isImpersonating || !req.originalAdminId) {
    return res.status(400).json({ success: false, error: 'Not currently impersonating a client' });
  }

  const superAdminUser = db.getUsers().find(u => u.id === req.originalAdminId);
  const adminToken = `session_${crypto.randomBytes(16).toString('hex')}`;
  sessions.set(adminToken, {
    userId: req.originalAdminId,
    role: 'super_admin',
    clientId: null
  });

  res.json({
    success: true,
    token: adminToken,
    user: superAdminUser
  });
});

// -------------------------------------------------------------
// 2. CLIENT DASHBOARD ROUTES (/api/client/...)
// -------------------------------------------------------------
// Overview stats
app.get('/api/client/dashboard', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id;
  if (!clientId) return res.status(400).json({ success: false, error: 'Client context missing' });

  const client = db.getClientById(clientId);
  if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

  const contactsTotal = db.getContacts(clientId).total;
  const groupsTotal = db.getGroups(clientId).length;
  const campaigns = db.getCampaigns(clientId);
  const messages = db.getCampaignMessages(clientId, { limit: 10000 }).messages;
  const whatsapp = db.getWhatsAppAccount(clientId);
  const plan = db.getPlans().find(p => p.id === client.plan_id);

  const sentCount = messages.filter(m => m.status === 'Sent' || m.status === 'Delivered' || m.status === 'Read').length;
  const deliveredCount = messages.filter(m => m.status === 'Delivered' || m.status === 'Read').length;
  const readCount = messages.filter(m => m.status === 'Read').length;
  const failedCount = messages.filter(m => m.status === 'Failed').length;

  res.json({
    success: true,
    client,
    plan,
    whatsapp,
    overview: {
      total_contacts: contactsTotal,
      total_groups: groupsTotal,
      total_campaigns: campaigns.length,
      messages_sent: sentCount,
      messages_delivered: deliveredCount,
      messages_read: readCount,
      messages_failed: failedCount,
      delivery_rate: sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0,
      read_rate: deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0,
      marketing_credits: client.marketing_credits,
      marketing_credits_used: client.marketing_credits_used,
      utility_credits: client.utility_credits,
      utility_credits_used: client.utility_credits_used,
      campaign_message_limit: client.campaign_message_limit,
      campaign_messages_remaining: Math.max(0, client.campaign_message_limit - client.campaign_messages_sent),
      api_requests: db.getApiLogs(clientId).length
    }
  });
});

// Contacts CRUD
app.get('/api/client/contacts', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { groupId, search, status, limit, offset } = req.query;

  const result = db.getContacts(clientId, {
    groupId: groupId as string,
    search: search as string,
    status: status as string,
    limit: limit ? parseInt(limit as string, 10) : 100,
    offset: offset ? parseInt(offset as string, 10) : 0
  });

  res.json({ success: true, ...result });
});

app.post('/api/client/contacts', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const result = ContactService.createContact(clientId, req.body);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, contact: result.contact });
});

app.put('/api/client/contacts/:id', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const result = ContactService.updateContact(clientId, req.params.id, req.body);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, contact: result.contact });
});

app.delete('/api/client/contacts/:id', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const ok = db.deleteContact(clientId, req.params.id);
  res.json({ success: ok });
});

app.post('/api/client/contacts/bulk-delete', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'Invalid ids array' });
  db.deleteContactsBulk(clientId, ids);
  res.json({ success: true, deleted_count: ids.length });
});

// Contact Groups CRUD
app.get('/api/client/groups', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const groups = db.getGroups(clientId);
  res.json({ success: true, groups });
});

app.post('/api/client/groups', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const group = ContactService.createGroup(clientId, req.body.name, req.body.description);
  res.json({ success: true, group });
});

app.put('/api/client/groups/:id', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const updated = db.updateGroup(clientId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, group: updated });
});

app.delete('/api/client/groups/:id', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const ok = db.deleteGroup(clientId, req.params.id);
  res.json({ success: ok });
});

// Contact Import (CSV/XLSX text or parsed array)
app.post('/api/client/contacts/validate-import', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const {
    rawText,
    fileType = 'csv',
    rows: directRows,
    defaultGroupId,
    defaultCountryCode,
    updateExisting,
    columnMappings
  } = req.body;

  let rows: any[] = [];
  if (directRows && Array.isArray(directRows)) {
    rows = directRows;
  } else if (rawText) {
    try {
      rows = ImportService.parseFile(rawText, fileType);
    } catch (e: any) {
      return res.status(400).json({ success: false, error: `File parsing error: ${e.message}` });
    }
  } else {
    return res.status(400).json({ success: false, error: 'No file content or rows provided' });
  }

  const result = ImportService.validateContactImport(clientId, rows, {
    defaultGroupId,
    defaultCountryCode,
    updateExisting,
    columnMappings
  });
  res.json({ success: true, validation: result });
});

app.post('/api/client/contacts/confirm-import', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { validRows, defaultGroupId, createMissingGroups = true, updateExisting = false } = req.body;

  if (!Array.isArray(validRows) || validRows.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid records to import' });
  }

  const result = ImportService.commitContactImport(clientId, validRows, {
    defaultGroupId,
    createMissingGroups,
    updateExisting
  });

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: clientId,
    action: 'CONTACTS_IMPORTED',
    details: `Imported ${result.importedCount} contacts (Updated: ${result.updatedCount})`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    imported_count: result.importedCount,
    updated_count: result.updatedCount
  });
});

// Templates
app.get('/api/client/templates', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const templates = db.getTemplates(clientId);
  res.json({ success: true, templates });
});

// Fetch & Sync Real Templates from Meta Graph API
app.post('/api/client/templates/sync-meta', authenticateSession, async (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { wabaId, metaAccessToken, appSecret } = req.body || {};

  const result = await WhatsAppCloudApiService.fetchRealMetaTemplates({
    clientId,
    wabaId,
    metaAccessToken,
    appSecret
  });

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({
    success: true,
    count: result.count,
    templates: result.templates
  });
});

// Client WhatsApp Account Configuration (Get & Update credentials)
app.get('/api/client/whatsapp-config', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const wa = db.getWhatsAppAccount(clientId);
  const tp = db.getTechProviderConfig();
  res.json({
    success: true,
    whatsapp: wa,
    tech_provider: {
      is_configured: tp.is_configured,
      app_name: tp.app_name,
      app_id: tp.app_id,
      webhook_verify_token: tp.webhook_verify_token,
      has_global_secret: !!(tp.app_secret && tp.app_secret.trim())
    }
  });
});

// Tech Provider Platform Configuration (Super Admin only)
app.get('/api/admin/tech-provider-config', authenticateSession, requireSuperAdmin, (req, res) => {
  const config = db.getTechProviderConfig();
  res.json({ success: true, config });
});

app.put('/api/admin/tech-provider-config', authenticateSession, requireSuperAdmin, (req, res) => {
  const { app_id, app_secret, app_name, webhook_verify_token, system_user_access_token } = req.body;
  const updated = db.updateTechProviderConfig({
    app_id: app_id !== undefined ? String(app_id).trim() : undefined,
    app_secret: app_secret !== undefined ? String(app_secret).trim() : undefined,
    app_name: app_name !== undefined ? String(app_name).trim() : undefined,
    webhook_verify_token: webhook_verify_token !== undefined ? String(webhook_verify_token).trim() : undefined,
    system_user_access_token: system_user_access_token !== undefined ? String(system_user_access_token).trim() : undefined
  });
  res.json({ success: true, config: updated, message: 'Tech Provider Global Configuration updated successfully.' });
});

app.put('/api/client/whatsapp-config', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const existing = db.getWhatsAppAccount(clientId);

  const updatedAccount = db.upsertWhatsAppAccount({
    id: existing?.id || `WA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    client_id: clientId,
    phone_number: req.body.phone_number !== undefined ? req.body.phone_number : existing?.phone_number || '',
    display_name: req.body.display_name !== undefined ? req.body.display_name : existing?.display_name || '',
    phone_number_id: req.body.phone_number_id !== undefined ? req.body.phone_number_id : existing?.phone_number_id || '',
    waba_id: req.body.waba_id !== undefined ? req.body.waba_id : existing?.waba_id || '',
    business_id: req.body.business_id !== undefined ? req.body.business_id : existing?.business_id || '',
    meta_access_token: req.body.meta_access_token !== undefined ? req.body.meta_access_token : existing?.meta_access_token || '',
    app_secret: req.body.app_secret !== undefined ? req.body.app_secret : existing?.app_secret || '',
    webhook_verify_token: req.body.webhook_verify_token || existing?.webhook_verify_token || `meta_verify_${clientId.toLowerCase()}`,
    quality_rating: req.body.quality_rating || existing?.quality_rating || 'GREEN',
    status: req.body.status || existing?.status || 'CONNECTED',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  res.json({ success: true, whatsapp: updatedAccount });
});

// Test & Verify WhatsApp Cloud API Connection live against Meta Graph API
app.post('/api/client/whatsapp-config/test', authenticateSession, async (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const existing = db.getWhatsAppAccount(clientId);

  const token = (req.body.meta_access_token !== undefined ? req.body.meta_access_token : existing?.meta_access_token || '').trim();
  const phoneId = (req.body.phone_number_id !== undefined ? req.body.phone_number_id : existing?.phone_number_id || '').trim();
  const wabaId = (req.body.waba_id !== undefined ? req.body.waba_id : existing?.waba_id || '').trim();
  const secret = (
    req.body.app_secret !== undefined && req.body.app_secret.trim()
      ? req.body.app_secret.trim()
      : db.getEffectiveAppSecret(clientId)
  );

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Permanent Meta Access Token is required to test WhatsApp Cloud API connection.'
    });
  }
  if (!phoneId) {
    return res.status(400).json({
      success: false,
      error: 'Meta Phone Number ID is required to test WhatsApp Cloud API connection.'
    });
  }

  try {
    // 1. Verify Phone Number details from Meta Graph API
    const phoneUrl = WhatsAppCloudApiService.buildGraphUrl(
      phoneId,
      token,
      secret,
      { fields: 'display_phone_number,verified_name,code_verification_status,quality_rating,platform_type' }
    );

    const phoneRes = await fetch(phoneUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok) {
      console.warn('Meta WhatsApp test phone check error:', phoneData);
      const metaMsg = phoneData.error?.message || `Meta API Error ${phoneRes.status}: ${phoneRes.statusText}`;

      if (phoneData.error?.message?.toLowerCase().includes('appsecret_proof') || phoneData.error?.code === 100) {
        return res.status(400).json({
          success: false,
          errorCode: 100,
          error:
            'Meta Graph API Error (Code: 100): "API calls from the server require an appsecret_proof argument". Your Meta App has App Secret Proof enabled. Please enter your Meta App Secret so the server can compute the cryptographic proof.'
        });
      }
      if (phoneData.error?.code === 190) {
        return res.status(400).json({
          success: false,
          errorCode: 190,
          error: 'Meta OAuth Token Error (Code: 190): The access token is invalid, expired, or does not have permissions for this WhatsApp Business Account.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Meta Graph API Error: ${metaMsg} (Code: ${phoneData.error?.code || phoneRes.status})`
      });
    }

    // 2. Query WABA details if WABA ID is provided
    let wabaData: any = null;
    if (wabaId) {
      try {
        const wabaUrl = WhatsAppCloudApiService.buildGraphUrl(
          wabaId,
          token,
          secret,
          { fields: 'id,name,timezone_id,message_template_namespace' }
        );
        const wabaRes = await fetch(wabaUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        wabaData = await wabaRes.json();
      } catch (e: any) {
        console.warn('WABA check warning:', e.message);
      }
    }

    // Update account with verified real data in server web database (never localStorage)
    const updatedAccount = db.upsertWhatsAppAccount({
      id: existing?.id || `WA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      client_id: clientId,
      phone_number: phoneData.display_phone_number || existing?.phone_number || '',
      display_name: phoneData.verified_name || existing?.display_name || 'My WhatsApp Business',
      phone_number_id: phoneId,
      waba_id: wabaId || existing?.waba_id || '',
      business_id: wabaId || existing?.business_id || '',
      meta_access_token: token,
      app_secret: secret,
      webhook_verify_token: req.body.webhook_verify_token || existing?.webhook_verify_token || 'JGMW4cEwjlkLRfQZS4CP8h9yCWjWNC1s4dOxps9q03a9ca82',
      quality_rating: phoneData.quality_rating || existing?.quality_rating || 'GREEN',
      status: 'CONNECTED',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Success! You are now connected to Whatsapp Cloud',
      phone: phoneData,
      waba: wabaData,
      whatsapp: updatedAccount
    });
  } catch (err: any) {
    console.error('Exception verifying WhatsApp Cloud API:', err);
    res.status(500).json({
      success: false,
      error: `Network error connecting to Meta Graph API: ${err.message}`
    });
  }
});

// Remove all dummy data endpoint
app.post('/api/client/clear-dummy-data', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  db.clearDummyData(clientId);
  res.json({ success: true, message: 'All dummy contacts, campaigns, and chat data cleared.' });
});

// -------------------------------------------------------------
// GOOGLE CLOUD FIRESTORE STORAGE ENDPOINTS (Free Tier)
// -------------------------------------------------------------
app.get('/api/client/cloud-storage/status', authenticateSession, (req, res) => {
  const status = cloudFirestore.getStatus(db.getRawData());
  res.json({ success: true, cloudStorage: status });
});

app.post('/api/client/cloud-storage/sync', authenticateSession, async (req, res) => {
  const result = await cloudFirestore.syncAllRecords(db.getRawData());
  res.json({
    success: result.success,
    synced: result.synced,
    error: result.error,
    cloudStorage: cloudFirestore.getStatus(db.getRawData())
  });
});

// -------------------------------------------------------------
// CLIENT LIVE CHAT / INBOX ENDPOINTS
// -------------------------------------------------------------
// Get active conversations list
app.get('/api/client/chat/conversations', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const conversations = db.getChatConversations(clientId);
  res.json({ success: true, conversations });
});

// Get message history for a specific customer phone
app.get('/api/client/chat/messages/:phone', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const phone = req.params.phone;
  const messages = db.getChatMessages(clientId, phone);

  // Mark inbound messages as read
  db.markChatMessagesAsRead(clientId, phone);

  res.json({ success: true, messages });
});

// Send message to customer (Normal text or Template message)
app.post('/api/client/chat/send', authenticateSession, async (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { to, type = 'text', text, templateId, variables } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, error: 'Recipient phone number is required.' });
  }

  if (type === 'template') {
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'templateId is required for template chat messages.' });
    }
    const result = await WhatsAppCloudApiService.sendTemplateChatMessage({
      clientId,
      to,
      templateId,
      variables: variables || {}
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, message: result.message });
  } else {
    // Normal text message
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text is required.' });
    }
    const result = await WhatsAppCloudApiService.sendTextMessage({
      clientId,
      to,
      text: text.trim()
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, message: result.message });
    }

    return res.json({ success: true, message: result.message });
  }
});

// Simulate receiving an inbound reply from customer
app.post('/api/client/chat/simulate-inbound', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { phone, text, name } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ success: false, error: 'Phone and text are required.' });
  }

  const cleanPhone = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
  const existing = db.findContactByPhone(clientId, cleanPhone);

  const inboundMessage = db.addChatMessage({
    id: `wamid.inc_${crypto.randomBytes(8).toString('hex')}`,
    client_id: clientId,
    contact_id: existing?.id || null,
    customer_phone: cleanPhone,
    customer_name: existing?.name || name || `Customer (${cleanPhone.slice(-4)})`,
    sender: 'customer',
    message_type: 'text',
    text: text.trim(),
    status: 'Read',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, message: inboundMessage });
});

// Campaigns
app.get('/api/client/campaigns', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const campaigns = db.getCampaigns(clientId);
  res.json({ success: true, campaigns });
});

app.get('/api/client/campaigns/:id', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const campaign = db.getCampaignById(clientId, req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  res.json({ success: true, campaign });
});

app.post('/api/client/campaigns', authenticateSession, async (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const result = await CampaignService.createCampaign({
    clientId,
    ...req.body
  });

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: clientId,
    action: 'CAMPAIGN_CREATED',
    details: `Created campaign ${result.campaign.name} (${result.campaign.id}) with ${result.campaign.total_recipients} recipients`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, campaign: result.campaign });
});

app.post('/api/client/campaigns/:id/pause', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const ok = CampaignService.pauseCampaign(clientId, req.params.id);
  res.json({ success: ok });
});

app.post('/api/client/campaigns/:id/resume', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const ok = CampaignService.resumeCampaign(clientId, req.params.id);
  res.json({ success: ok });
});

app.post('/api/client/campaigns/:id/cancel', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const ok = CampaignService.cancelCampaign(clientId, req.params.id);
  res.json({ success: ok });
});

// Campaign Records & Reports
app.get('/api/client/campaign-records', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { campaignId, status, phone, search, limit, offset } = req.query;

  const result = db.getCampaignMessages(clientId, {
    campaignId: campaignId as string,
    status: status as string,
    phone: phone as string,
    search: search as string,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0
  });

  res.json({ success: true, ...result });
});

app.get('/api/client/campaign-records/export', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const { campaignId, status, format = 'csv' } = req.query;

  const data = CampaignService.generateExportData(clientId, campaignId as string, status as string);

  if (format === 'xlsx') {
    const buffer = CampaignService.exportToXlsx(data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="campaign_records.xlsx"');
    return res.send(buffer);
  }

  const csv = CampaignService.exportToCsv(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="campaign_records.csv"');
  res.send(csv);
});

// Credits & Ledger
app.get('/api/client/credits', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const balances = CreditService.getBalances(clientId);
  const transactions = db.getCreditTransactions(clientId);
  res.json({ success: true, balances, transactions });
});

// API Token Management
app.get('/api/client/api-token', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const client = db.getClientById(clientId);
  if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

  res.json({
    success: true,
    client_id: client.id,
    api_token: client.api_token,
    api_status: client.api_status,
    created_at: client.api_token_created_at
  });
});

app.post('/api/client/api-token/regenerate', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const newToken = `waba_live_${crypto.randomBytes(24).toString('hex')}`;

  db.updateClient(clientId, {
    api_token: newToken,
    api_token_created_at: new Date().toISOString()
  });

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: clientId,
    action: 'API_TOKEN_REGENERATED',
    details: 'Client regenerated API access token',
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    api_token: newToken
  });
});

app.get('/api/client/api-logs', authenticateSession, (req, res) => {
  const clientId = req.clientAccount?.id || req.currentUser?.client_id!;
  const logs = db.getApiLogs(clientId);
  res.json({ success: true, logs });
});

// -------------------------------------------------------------
// 3. SUPER ADMIN ROUTES (/api/admin/...)
// -------------------------------------------------------------
app.get('/api/admin/dashboard', authenticateSession, requireSuperAdmin, (req, res) => {
  const clients = db.getClients();
  const raw = db.getRawData();

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const suspendedClients = clients.filter(c => c.status === 'suspended').length;
  const totalCampaigns = raw.campaigns.length;

  const totalSent = raw.campaign_messages.filter(m => m.status === 'Sent' || m.status === 'Delivered' || m.status === 'Read').length;
  const totalDelivered = raw.campaign_messages.filter(m => m.status === 'Delivered' || m.status === 'Read').length;
  const totalRead = raw.campaign_messages.filter(m => m.status === 'Read').length;
  const totalFailed = raw.campaign_messages.filter(m => m.status === 'Failed').length;

  const marketingCreditsUsed = clients.reduce((acc, c) => acc + (c.marketing_credits_used || 0), 0);
  const utilityCreditsUsed = clients.reduce((acc, c) => acc + (c.utility_credits_used || 0), 0);
  const totalApiRequests = raw.api_logs.length;

  res.json({
    success: true,
    stats: {
      total_clients: totalClients,
      active_clients: activeClients,
      suspended_clients: suspendedClients,
      total_campaigns: totalCampaigns,
      messages_sent: totalSent,
      messages_delivered: totalDelivered,
      messages_read: totalRead,
      messages_failed: totalFailed,
      marketing_credits_used: marketingCreditsUsed,
      utility_credits_used: utilityCreditsUsed,
      api_requests: totalApiRequests
    },
    clients,
    plans: db.getPlans()
  });
});

// Manage clients
app.post('/api/admin/clients', authenticateSession, requireSuperAdmin, (req, res) => {
  const { company_name, email, phone, plan_id, initial_marketing_credits, initial_utility_credits } = req.body;

  const nextNum = db.getClients().length + 1;
  const clientId = `CLT-${String(nextNum).padStart(5, '0')}`;
  const plan = db.getPlans().find(p => p.id === plan_id) || db.getPlans()[0];

  const mCredits = initial_marketing_credits !== undefined ? Number(initial_marketing_credits) : plan.initial_marketing_credits;
  const uCredits = initial_utility_credits !== undefined ? Number(initial_utility_credits) : plan.initial_utility_credits;

  const client: Client = {
    id: clientId,
    company_name,
    email,
    phone,
    plan_id: plan.id,
    status: 'active',
    marketing_credits: mCredits,
    marketing_credits_used: 0,
    utility_credits: uCredits,
    utility_credits_used: 0,
    campaign_message_limit: plan.message_limit,
    campaign_messages_sent: 0,
    api_token: `waba_live_${crypto.randomBytes(20).toString('hex')}`,
    api_token_created_at: new Date().toISOString(),
    api_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insertClient(client);

  // Create default WhatsApp account record
  db.upsertWhatsAppAccount({
    id: `WA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    client_id: clientId,
    phone_number: phone,
    display_name: company_name,
    phone_number_id: `10${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    waba_id: `20${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    business_id: `30${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    meta_access_token: `EAAGsampleToken${clientId}`,
    webhook_verify_token: `meta_verify_${clientId.toLowerCase()}`,
    quality_rating: 'GREEN',
    status: 'SANDBOX',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Create client admin user
  const clientUser: User = {
    id: `USR-${clientId}-ADMIN`,
    client_id: clientId,
    name: `${company_name} Admin`,
    email,
    password_hash: 'client123',
    role: 'client_admin',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.getRawData().users.push(clientUser);

  // Credit ledger transactions
  CreditService.addCredits(clientId, 'marketing', mCredits, `Initial plan quota allocation: ${plan.name}`);
  CreditService.addCredits(clientId, 'utility', uCredits, `Initial plan quota allocation: ${plan.name}`);

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: clientId,
    action: 'CLIENT_CREATED',
    details: `Created new client ${company_name} (${clientId})`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, client });
});

app.put('/api/admin/clients/:id', authenticateSession, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const updated = db.updateClient(id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Client not found' });
  res.json({ success: true, client: updated });
});

// Adjust credits
app.post('/api/admin/clients/:id/adjust-credits', authenticateSession, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { credit_type, amount, description } = req.body;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ success: false, error: 'Invalid adjustment amount' });
  }

  const txn = CreditService.addCredits(
    id,
    credit_type,
    numAmount,
    description || `Manual credit adjustment by Super Admin (${numAmount > 0 ? '+' : ''}${numAmount})`,
    'Credit Adjustment'
  );

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: id,
    action: 'CREDIT_ADJUSTMENT',
    details: `Adjusted ${credit_type} credits by ${numAmount} for client ${id}`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, transaction: txn, client: db.getClientById(id) });
});

// WhatsApp Account Configuration for Client
app.get('/api/admin/clients/:id/whatsapp', authenticateSession, requireSuperAdmin, (req, res) => {
  const wa = db.getWhatsAppAccount(req.params.id);
  res.json({ success: true, whatsapp: wa });
});

app.put('/api/admin/clients/:id/whatsapp', authenticateSession, requireSuperAdmin, (req, res) => {
  const clientId = req.params.id;
  const existing = db.getWhatsAppAccount(clientId);

  const updatedAccount = db.upsertWhatsAppAccount({
    id: existing?.id || `WA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    client_id: clientId,
    phone_number: req.body.phone_number,
    display_name: req.body.display_name,
    phone_number_id: req.body.phone_number_id,
    waba_id: req.body.waba_id,
    business_id: req.body.business_id,
    meta_access_token: req.body.meta_access_token,
    webhook_verify_token: req.body.webhook_verify_token || `meta_verify_${clientId.toLowerCase()}`,
    quality_rating: req.body.quality_rating || 'GREEN',
    status: req.body.status || 'CONNECTED',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  db.addAuditLog({
    id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user_id: req.currentUser!.id,
    user_name: req.currentUser!.name,
    client_id: clientId,
    action: 'WHATSAPP_CONFIG_UPDATED',
    details: `Updated WhatsApp credentials (Phone ID: ${req.body.phone_number_id})`,
    ip: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, whatsapp: updatedAccount });
});

// Admin Global Logs
app.get('/api/admin/logs', authenticateSession, requireSuperAdmin, (req, res) => {
  res.json({
    success: true,
    api_logs: db.getApiLogs(),
    webhook_logs: db.getWebhookLogs(),
    audit_logs: db.getAuditLogs(),
    impersonation_logs: db.getRawData().admin_impersonation_logs
  });
});

// -------------------------------------------------------------
// 4. OFFICIAL CLIENT REST API (v1) - Bearer Token Auth
// -------------------------------------------------------------

// POST /api/v1/messages/send (Send individual template message)
app.post('/api/v1/messages/send', authenticateClientApiToken, async (req, res) => {
  const client = req.clientAccount!;
  const { phone, template, language = 'en', variables = [] } = req.body;

  if (!phone || !template) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'Both "phone" and "template" parameters are required.'
      }
    });
  }

  const tpl = db.getTemplateById(template);
  if (!tpl) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'INVALID_TEMPLATE',
        message: `Template "${template}" does not exist or has not been approved by Meta.`
      }
    });
  }

  const creditType = tpl.category === 'UTILITY' ? 'utility' : 'marketing';

  // Check and deduct credits
  const creditCheck = CreditService.checkCredits(client.id, creditType, 1);
  if (!creditCheck.ok) {
    return res.status(402).json({
      success: false,
      error: {
        code: creditType === 'marketing' ? 'INSUFFICIENT_MARKETING_CREDITS' : 'INSUFFICIENT_UTILITY_CREDITS',
        message: `Insufficient ${creditType} credits to send message.`
      }
    });
  }

  try {
    CreditService.deductCredits(client.id, creditType, 1, `API individual send: ${template} to ${phone}`);

    const sendRes = await WhatsAppCloudApiService.sendTemplateMessage({
      clientId: client.id,
      to: phone,
      templateName: tpl.name,
      languageCode: language,
      bodyVariables: Array.isArray(variables) ? variables : Object.values(variables)
    });

    // Record message in db
    const normPhone = ContactService.normalizePhone(phone);
    const varMap: Record<string, string> = {};
    if (Array.isArray(variables)) {
      variables.forEach((v, idx) => { varMap[String(idx + 1)] = String(v); });
    } else {
      Object.assign(varMap, variables);
    }

    const rendered = CampaignService.renderTemplateBody(tpl, varMap);

    const msg = db.insertCampaignMessage({
      id: `MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_id: client.id,
      campaign_id: 'API-DIRECT',
      recipient_name: variables[0] || 'Recipient',
      phone: normPhone,
      template_name: tpl.name,
      credit_type: creditType,
      rendered_body: rendered,
      message_id: sendRes.messageId,
      status: 'Sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Progression simulation
    setTimeout(() => {
      db.updateCampaignMessageStatus(sendRes.messageId, 'Delivered');
    }, 600);
    setTimeout(() => {
      db.updateCampaignMessageStatus(sendRes.messageId, 'Read');
    }, 2000);

    return res.json({
      success: true,
      message_id: sendRes.messageId,
      status: 'accepted'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'META_API_ERROR',
        message: err.message || 'WhatsApp Cloud API communication failed'
      }
    });
  }
});

// POST /api/v1/campaigns (Create API bulk campaign)
app.post('/api/v1/campaigns', authenticateClientApiToken, async (req, res) => {
  const client = req.clientAccount!;
  const { campaign_name, template, language = 'en', recipients } = req.body;

  if (!campaign_name || !template || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Required: "campaign_name", "template", and non-empty "recipients" array.'
      }
    });
  }

  const tpl = db.getTemplateById(template);
  if (!tpl) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'INVALID_TEMPLATE',
        message: `Template "${template}" does not exist or is not approved.`
      }
    });
  }

  const formattedRecipients = recipients.map((r: any) => ({
    phone: r.phone,
    name: r.name || (Array.isArray(r.variables) ? r.variables[0] : 'Recipient'),
    variables: r.variables || []
  }));

  const result = await CampaignService.createCampaign({
    clientId: client.id,
    name: campaign_name,
    type: 'api',
    templateId: tpl.id,
    language,
    recipients: formattedRecipients
  });

  if (result.error) {
    return res.status(400).json({
      success: false,
      error: {
        code: result.error.includes('Insufficient') ? 'INSUFFICIENT_CREDITS' : 'CAMPAIGN_ERROR',
        message: result.error
      }
    });
  }

  res.json({
    success: true,
    campaign_id: result.campaign.id,
    total: result.campaign.total_recipients,
    status: 'queued'
  });
});

// GET /api/v1/campaigns/:campaign_id (Campaign status & metrics)
app.get('/api/v1/campaigns/:campaign_id', authenticateClientApiToken, (req, res) => {
  const client = req.clientAccount!;
  const camp = db.getCampaignById(client.id, req.params.campaign_id);

  if (!camp) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'CAMPAIGN_NOT_FOUND',
        message: `Campaign ${req.params.campaign_id} not found.`
      }
    });
  }

  res.json({
    success: true,
    campaign_id: camp.id,
    campaign_name: camp.name,
    status: camp.status.toLowerCase(),
    total: camp.total_recipients,
    sent: camp.sent_count,
    delivered: camp.delivered_count,
    read: camp.read_count,
    failed: camp.failed_count
  });
});

// GET /api/v1/campaigns/:campaign_id/records
app.get('/api/v1/campaigns/:campaign_id/records', authenticateClientApiToken, (req, res) => {
  const client = req.clientAccount!;
  const { limit, offset, status } = req.query;

  const result = db.getCampaignMessages(client.id, {
    campaignId: req.params.campaign_id,
    status: status as string,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0
  });

  res.json({
    success: true,
    total: result.total,
    records: result.messages.map(m => ({
      message_id: m.message_id,
      phone: m.phone,
      recipient_name: m.recipient_name,
      status: m.status,
      error: m.error_message || null,
      sent_at: m.sent_at,
      delivered_at: m.delivered_at,
      read_at: m.read_at
    }))
  });
});

// GET /api/v1/credits
app.get('/api/v1/credits', authenticateClientApiToken, (req, res) => {
  const client = req.clientAccount!;
  const balances = CreditService.getBalances(client.id);
  res.json({
    success: true,
    credits: balances
  });
});

// GET /api/v1/templates
app.get('/api/v1/templates', authenticateClientApiToken, (req, res) => {
  const client = req.clientAccount!;
  const templates = db.getTemplates(client.id);
  res.json({
    success: true,
    templates: templates.map(t => ({
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      header: t.header_content || null,
      body: t.body_text,
      footer: t.footer_text || null,
      variables: t.variables
    }))
  });
});

// -------------------------------------------------------------
// 5. META WHATSAPP WEBHOOK ENDPOINTS
// Supports /api/v1/webhook, /webhook/whatsapp, /webhook/wpbox/receive/:token
// -------------------------------------------------------------
const webhookRoutes = [
  '/api/v1/webhook',
  '/webhook/whatsapp',
  '/webhook/wpbox/receive',
  '/webhook/wpbox/receive/:token'
];

// Verification challenge for Meta Developer portal
app.get(webhookRoutes, (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = (req.query['hub.verify_token'] as string) || req.params.token;
  const challenge = req.query['hub.challenge'] as string;
  const pathToken = req.params.token;

  const verify = WhatsAppCloudApiService.verifyWebhook(mode, token, challenge, pathToken);
  if (verify.valid) {
    return res.status(200).send(verify.challenge);
  }
  return res.status(403).send('Forbidden');
});

// Incoming webhook status & message events from Meta
app.post(webhookRoutes, (req, res) => {
  const payload = req.body;
  const pathToken = req.params.token;
  const results = WhatsAppCloudApiService.processWebhookPayload(payload, pathToken);
  res.status(200).json({ success: true, processed: results.length });
});

// Webhook simulation endpoint for Admin testing
app.post('/api/admin/simulate-webhook-status', authenticateSession, requireSuperAdmin, (req, res) => {
  const { message_id, status } = req.body; // status: 'Delivered' | 'Read' | 'Failed'
  const updated = db.updateCampaignMessageStatus(message_id, status, {
    errorCode: status === 'Failed' ? '131026' : undefined,
    errorMessage: status === 'Failed' ? 'Message undeliverable to this phone number' : undefined
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Message ID not found' });
  }

  db.addWebhookLog({
    id: `WH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    client_id: updated.client_id,
    event_type: `simulator.status_${status.toLowerCase()}`,
    message_id,
    payload: { status, simulated: true },
    status: 'PROCESSED',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, message: updated });
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    // SPA fallback: transform and serve index.html for all non-API/non-webhook routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/webhook')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace?.(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/webhook')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Multi-Client Campaign Platform running on port ${PORT}`);
  });
}

startServer();
