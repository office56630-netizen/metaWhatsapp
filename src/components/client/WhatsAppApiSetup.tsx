import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Radio,
  RefreshCw,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  Server,
  Database,
  Layers,
  HelpCircle,
  Sparkles,
  Globe,
  Shuffle
} from 'lucide-react';
import { api } from '../../api';

interface WhatsAppAccountState {
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
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppApiSetupProps {
  onNavigateTab?: (tab: string) => void;
}

export const WhatsAppApiSetup: React.FC<WhatsAppApiSetupProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Form state - initialized cleanly without third-party demo strings
  const [formData, setFormData] = useState<WhatsAppAccountState>({
    id: '',
    client_id: '',
    phone_number: '',
    display_name: 'My WhatsApp Business',
    phone_number_id: '',
    waba_id: '',
    business_id: '',
    meta_access_token: '',
    app_secret: '',
    webhook_verify_token: 'meta_verify_token_secure_2026',
    quality_rating: 'UNKNOWN',
    status: 'DISCONNECTED'
  });

  // UI state
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showCustomSecret, setShowCustomSecret] = useState(false);
  const [techProvider, setTechProvider] = useState<{
    is_configured: boolean;
    app_name: string;
    app_id: string;
    webhook_verify_token: string;
    has_global_secret?: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [webhookTested, setWebhookTested] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    details?: string;
  } | null>(null);

  // Dynamic real application URL (never third-party placeholder)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultCallbackUrl = `${currentOrigin}/webhook/whatsapp`;

  const [callbackUrlInput, setCallbackUrlInput] = useState(defaultCallbackUrl);
  const [urlMode, setUrlMode] = useState<'app_default' | 'api_v1' | 'custom'>('app_default');

  // Keep callbackUrlInput in sync when urlMode changes
  const handleUrlModeChange = (mode: 'app_default' | 'api_v1' | 'custom') => {
    setUrlMode(mode);
    if (mode === 'app_default') {
      setCallbackUrlInput(`${currentOrigin}/webhook/whatsapp`);
    } else if (mode === 'api_v1') {
      setCallbackUrlInput(`${currentOrigin}/api/v1/webhook`);
    }
  };

  // Load from Web Server Database on mount (NEVER localStorage)
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.getClientWhatsAppConfig();
      if (res.success) {
        if (res.tech_provider) {
          setTechProvider(res.tech_provider);
        }
        if (res.whatsapp) {
          setFormData({
            id: res.whatsapp.id || '',
            client_id: res.whatsapp.client_id || '',
            phone_number: res.whatsapp.phone_number || '',
            display_name: res.whatsapp.display_name || 'My WhatsApp Business',
            phone_number_id: res.whatsapp.phone_number_id || '',
            waba_id: res.whatsapp.waba_id || '',
            business_id: res.whatsapp.business_id || '',
            meta_access_token: res.whatsapp.meta_access_token || '',
            app_secret: res.whatsapp.app_secret || '',
            webhook_verify_token: res.whatsapp.webhook_verify_token || 'meta_verify_token_secure_2026',
            quality_rating: res.whatsapp.quality_rating || 'UNKNOWN',
            status: res.whatsapp.status || 'DISCONNECTED',
            created_at: res.whatsapp.created_at,
            updated_at: res.whatsapp.updated_at
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching WhatsApp config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleCopy = (text: string, fieldKey: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleGenerateNewToken = () => {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newToken = `meta_verify_${randomHex}`;
    setFormData((prev) => ({ ...prev, webhook_verify_token: newToken }));
    setStatusMessage({
      type: 'info',
      text: 'Generated new random Webhook Verify Token. Click "Save to Web Server" to save it.'
    });
  };

  // Test local webhook verification endpoint
  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTested(null);
    try {
      const challengeStr = 'challenge_test_' + Math.floor(Math.random() * 100000);
      const testUrl = `/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
        formData.webhook_verify_token
      )}&hub.challenge=${challengeStr}`;

      const res = await fetch(testUrl);
      const text = await res.text();

      if (res.ok && text === challengeStr) {
        setWebhookTested(true);
        setStatusMessage({
          type: 'success',
          text: 'Webhook handshake verified successfully! Server responded with HTTP 200 challenge match.'
        });
      } else {
        setWebhookTested(false);
        setStatusMessage({
          type: 'error',
          text: `Webhook handshake failed (HTTP ${res.status}): Make sure you save the current Verify Token to the web server first.`
        });
      }
    } catch (e: any) {
      setWebhookTested(false);
      setStatusMessage({
        type: 'error',
        text: `Webhook test error: ${e.message}`
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Save directly to Web Server Database (data/database.json)
  const handleSaveToWeb = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await api.updateClientWhatsAppConfig({
        phone_number: formData.phone_number,
        display_name: formData.display_name,
        phone_number_id: formData.phone_number_id.trim(),
        waba_id: formData.waba_id.trim(),
        business_id: formData.business_id.trim(),
        meta_access_token: formData.meta_access_token.trim(),
        app_secret: formData.app_secret?.trim() || '',
        webhook_verify_token: formData.webhook_verify_token.trim(),
        quality_rating: formData.quality_rating,
        status: formData.status
      });

      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          ...res.whatsapp
        }));
        setStatusMessage({
          type: 'success',
          text: 'Configuration saved directly to the web server database! Stored securely on the backend (never in browser local storage).'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to save configuration to web database.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error saving to web server: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  // Test & Verify Connection against Meta Graph API
  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await api.testClientWhatsAppConnection({
        phone_number_id: formData.phone_number_id.trim(),
        waba_id: formData.waba_id.trim(),
        meta_access_token: formData.meta_access_token.trim(),
        app_secret: formData.app_secret?.trim() || '',
        webhook_verify_token: formData.webhook_verify_token.trim()
      });

      if (res.success) {
        setFormData((prev) => ({
          ...prev,
          status: 'CONNECTED',
          quality_rating: res.phone?.quality_rating || prev.quality_rating,
          phone_number: res.phone?.display_phone_number || prev.phone_number,
          display_name: res.phone?.verified_name || prev.display_name
        }));
        setStatusMessage({
          type: 'success',
          text: 'Success! You are now connected to Whatsapp Cloud',
          details: `Verified Phone Number: ${res.phone?.display_phone_number || formData.phone_number || 'Connected'} (${res.phone?.verified_name || formData.display_name}) • Quality: ${res.phone?.quality_rating || 'GREEN'} • Meta WABA ID: ${formData.waba_id || 'Verified'}`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Connection verification failed with Meta Graph API.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Connection error: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  // Sync templates from Meta
  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    setStatusMessage(null);
    try {
      const res = await api.syncMetaTemplates({
        wabaId: formData.waba_id.trim(),
        metaAccessToken: formData.meta_access_token.trim(),
        appSecret: formData.app_secret?.trim() || ''
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully synced ${res.count} approved templates from Meta Graph API!`,
          details: 'Templates are now saved on the web server and ready for campaigns & live chat.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to sync templates from Meta Graph API.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to sync templates: ${err.message}`
      });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const isConnected = formData.status === 'CONNECTED' && formData.meta_access_token && formData.phone_number_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-400" />
        <span>Loading WhatsApp Cloud API configuration from web server...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Radio className="w-36 h-36 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💬</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp Cloud API Setup</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
                Meta Graph API v21.0
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Connect your official Meta WhatsApp Business Cloud API account, configure real-time webhooks, and securely store your credentials on the web server.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveToWeb}
              disabled={saving}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
              <span>{saving ? 'Saving to Web...' : 'Save to Web Server'}</span>
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Security & Storage Notice */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Database className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">
              Web Server Storage: Credentials stored in backend database (<code className="text-slate-300 font-mono">data/database.json</code>). Zero data stored in browser localStorage.
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Tenant: {formData.client_id || 'CLT-00001'} • Account ID: {formData.id || 'WA-00001'}
          </span>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isConnected
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              }`}
            >
              {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Whatsapp Cloud API - Connection Status
              </div>
              <div
                className={`text-lg font-bold flex items-center space-x-2 mt-0.5 ${
                  isConnected ? 'text-emerald-400' : 'text-slate-200'
                }`}
              >
                <span>
                  {isConnected
                    ? 'Success! You are now connected to Whatsapp Cloud'
                    : 'Awaiting Meta Credentials & Setup'}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-lg font-mono flex items-center space-x-1.5 ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>Status: {isConnected ? 'CONNECTED (Live)' : 'PENDING'}</span>
            </span>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1 rounded-lg font-mono flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>App Secret Proof: {formData.app_secret ? 'Custom Override Active' : 'Managed by Tech Provider'}</span>
            </span>
          </div>
        </div>

        {/* Status Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Phone Number ID</div>
            <div className="text-sm font-mono font-semibold text-white mt-1 select-all truncate">
              {formData.phone_number_id || <span className="text-slate-500 font-normal italic">Enter in Step 3</span>}
            </div>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">WABA ID (Account ID)</div>
            <div className="text-sm font-mono font-semibold text-white mt-1 select-all truncate">
              {formData.waba_id || <span className="text-slate-500 font-normal italic">Enter in Step 3</span>}
            </div>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Business Display Name</div>
            <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
              {formData.display_name || 'My WhatsApp Business'}
            </div>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Phone</div>
            <div className="text-sm font-mono font-semibold text-emerald-400 mt-1 truncate">
              {formData.phone_number || <span className="text-slate-500 font-normal italic">Auto-verified on test</span>}
            </div>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSyncTemplates}
              disabled={syncingTemplates || !formData.waba_id || !formData.meta_access_token}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncingTemplates ? 'animate-spin' : ''}`} />
              <span>{syncingTemplates ? 'Syncing Templates...' : 'Sync Real Meta Templates'}</span>
            </button>
            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('chat')}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Live Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('templates')}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Templates Catalog</span>
                </button>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Last Updated: {formData.updated_at ? new Date(formData.updated_at).toLocaleString() : 'Just now'}
          </span>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-500/30 text-red-200'
              : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1 text-xs">
            <div className="font-semibold text-sm">{statusMessage.text}</div>
            {statusMessage.details && <div className="mt-1 text-slate-300 font-mono text-[11px]">{statusMessage.details}</div>}
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CREATE DEVELOPER ACCOUNT & NEW FACEBOOK APP & WEBHOOK             */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Step 1: Create developer account and a new Facebook app</h2>
              <p className="text-xs text-slate-400">Configure real-time webhooks in your Meta App Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              {testingWebhook ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{testingWebhook ? 'Verifying...' : 'Test Webhook Verification'}</span>
            </button>
          </div>
        </div>

        {/* Verification Status Notice */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-center space-x-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-emerald-200">
              Webhook endpoint is live and ready for Meta challenge verification.
            </span>
            <p className="text-[11px] text-emerald-400/90 mt-0.5">
              Copy the Callback URL and Verify Token below into your Meta App Dashboard under WhatsApp &gt; Configuration.
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <p>
            1. Create a Developer account and a new Facebook app as described in the{' '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center space-x-0.5"
            >
              <span>Meta App Dashboard</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>.
          </p>
          <p>
            2. Once you have your Facebook app created, in the dashboard of the app, locate the <strong className="text-white">WhatsApp product -&gt; Setup</strong>.
          </p>
          <p>
            3. Then go to <strong className="text-white">WhatsApp &gt; Configuration</strong> and enter the following info:
          </p>
        </div>

        {/* Webhook Configuration Inputs */}
        <div className="space-y-4 pt-2">
          {/* Callback URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <span>Callback URL</span>
                <span className="text-emerald-400 font-normal">(Enter in Meta App Dashboard)</span>
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleUrlModeChange('app_default')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    urlMode === 'app_default'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard App URL
                </button>
                <button
                  type="button"
                  onClick={() => handleUrlModeChange('api_v1')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    urlMode === 'api_v1'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  /api/v1/webhook
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={callbackUrlInput}
                onChange={(e) => {
                  setCallbackUrlInput(e.target.value);
                  setUrlMode('custom');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none pr-24"
              />
              <button
                type="button"
                onClick={() => handleCopy(callbackUrlInput, 'callback_url')}
                className="absolute right-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
              >
                {copiedField === 'callback_url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Live endpoint on this app. Both <code className="text-slate-400 font-mono">/webhook/whatsapp</code> and <code className="text-slate-400 font-mono">/api/v1/webhook</code> are actively listened to.
            </p>
          </div>

          {/* Verify Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Verify token <span className="text-emerald-400 font-normal">(Enter in Meta App Dashboard)</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateNewToken}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center space-x-1 cursor-pointer"
              >
                <Shuffle className="w-3 h-3" />
                <span>Generate Random Token</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={formData.webhook_verify_token}
                onChange={(e) => setFormData({ ...formData, webhook_verify_token: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none pr-28"
              />
              <button
                type="button"
                onClick={() => handleCopy(formData.webhook_verify_token, 'verify_token')}
                className="absolute right-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
              >
                {copiedField === 'verify_token' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Webhook Field Instruction */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start space-x-2 text-xs text-slate-300">
            <span className="text-emerald-400 text-base">👉</span>
            <div>
              <span className="font-semibold text-white">Click on Webhook fields -&gt; Manage and select the Messages</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Subscribing to the <strong className="text-slate-200">messages</strong> field ensures real-time delivery status (Sent, Delivered, Read, Failed) and inbound customer chats arrive immediately in the Live Chat inbox.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: GET YOUR PERMANENT ACCESS TOKEN & TECH PROVIDER APSECRET PROOF     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Step 2: Connect Permanent Access Token</h2>
            <p className="text-xs text-slate-400">Meta App Secret is centrally managed by your Platform Tech Provider</p>
          </div>
        </div>

        {/* Tech Provider Architectural Notice */}
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tech Provider Mode: No App Secret Key Needed by Tenant Accounts</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            As a tenant, you <strong>do not</strong> have to configure or paste a Meta App Secret. The platform's verified <strong>Meta Tech Provider</strong> ({techProvider?.app_name || 'Official WhatsApp Tech Provider'}) centrally manages the App Secret and automatically computes the required HMAC-SHA256 <code className="text-emerald-300 font-mono">appsecret_proof</code> on every Graph API request.
          </p>
        </div>

        <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
          <p>
            The process of creating a permanent access token is explained in detail in the{' '}
            <a
              href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-users"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center space-x-0.5"
            >
              <span>Facebook Docs</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>.
          </p>
          <p className="text-slate-400 text-[11px]">
            In <strong className="text-slate-200">Meta Business Manager &gt; Business Settings &gt; System Users</strong>, create a system user and generate a token selecting the permissions <code className="text-emerald-400 font-mono">whatsapp_business_messaging</code> and <code className="text-emerald-400 font-mono">whatsapp_business_management</code>.
          </p>
          <p className="font-medium text-slate-200">Once you have the permanent access token, enter it here:</p>
        </div>

        {/* Permanent Access Token Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
              <span>Permanent access token</span>
              <span className="text-red-400 font-mono">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-slate-400 hover:text-white text-xs flex items-center space-x-1 cursor-pointer"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showToken ? 'Hide' : 'Show'}</span>
              </button>
              {formData.meta_access_token && (
                <button
                  type="button"
                  onClick={() => handleCopy(formData.meta_access_token, 'access_token')}
                  className="text-slate-400 hover:text-white text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'access_token' ? (
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={3}
            value={formData.meta_access_token}
            onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
            placeholder="EAAG... (Paste your permanent system user access token from Meta)"
            className={`w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none ${
              !showToken && formData.meta_access_token ? 'filter blur-[3.5px] hover:blur-none transition-all' : ''
            }`}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Stored in web server database (never exposed in client localStorage).</span>
            <span>Length: {formData.meta_access_token ? formData.meta_access_token.length : 0} chars</span>
          </div>
        </div>

        {/* Tech Provider Managed App Secret Indicator & Optional Tenant Override */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Meta App Secret: Auto-Handled by Platform Tech Provider
                </div>
                <div className="text-[11px] text-slate-400">
                  {formData.app_secret
                    ? 'Custom tenant App Secret override is currently applied.'
                    : `Active. Inheriting platform credentials (${techProvider?.app_name || 'Official WhatsApp Tech Provider'}).`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCustomSecret(!showCustomSecret)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              {showCustomSecret ? 'Hide Custom Secret Override' : 'Custom App Secret Override (Optional)'}
            </button>
          </div>

          {showCustomSecret && (
            <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Custom Meta App Secret <span className="text-slate-500 font-normal">(Leave blank to use Tech Provider default)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-400 hover:text-white text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSecret ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={formData.app_secret || ''}
                onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                placeholder="Leave blank to use platform Tech Provider App Secret"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                Only enter this if your organization owns an independent Meta Developer App and refuses platform-level proof generation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: GET ACCOUNT ID & PHONE NUMBER ID                                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Step 3: Get you Account ID and Phone number ID</h2>
            <p className="text-xs text-slate-400">Copy your IDs from Meta App Dashboard &gt; WhatsApp &gt; API Setup</p>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
          <p>
            In your Facebook App, go to <strong className="text-white">WhatsApp -&gt; API setup</strong>. You will find your <strong className="text-emerald-400">Phone number ID</strong> and your <strong className="text-emerald-400">WhatsApp Business Account ID</strong>.
          </p>
          <p className="text-slate-400">Copy them and enter them here:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Phone Number ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phone number ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.phone_number_id}
                onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                placeholder="e.g. 1052719167920294"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none pr-16"
              />
              {formData.phone_number_id && (
                <button
                  type="button"
                  onClick={() => handleCopy(formData.phone_number_id, 'phone_id')}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {copiedField === 'phone_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Used to dispatch campaigns and direct live chat messages.</p>
          </div>

          {/* WhatsApp Business Account ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              WhatsApp Business Account ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.waba_id}
                onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                placeholder="e.g. 1705406507292686"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none pr-16"
              />
              {formData.waba_id && (
                <button
                  type="button"
                  onClick={() => handleCopy(formData.waba_id, 'waba_id')}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {copiedField === 'waba_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Used to fetch approved Meta message templates.</p>
          </div>
        </div>

        {/* Display Profile Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sender Phone Number <span className="text-slate-500 font-normal">(Display / Sender)</span>
            </label>
            <input
              type="text"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="e.g. +1 555-019-2029"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Verified Business Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="My WhatsApp Business"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ACTION BAR                                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>All credentials persist directly in <code className="text-slate-300 font-mono">data/database.json</code> on the web server.</span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !formData.meta_access_token || !formData.phone_number_id}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
            <span>{testing ? 'Testing Live...' : 'Test & Verify Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToWeb}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save to Web Server'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
