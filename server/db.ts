import fs from 'fs';
import path from 'path';
import { cloudFirestore } from './services/firestore';

// Data types matching relational schema specifications
export interface User {
  id: string;
  client_id?: string | null; // null for Super Admin
  name: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'client_admin' | 'client_user';
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  message_limit: number;
  api_rate_limit_per_min: number;
  initial_marketing_credits: number;
  initial_utility_credits: number;
  features: string[];
}

export interface WhatsAppAccount {
  id: string;
  client_id: string;
  phone_number: string;
  display_name: string;
  phone_number_id: string;
  waba_id: string; // WhatsApp Business Account ID
  business_id: string;
  meta_access_token: string;
  app_secret?: string;
  webhook_verify_token: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  status: 'CONNECTED' | 'DISCONNECTED' | 'SANDBOX';
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string; // e.g. CLT-00001
  company_name: string;
  email: string;
  phone: string;
  plan_id: string;
  status: 'active' | 'suspended';
  marketing_credits: number;
  marketing_credits_used: number;
  utility_credits: number;
  utility_credits_used: number;
  campaign_message_limit: number;
  campaign_messages_sent: number;
  api_token: string;
  api_token_created_at: string;
  api_status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface ContactGroup {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  contact_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  group_id?: string | null;
  name: string;
  phone: string; // normalized E.164
  email?: string;
  metadata?: Record<string, string>;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  custom6?: string;
  custom7?: string;
  custom8?: string;
  custom9?: string;
  custom10?: string;
  variables?: Record<string, string>;
  status: 'active' | 'opt_out' | 'invalid';
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  client_id?: string | null; // null for system/shared, or client specific
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string; // e.g. 'en_US', 'hi'
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  header_type?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | null;
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone_number?: string }>;
  variables: string[]; // e.g. ["1", "2"] or ["name", "custom1"]
  created_at: string;
}

export interface Campaign {
  id: string; // e.g. CMP-10001
  client_id: string;
  name: string;
  type: 'group' | 'file' | 'individual' | 'api';
  template_id: string;
  template_name: string;
  language: string;
  credit_type: 'marketing' | 'utility';
  group_id?: string | null;
  group_name?: string | null;
  variable_mapping: Record<string, string>; // templateVar -> contactField (e.g. "1": "name", "2": "custom1")
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  status: 'Draft' | 'Scheduled' | 'Processing' | 'Running' | 'Completed' | 'Paused' | 'Cancelled' | 'Failed';
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMessage {
  id: string;
  client_id: string;
  campaign_id: string;
  contact_id?: string | null;
  recipient_name: string;
  phone: string;
  template_name: string;
  credit_type: 'marketing' | 'utility';
  rendered_body: string;
  template_variables?: Record<string, string>;
  variable_values?: string[];
  message_id?: string | null; // Meta WAMID (e.g. wamid.HBg...)
  status: 'Queued' | 'Processing' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  error_code?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  client_id: string;
  credit_type: 'marketing' | 'utility';
  transaction_type: 'Credit Added' | 'Credit Used' | 'Credit Adjustment' | 'Credit Refund' | 'Expired';
  amount: number; // positive or negative
  balance_before: number;
  balance_after: number;
  description: string;
  campaign_id?: string | null;
  created_at: string;
}

export interface ApiLog {
  id: string;
  client_id: string;
  endpoint: string;
  method: string;
  request_id: string;
  status_code: number;
  ip: string;
  execution_time_ms: number;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  client_id?: string | null;
  event_type: string;
  message_id?: string | null;
  payload: any;
  status: 'PROCESSED' | 'FAILED' | 'IGNORED';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  client_id?: string | null;
  action: string;
  details: string;
  ip: string;
  created_at: string;
}

export interface AdminImpersonationLog {
  id: string;
  admin_id: string;
  admin_email: string;
  client_id: string;
  client_company: string;
  login_time: string;
  logout_time?: string | null;
  ip: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  contact_id?: string | null;
  customer_phone: string;
  customer_name?: string;
  sender: 'business' | 'customer';
  message_type: 'text' | 'template';
  text: string;
  template_name?: string;
  template_category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  template_variables?: Record<string, string>;
  status: 'Sent' | 'Delivered' | 'Read' | 'Failed';
  error_message?: string;
  created_at: string;
}

export interface ChatConversation {
  phone: string;
  contact_name: string;
  contact_id?: string | null;
  group_name?: string | null;
  last_message: string;
  last_message_time: string;
  last_message_sender: 'business' | 'customer';
  last_message_status?: string;
  unread_count: number;
  is_window_active: boolean;
  window_expires_at?: string;
}

export interface TechProviderConfig {
  app_id: string;
  app_secret: string;
  app_name: string;
  webhook_verify_token: string;
  system_user_access_token?: string;
  is_configured: boolean;
  updated_at: string;
}

export interface DatabaseSchema {
  users: User[];
  plans: Plan[];
  clients: Client[];
  whatsapp_accounts: WhatsAppAccount[];
  contact_groups: ContactGroup[];
  contacts: Contact[];
  templates: WhatsAppTemplate[];
  campaigns: Campaign[];
  campaign_messages: CampaignMessage[];
  chat_messages: ChatMessage[];
  credit_transactions: CreditTransaction[];
  api_logs: ApiLog[];
  webhook_logs: WebhookLog[];
  audit_logs: AuditLog[];
  admin_impersonation_logs: AdminImpersonationLog[];
  tech_provider?: TechProviderConfig;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseEngine {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.chat_messages) parsed.chat_messages = [];
        if (!parsed.tech_provider) {
          parsed.tech_provider = {
            app_id: '1052719167920294',
            app_secret: '6912a015ebb9131b92b23094e09825d1',
            app_name: 'Official WhatsApp Tech Provider',
            webhook_verify_token: 'meta_verify_token_secure_2026',
            is_configured: true,
            updated_at: new Date().toISOString()
          };
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse database file, initializing seeds...', e);
      }
    }

