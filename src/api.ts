// Typed API client for Super Admin and Client Dashboard

const getHeaders = (extraHeaders?: Record<string, string>) => {
  const sessionToken = localStorage.getItem('waba_session_token') || 'session_superadmin_master_token_2026';
  return {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    ...extraHeaders
  };
};

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders()
    });
    return res.json();
  },

  impersonate: async (clientId: string) => {
    const res = await fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ clientId })
    });
    return res.json();
  },

  stopImpersonation: async () => {
    const res = await fetch('/api/auth/stop-impersonation', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Client Dashboard
  getClientDashboard: async () => {
    const res = await fetch('/api/client/dashboard', { headers: getHeaders() });
    return res.json();
  },

  getContacts: async (params?: { groupId?: string; search?: string; status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.groupId) q.set('groupId', params.groupId);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const res = await fetch(`/api/client/contacts?${q.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  createContact: async (data: any) => {
    const res = await fetch('/api/client/contacts', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateContact: async (id: string, data: any) => {
    const res = await fetch(`/api/client/contacts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteContact: async (id: string) => {
    const res = await fetch(`/api/client/contacts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  bulkDeleteContacts: async (ids: string[]) => {
    const res = await fetch('/api/client/contacts/bulk-delete', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids })
    });
    return res.json();
  },

  getGroups: async () => {
    const res = await fetch('/api/client/groups', { headers: getHeaders() });
    return res.json();
  },

  createGroup: async (name: string, description?: string) => {
    const res = await fetch('/api/client/groups', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description })
    });
    return res.json();
  },

  updateGroup: async (id: string, data: { name: string; description?: string }) => {
    const res = await fetch(`/api/client/groups/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteGroup: async (id: string) => {
    const res = await fetch(`/api/client/groups/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  validateContactImport: async (payload: {
    rawText?: string;
    rows?: any[];
    defaultGroupId?: string;
    defaultCountryCode?: string;
    updateExisting?: boolean;
    columnMappings?: Record<string, { role: string; metadataKey?: string }>;
  }) => {
    const res = await fetch('/api/client/contacts/validate-import', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  confirmContactImport: async (
    validRows: any[],
    options?: { defaultGroupId?: string; createMissingGroups?: boolean; updateExisting?: boolean } | string
  ) => {
    const payload = typeof options === 'string'
      ? { validRows, defaultGroupId: options }
      : { validRows, ...options };

    const res = await fetch('/api/client/contacts/confirm-import', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  getTemplates: async () => {
    const res = await fetch('/api/client/templates', { headers: getHeaders() });
    return res.json();
  },

  syncRealTemplates: async (params?: { wabaId?: string; metaAccessToken?: string; appSecret?: string }) => {
    const res = await fetch('/api/client/templates/sync-meta', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params || {})
    });
    return res.json();
  },

  syncMetaTemplates: async (params?: { wabaId?: string; metaAccessToken?: string; appSecret?: string }) => {
    const res = await fetch('/api/client/templates/sync-meta', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params || {})
    });
    return res.json();
  },

  getWhatsAppConfig: async () => {
    const res = await fetch('/api/client/whatsapp-config', { headers: getHeaders() });
    return res.json();
  },

  updateWhatsAppConfig: async (data: any) => {
    const res = await fetch('/api/client/whatsapp-config', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Live Chat & Customer Inbox
  getChatConversations: async () => {
    const res = await fetch('/api/client/chat/conversations', { headers: getHeaders() });
    return res.json();
  },

  getChatMessages: async (phone: string) => {
    const res = await fetch(`/api/client/chat/messages/${encodeURIComponent(phone)}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  sendChatMessage: async (data: {
    to: string;
    type?: 'text' | 'template';
    text?: string;
    templateId?: string;
    variables?: Record<string, string>;
  }) => {
    const res = await fetch('/api/client/chat/send', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  simulateInboundChat: async (data: { phone: string; text: string; name?: string }) => {
    const res = await fetch('/api/client/chat/simulate-inbound', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getCampaigns: async () => {
    const res = await fetch('/api/client/campaigns', { headers: getHeaders() });
    return res.json();
  },

  getCampaignById: async (id: string) => {
    const res = await fetch(`/api/client/campaigns/${id}`, { headers: getHeaders() });
    return res.json();
  },

  createCampaign: async (campaignData: any) => {
    const res = await fetch('/api/client/campaigns', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(campaignData)
    });
    return res.json();
  },

  pauseCampaign: async (id: string) => {
    const res = await fetch(`/api/client/campaigns/${id}/pause`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  resumeCampaign: async (id: string) => {
    const res = await fetch(`/api/client/campaigns/${id}/resume`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  cancelCampaign: async (id: string) => {
    const res = await fetch(`/api/client/campaigns/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  getCampaignRecords: async (params?: { campaignId?: string; status?: string; phone?: string; search?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.campaignId) q.set('campaignId', params.campaignId);
    if (params?.status) q.set('status', params.status);
    if (params?.phone) q.set('phone', params.phone);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const res = await fetch(`/api/client/campaign-records?${q.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  getCampaignMessages: async (params?: { campaignId?: string; status?: string; phone?: string; search?: string; limit?: number; offset?: number }) => {
    return api.getCampaignRecords(params);
  },

  getCredits: async () => {
    const res = await fetch('/api/client/credits', { headers: getHeaders() });
    return res.json();
  },

  getApiToken: async () => {
    const res = await fetch('/api/client/api-token', { headers: getHeaders() });
    return res.json();
  },

  regenerateApiToken: async () => {
    const res = await fetch('/api/client/api-token/regenerate', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  getApiLogs: async () => {
    const res = await fetch('/api/client/api-logs', { headers: getHeaders() });
    return res.json();
  },

  // Super Admin
  getAdminDashboard: async () => {
    const res = await fetch('/api/admin/dashboard', { headers: getHeaders() });
    return res.json();
  },

  createClient: async (data: any) => {
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateClient: async (id: string, data: any) => {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  adjustCredits: async (id: string, data: { credit_type: 'marketing' | 'utility'; amount: number; description?: string }) => {
    const res = await fetch(`/api/admin/clients/${id}/adjust-credits`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getClientWhatsApp: async (clientId: string) => {
    const res = await fetch(`/api/admin/clients/${clientId}/whatsapp`, { headers: getHeaders() });
    return res.json();
  },

  updateClientWhatsApp: async (clientId: string, data: any) => {
    const res = await fetch(`/api/admin/clients/${clientId}/whatsapp`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getAdminLogs: async () => {
    const res = await fetch('/api/admin/logs', { headers: getHeaders() });
    return res.json();
  },

  simulateWebhookStatus: async (message_id: string, status: string) => {
    const res = await fetch('/api/admin/simulate-webhook-status', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message_id, status })
    });
    return res.json();
  },

  // Client WhatsApp Account Configuration (Stored on web server DB, never localStorage)
  getClientWhatsAppConfig: async () => {
    const res = await fetch('/api/client/whatsapp-config', { headers: getHeaders() });
    return res.json();
  },

  updateClientWhatsAppConfig: async (data: any) => {
    const res = await fetch('/api/client/whatsapp-config', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  testClientWhatsAppConnection: async (data?: any) => {
    const res = await fetch('/api/client/whatsapp-config/test', {
      method: 'POST',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    return res.json();
  },

  // Google Cloud Firestore Storage (Free Tier)
  getCloudStorageStatus: async () => {
    const res = await fetch('/api/client/cloud-storage/status', { headers: getHeaders() });
    return res.json();
  },

  syncCloudStorage: async () => {
    const res = await fetch('/api/client/cloud-storage/sync', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Tech Provider Configuration (Super Admin)
  getTechProviderConfig: async () => {
    const res = await fetch('/api/admin/tech-provider-config', { headers: getHeaders() });
    return res.json();
  },

  updateTechProviderConfig: async (data: any) => {
    const res = await fetch('/api/admin/tech-provider-config', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Direct REST API test call helper (uses Bearer token)
  callClientApi: async (endpoint: string, method: string, token: string, body?: any) => {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    return { status: res.status, data };
  }
};
