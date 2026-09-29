export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'client_admin' | 'client_user';
  client_id?: string | null;
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

export interface Client {
  id: string;
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

export interface WhatsAppAccount {
  id: string;
  client_id: string;
  phone_number: string;
  display_name: string;
  phone_number_id: string;
  waba_id: string;
  business_id: string;
  meta_access_token: string;
  app_secret?: string;
  webhook_verify_token: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  status: 'CONNECTED' | 'DISCONNECTED' | 'SANDBOX';
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
  phone: string;
  email?: string;
  metadata?: Record<string, string>;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  status: 'active' | 'opt_out' | 'invalid';
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  client_id?: string | null;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  header_type?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | null;
  header_content?: string;
  body_text: string;
  footer_text?: string;
  buttons?: Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone_number?: string }>;
  variables: string[];
  created_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  type: 'group' | 'file' | 'individual' | 'api';
  template_id: string;
  template_name: string;
  language: string;
  credit_type: 'marketing' | 'utility';
  group_id?: string | null;
  group_name?: string | null;
  variable_mapping: Record<string, string>;
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
  message_id?: string | null;
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
  amount: number;
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