    const initial = this.getSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  private persist() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error saving database:', err);
      } finally {
        this.saveTimeout = null;
      }
    }, 50);
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public flush() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Seed data with default Super Admin, sample plans, sample clients, contacts, templates
  private getSeedData(): DatabaseSchema {
    const plans: Plan[] = [
      {
        id: 'plan_starter',
        name: 'Starter Plan',
        monthly_price: 49,
        message_limit: 10000,
        api_rate_limit_per_min: 60,
        initial_marketing_credits: 5000,
        initial_utility_credits: 5000,
        features: ['1 WhatsApp Account', 'CSV Contact Upload', 'Group Campaigns', 'Basic Reports']
      },
      {
        id: 'plan_growth',
        name: 'Growth Plan',
        monthly_price: 149,
        message_limit: 50000,
        api_rate_limit_per_min: 180,
        initial_marketing_credits: 30000,
        initial_utility_credits: 20000,
        features: ['Official Cloud API', 'Developer REST API', 'File Campaigns', 'Priority Webhooks', 'Advanced Analytics']
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Scale',
        monthly_price: 399,
        message_limit: 250000,
        api_rate_limit_per_min: 600,
        initial_marketing_credits: 150000,
        initial_utility_credits: 100000,
        features: ['Dedicated Throughput', 'Unlimited Contacts', '24/7 SLA', 'Custom Webhooks', 'Audit Compliance']
      }
    ];

    const clients: Client[] = [
      {
        id: 'CLT-00001',
        company_name: 'My WhatsApp Business',
        email: 'user@mybusiness.com',
        phone: '+15550000000',
        plan_id: 'plan_enterprise',
        status: 'active',
        marketing_credits: 100000,
        marketing_credits_used: 0,
        utility_credits: 100000,
        utility_credits_used: 0,
        campaign_message_limit: 500000,
        campaign_messages_sent: 0,
        api_token: 'waba_live_livebusinesskey2026',
        api_token_created_at: new Date().toISOString(),
        api_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const users: User[] = [
      {
        id: 'USR-SUPERADMIN',
        client_id: null,
        name: 'Master Platform Admin',
        email: 'admin@whatsappplatform.io',
        password_hash: 'admin123',
        role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'USR-CLT1-ADMIN',
        client_id: 'CLT-00001',
        name: 'Business Owner',
        email: 'user@mybusiness.com',
        password_hash: 'client123',
        role: 'client_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const whatsapp_accounts: WhatsAppAccount[] = [
      {
        id: 'WA-00001',
        client_id: 'CLT-00001',
        phone_number: '',
        display_name: 'My WhatsApp Business',
        phone_number_id: '',
        waba_id: '',
        business_id: '',
        meta_access_token: '',
        app_secret: '',
        webhook_verify_token: 'meta_verify_token_secure_2026',
        quality_rating: 'UNKNOWN',
        status: 'DISCONNECTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const contact_groups: ContactGroup[] = [];
    const contacts: Contact[] = [];
    const templates: WhatsAppTemplate[] = [];
    const campaigns: Campaign[] = [];
    const campaign_messages: CampaignMessage[] = [];
    const chat_messages: ChatMessage[] = [];
    const credit_transactions: CreditTransaction[] = [
      {
        id: 'TXN-001',
        client_id: 'CLT-00001',
        credit_type: 'marketing',
        transaction_type: 'Credit Added',
        amount: 100000,
        balance_before: 0,
        balance_after: 100000,
        description: 'Account activation credit grant: 100,000 Marketing Credits',
        created_at: new Date().toISOString()
      },
      {
        id: 'TXN-002',
        client_id: 'CLT-00001',
        credit_type: 'utility',
        transaction_type: 'Credit Added',
        amount: 100000,
        balance_before: 0,
        balance_after: 100000,
        description: 'Account activation credit grant: 100,000 Utility Credits',
        created_at: new Date().toISOString()
      }
    ];
    const api_logs: ApiLog[] = [];
    const webhook_logs: WebhookLog[] = [];
    const audit_logs: AuditLog[] = [];

    return {
      users,
      plans,
      clients,
      whatsapp_accounts,
      contact_groups,
      contacts,
      templates,
      campaigns,
      campaign_messages,
      chat_messages,
      credit_transactions,
      api_logs,
      webhook_logs,
      audit_logs,
      admin_impersonation_logs: [],
      tech_provider: {
        app_id: '1052719167920294',
        app_secret: '6912a015ebb9131b92b23094e09825d1',
        app_name: 'Official WhatsApp Tech Provider',
        webhook_verify_token: 'meta_verify_token_secure_2026',
        is_configured: true,
        updated_at: new Date().toISOString()
      }
    };
  }

  // Multi-tenant scoped query helpers
  // Contact queries
  public getContacts(clientId: string, filter?: { groupId?: string; search?: string; status?: string; limit?: number; offset?: number }) {
    let list = this.data.contacts.filter(c => c.client_id === clientId);
    if (filter?.groupId) {
      list = list.filter(c => c.group_id === filter.groupId);
    }
    if (filter?.status) {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.custom1 && c.custom1.toLowerCase().includes(q)) ||
        (c.custom2 && c.custom2.toLowerCase().includes(q)) ||
        (c.custom3 && c.custom3.toLowerCase().includes(q)) ||
        (c.custom4 && c.custom4.toLowerCase().includes(q)) ||
        (c.custom5 && c.custom5.toLowerCase().includes(q)) ||
        (c.metadata && Object.entries(c.metadata).some(([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)))
      );
    }
    const total = list.length;
    if (filter?.offset !== undefined || filter?.limit !== undefined) {
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      list = list.slice(offset, offset + limit);
    }
    return { total, contacts: list };
  }

  public getContactById(clientId: string, id: string) {
    return this.data.contacts.find(c => c.client_id === clientId && c.id === id);
  }

  public findContactByPhone(clientId: string, phone: string) {
    const cleanDigits = phone.replace(/\D/g, '');
    return this.data.contacts.find(c => c.client_id === clientId && c.phone.replace(/\D/g, '') === cleanDigits);
  }

  public insertContact(contact: Contact) {
    this.data.contacts.unshift(contact);
    this.persist();
    cloudFirestore.saveDocument('contacts', contact.id, contact).catch(() => {});
    return contact;
  }

  public updateContact(clientId: string, id: string, patch: Partial<Contact>) {
    const idx = this.data.contacts.findIndex(c => c.client_id === clientId && c.id === id);
    if (idx === -1) return null;
    this.data.contacts[idx] = { ...this.data.contacts[idx], ...patch, updated_at: new Date().toISOString() };
    this.persist();
    cloudFirestore.saveDocument('contacts', id, this.data.contacts[idx]).catch(() => {});
    return this.data.contacts[idx];
  }

  public deleteContact(clientId: string, id: string) {
    const idx = this.data.contacts.findIndex(c => c.client_id === clientId && c.id === id);
    if (idx === -1) return false;
    this.data.contacts.splice(idx, 1);
    this.persist();
    return true;
  }

  public deleteContactsBulk(clientId: string, ids: string[]) {
    const idSet = new Set(ids);
    this.data.contacts = this.data.contacts.filter(c => !(c.client_id === clientId && idSet.has(c.id)));
    this.persist();
    return true;
  }

  // Group queries
  public getGroups(clientId: string) {
    return this.data.contact_groups
      .filter(g => g.client_id === clientId)
      .map(g => ({
        ...g,
        contact_count: this.data.contacts.filter(c => c.client_id === clientId && c.group_id === g.id).length
      }));
  }

  public getGroupById(clientId: string, id: string) {
    return this.data.contact_groups.find(g => g.client_id === clientId && g.id === id);
  }

  public insertGroup(group: ContactGroup) {
    this.data.contact_groups.push(group);
    this.persist();
    return group;
  }

  public updateGroup(clientId: string, id: string, patch: Partial<ContactGroup>) {
    const idx = this.data.contact_groups.findIndex(g => g.client_id === clientId && g.id === id);
    if (idx === -1) return null;
    this.data.contact_groups[idx] = { ...this.data.contact_groups[idx], ...patch, updated_at: new Date().toISOString() };
    this.persist();
    return this.data.contact_groups[idx];
  }

  public deleteGroup(clientId: string, id: string) {
    const idx = this.data.contact_groups.findIndex(g => g.client_id === clientId && g.id === id);
    if (idx === -1) return false;
    this.data.contact_groups.splice(idx, 1);
    // Unassign contacts from this group
    this.data.contacts.forEach(c => {
      if (c.client_id === clientId && c.group_id === id) {
        c.group_id = null;
      }
    });
    this.persist();
    return true;
  }

  // Templates
  public getTemplates(clientId?: string) {
    return this.data.templates.filter(t => t.client_id === null || t.client_id === clientId);
  }

  public getTemplateById(id: string) {
    return this.data.templates.find(t => t.id === id || t.name === id);
  }

  public insertTemplate(template: WhatsAppTemplate) {
    this.data.templates.push(template);
    this.persist();
    return template;
  }

  // Campaigns
  public getCampaigns(clientId: string, filter?: { status?: string; search?: string }) {
    let list = this.data.campaigns.filter(c => c.client_id === clientId);
    if (filter?.status) {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getCampaignById(clientId: string, id: string) {
    return this.data.campaigns.find(c => c.client_id === clientId && c.id === id);
  }

  public insertCampaign(campaign: Campaign) {
    this.data.campaigns.unshift(campaign);
    this.persist();
    cloudFirestore.saveDocument('campaigns', campaign.id, campaign).catch(() => {});
    return campaign;
  }

  public updateCampaign(clientId: string, id: string, patch: Partial<Campaign>) {
    const idx = this.data.campaigns.findIndex(c => c.client_id === clientId && c.id === id);
    if (idx === -1) return null;
    this.data.campaigns[idx] = { ...this.data.campaigns[idx], ...patch, updated_at: new Date().toISOString() };
    this.persist();
    cloudFirestore.saveDocument('campaigns', id, this.data.campaigns[idx]).catch(() => {});
    return this.data.campaigns[idx];
  }

  // Campaign Messages
  public getCampaignMessages(
    clientId: string,
    filter?: {
      campaignId?: string;
      status?: string;
      phone?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let list = this.data.campaign_messages.filter(m => m.client_id === clientId);
    if (filter?.campaignId) {
      list = list.filter(m => m.campaign_id === filter.campaignId);
    }
    if (filter?.status) {
      list = list.filter(m => m.status === filter.status);
    }
    if (filter?.phone) {
      list = list.filter(m => m.phone.includes(filter.phone!));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(m =>
        m.phone.includes(q) ||
        m.recipient_name.toLowerCase().includes(q) ||
        (m.message_id && m.message_id.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    list = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filter?.offset !== undefined || filter?.limit !== undefined) {
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      list = list.slice(offset, offset + limit);
    }

    return { total, messages: list };
  }

  public insertCampaignMessage(msg: CampaignMessage) {
    this.data.campaign_messages.unshift(msg);
    this.persist();
    cloudFirestore.saveDocument('campaign_messages', msg.id, msg).catch(() => {});
    return msg;
  }

  public updateCampaignMessageStatus(
    messageId: string,
    status: CampaignMessage['status'],
    details?: { errorCode?: string; errorMessage?: string; timestamp?: string }
  ) {
    const msg = this.data.campaign_messages.find(m => m.message_id === messageId || m.id === messageId);
    if (!msg) return null;

    msg.status = status;
    const now = details?.timestamp || new Date().toISOString();

    if (status === 'Sent') msg.sent_at = now;
    if (status === 'Delivered') {
      if (!msg.sent_at) msg.sent_at = now;
      msg.delivered_at = now;
    }
    if (status === 'Read') {
      if (!msg.sent_at) msg.sent_at = now;
      if (!msg.delivered_at) msg.delivered_at = now;
      msg.read_at = now;
    }
    if (status === 'Failed') {
      msg.failed_at = now;
      msg.error_code = details?.errorCode || 'FAILED';
      msg.error_message = details?.errorMessage || 'Delivery failed';
    }

    // Update parent campaign counters
    const camp = this.data.campaigns.find(c => c.id === msg.campaign_id && c.client_id === msg.client_id);
    if (camp) {
      const msgs = this.data.campaign_messages.filter(m => m.campaign_id === camp.id);
      camp.sent_count = msgs.filter(m => m.status === 'Sent' || m.status === 'Delivered' || m.status === 'Read').length;
      camp.delivered_count = msgs.filter(m => m.status === 'Delivered' || m.status === 'Read').length;
      camp.read_count = msgs.filter(m => m.status === 'Read').length;
      camp.failed_count = msgs.filter(m => m.status === 'Failed').length;
      if (camp.sent_count + camp.failed_count >= camp.total_recipients && camp.status === 'Running') {
        camp.status = 'Completed';
        camp.completed_at = new Date().toISOString();
      }
      cloudFirestore.saveDocument('campaigns', camp.id, camp).catch(() => {});
    }

    this.persist();
    cloudFirestore.saveDocument('campaign_messages', msg.id, msg).catch(() => {});
    return msg;
  }

  // Clients
  public getClients() {
    return this.data.clients;
  }

  public getClientById(id: string) {
    return this.data.clients.find(c => c.id === id);
  }

  public getClientByToken(token: string) {
    if (!token) return null;
    return this.data.clients.find(c => c.api_token === token && c.api_status === 'active' && c.status === 'active');
  }

  public insertClient(client: Client) {
    this.data.clients.push(client);
    this.persist();
    return client;
  }

  public updateClient(id: string, patch: Partial<Client>) {
    const idx = this.data.clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.clients[idx] = { ...this.data.clients[idx], ...patch, updated_at: new Date().toISOString() };
    this.persist();
    return this.data.clients[idx];
  }

  // WhatsApp Accounts
  public getWhatsAppAccount(clientId: string) {
    return this.data.whatsapp_accounts.find(w => w.client_id === clientId);
  }

  public upsertWhatsAppAccount(account: WhatsAppAccount) {
    const idx = this.data.whatsapp_accounts.findIndex(w => w.client_id === account.client_id);
    if (idx >= 0) {
      this.data.whatsapp_accounts[idx] = { ...account, updated_at: new Date().toISOString() };
    } else {
      this.data.whatsapp_accounts.push(account);
    }
    this.persist();
    cloudFirestore.saveDocument('whatsapp_accounts', account.id, account).catch(() => {});
    return account;
  }

  // Tech Provider Configuration (Global Platform App Secret & Webhook)
  public getTechProviderConfig(): TechProviderConfig {
    if (!this.data.tech_provider) {
      this.data.tech_provider = {
        app_id: '1052719167920294',
        app_secret: '6912a015ebb9131b92b23094e09825d1',
        app_name: 'Official WhatsApp Tech Provider',
        webhook_verify_token: 'meta_verify_token_secure_2026',
        is_configured: true,
        updated_at: new Date().toISOString()
      };
      this.persist();
    }
    return this.data.tech_provider;
  }

  public updateTechProviderConfig(patch: Partial<TechProviderConfig>): TechProviderConfig {
    const current = this.getTechProviderConfig();
    this.data.tech_provider = {
      ...current,
      ...patch,
      is_configured: true,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.data.tech_provider;
  }

  public getEffectiveAppSecret(clientId?: string): string {
    if (clientId) {
      const wa = this.getWhatsAppAccount(clientId);
      if (wa?.app_secret && wa.app_secret.trim()) {
        return wa.app_secret.trim();
      }
    }
    return (this.data.tech_provider?.app_secret || process.env.META_APP_SECRET || '').trim();
  }

  // Credits & Ledger
  public addCreditTransaction(txn: CreditTransaction) {
    this.data.credit_transactions.unshift(txn);
    this.persist();
    cloudFirestore.saveDocument('credit_transactions', txn.id, txn).catch(() => {});
    return txn;
  }

  public getCreditTransactions(clientId: string) {
    return this.data.credit_transactions
      .filter(t => t.client_id === clientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Logs
  public addApiLog(log: ApiLog) {
    this.data.api_logs.unshift(log);
    if (this.data.api_logs.length > 500) this.data.api_logs.pop();
    this.persist();
  }

  public getApiLogs(clientId?: string) {
    if (clientId) {
      return this.data.api_logs.filter(l => l.client_id === clientId).slice(0, 100);
    }
    return this.data.api_logs.slice(0, 100);
  }

  public addWebhookLog(log: WebhookLog) {
    this.data.webhook_logs.unshift(log);
    if (this.data.webhook_logs.length > 500) this.data.webhook_logs.pop();
    this.persist();
  }

  public getWebhookLogs(clientId?: string) {
    if (clientId) {
      return this.data.webhook_logs.filter(w => w.client_id === clientId || w.client_id === null).slice(0, 100);
    }
    return this.data.webhook_logs.slice(0, 100);
  }

  public addAuditLog(log: AuditLog) {
    this.data.audit_logs.unshift(log);
    if (this.data.audit_logs.length > 500) this.data.audit_logs.pop();
    this.persist();
  }

  public getAuditLogs(clientId?: string) {
    if (clientId) {
      return this.data.audit_logs.filter(a => a.client_id === clientId).slice(0, 100);
    }
    return this.data.audit_logs.slice(0, 100);
  }

  public addImpersonationLog(log: AdminImpersonationLog) {
    this.data.admin_impersonation_logs.unshift(log);
    this.persist();
  }

  public getChatConversations(clientId: string): ChatConversation[] {
    const messages = this.data.chat_messages ? this.data.chat_messages.filter(m => m.client_id === clientId) : [];
    const contacts = this.data.contacts.filter(c => c.client_id === clientId);
    const groups = this.data.contact_groups.filter(g => g.client_id === clientId);

    const contactMap = new Map<string, Contact>();
    contacts.forEach(c => contactMap.set(c.phone.replace(/\D/g, ''), c));

    const groupMap = new Map<string, string>();
    groups.forEach(g => groupMap.set(g.id, g.name));

    // Group messages by customer phone
    const convMap = new Map<string, ChatMessage[]>();
    messages.forEach(m => {
      const cleanPhone = m.customer_phone.replace(/\D/g, '');
      if (!convMap.has(cleanPhone)) convMap.set(cleanPhone, []);
      convMap.get(cleanPhone)!.push(m);
    });

    const result: ChatConversation[] = [];

    convMap.forEach((msgs, cleanPhone) => {
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastMsg = msgs[msgs.length - 1];

      const contact = contactMap.get(cleanPhone);
      const contactName = contact?.name || lastMsg.customer_name || `Customer (${cleanPhone.slice(-4)})`;
      const groupName = contact?.group_id ? groupMap.get(contact.group_id) || null : null;

      const inbounds = msgs.filter(m => m.sender === 'customer');
      let isWindowActive = false;
      let windowExpiresAt: string | undefined = undefined;

      if (inbounds.length > 0) {
        const lastInbound = inbounds[inbounds.length - 1];
        const lastInboundTime = new Date(lastInbound.created_at).getTime();
        const diff = Date.now() - lastInboundTime;
        if (diff < 86400000) {
          isWindowActive = true;
          windowExpiresAt = new Date(lastInboundTime + 86400000).toISOString();
        }
      }

      const unreadCount = msgs.filter(m => m.sender === 'customer' && m.status !== 'Read').length;

      result.push({
        phone: lastMsg.customer_phone,
        contact_name: contactName,
        contact_id: contact?.id || null,
        group_name: groupName,
        last_message: lastMsg.text,
        last_message_time: lastMsg.created_at,
        last_message_sender: lastMsg.sender,
        last_message_status: lastMsg.status,
        unread_count: unreadCount,
        is_window_active: isWindowActive,
        window_expires_at: windowExpiresAt
      });
    });

    result.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    return result;
  }

  public getChatMessages(clientId: string, phone: string): ChatMessage[] {
    if (!this.data.chat_messages) return [];
    const cleanTarget = phone.replace(/\D/g, '');
    return this.data.chat_messages
      .filter(m => m.client_id === clientId && m.customer_phone.replace(/\D/g, '') === cleanTarget)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public addChatMessage(msg: ChatMessage): ChatMessage {
    if (!this.data.chat_messages) this.data.chat_messages = [];
    this.data.chat_messages.push(msg);
    this.persist();
    cloudFirestore.saveDocument('chat_messages', msg.id, msg).catch(() => {});
    return msg;
  }

  public markChatMessagesAsRead(clientId: string, phone: string) {
    if (!this.data.chat_messages) return;
    const cleanTarget = phone.replace(/\D/g, '');
    let updated = false;
    this.data.chat_messages.forEach(m => {
      if (m.client_id === clientId && m.customer_phone.replace(/\D/g, '') === cleanTarget && m.sender === 'customer') {
        if (m.status !== 'Read') {
          m.status = 'Read';
          updated = true;
        }
      }
    });
    if (updated) this.persist();
  }

  public upsertTemplate(tpl: WhatsAppTemplate): WhatsAppTemplate {
    const idx = this.data.templates.findIndex(t => 
      (t.client_id === tpl.client_id || (!t.client_id && !tpl.client_id)) &&
      t.name.toLowerCase() === tpl.name.toLowerCase() &&
      t.language === tpl.language
    );

    if (idx >= 0) {
      this.data.templates[idx] = { ...this.data.templates[idx], ...tpl };
      this.persist();
      cloudFirestore.saveDocument('templates', this.data.templates[idx].id, this.data.templates[idx]).catch(() => {});
      return this.data.templates[idx];
    } else {
      this.data.templates.unshift(tpl);
      this.persist();
      cloudFirestore.saveDocument('templates', tpl.id, tpl).catch(() => {});
      return tpl;
    }
  }

  public getPlans() {
    return this.data.plans;
  }

  public getUsers() {
    return this.data.users;
  }

  public clearDummyData(clientId?: string) {
    if (clientId) {
      this.data.contacts = this.data.contacts.filter(c => c.client_id !== clientId);
      this.data.contact_groups = this.data.contact_groups.filter(g => g.client_id !== clientId);
      this.data.campaigns = this.data.campaigns.filter(c => c.client_id !== clientId);
      this.data.campaign_messages = this.data.campaign_messages.filter(m => m.client_id !== clientId);
      this.data.chat_messages = this.data.chat_messages.filter(m => m.client_id !== clientId);
      this.data.templates = this.data.templates.filter(t => t.client_id !== clientId);
      this.data.api_logs = this.data.api_logs.filter(l => l.client_id !== clientId);
      this.data.webhook_logs = this.data.webhook_logs.filter(w => w.client_id !== clientId);
    } else {
      this.data.contacts = [];
      this.data.contact_groups = [];
      this.data.campaigns = [];
      this.data.campaign_messages = [];
      this.data.chat_messages = [];
      this.data.templates = [];
      this.data.api_logs = [];
      this.data.webhook_logs = [];
    }
    this.flush();
    return true;
  }
}

export const db = new DatabaseEngine();
