import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  Radio,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api';

interface TechProviderSettingsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const TechProviderSettingsModal: React.FC<TechProviderSettingsModalProps> = ({
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    app_id: '',
    app_secret: '',
    app_name: 'Official WhatsApp Tech Provider',
    webhook_verify_token: 'meta_verify_token_secure_2026',
    system_user_access_token: ''
  });

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const globalWebhookUrl = `${currentOrigin}/webhook/whatsapp`;

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await api.getTechProviderConfig();
        if (res.success && res.config) {
          setFormData({
            app_id: res.config.app_id || '',
            app_secret: res.config.app_secret || '',
            app_name: res.config.app_name || 'Official WhatsApp Tech Provider',
            webhook_verify_token: res.config.webhook_verify_token || 'meta_verify_token_secure_2026',
            system_user_access_token: res.config.system_user_access_token || ''
          });
        }
      } catch (err: any) {
        console.error('Error fetching Tech Provider config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleCopy = (text: string, fieldKey: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateTechProviderConfig(formData);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Tech Provider Global Configuration saved! All tenant accounts now automatically inherit this Meta App Secret.'
        });
        if (onSuccess) onSuccess();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to update Tech Provider settings.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Meta Tech Provider Platform Settings</h2>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-purple-500/30">
                  Global Solution Partner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized Meta Developer App credentials inherited by all tenant accounts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Architecture Explainer Banner */}
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 text-purple-200 space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-purple-300 text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Why Tenants Never Put The Meta App Secret Key</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              As an official <strong>Meta Tech Provider</strong>, you own a single Meta Developer App. When you enter your <strong>Meta App Secret</strong> here once, the server automatically computes the cryptographic <code className="text-emerald-300 font-mono">appsecret_proof = HMAC_SHA256(token, app_secret)</code> for <strong>every tenant</strong> across all Meta Graph API calls.
            </p>
            <div className="flex items-center space-x-4 pt-1 text-[11px] text-purple-300/90 font-mono">
              <span>✓ Single Master App Secret</span>
              <span>✓ Tenants only provide WABA & Phone ID</span>
              <span>✓ Zero secret leakage to clients</span>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Meta App Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Tech Provider App Name
              </label>
              <input
                type="text"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                placeholder="e.g. My Company WhatsApp Tech Provider"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Meta App ID & App Secret Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                  <span>Meta App ID</span>
                  <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.app_id}
                  onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                  placeholder="e.g. 1052719167920294"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  From Meta Developer Portal &gt; App Dashboard.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold flex items-center space-x-1.5">
                    <span>Meta App Secret</span>
                    <span className="text-purple-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-slate-400 hover:text-white text-[11px] flex items-center space-x-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  required
                  value={formData.app_secret}
                  onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                  placeholder="32-character Meta App Secret"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Meta App Dashboard &gt; App Settings &gt; Basic &gt; App Secret.
                </p>
              </div>
            </div>

            {/* Global Webhook Callback URL */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Global Platform Webhook Callback URL (Enter in Meta Developer App)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={globalWebhookUrl}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono pr-24 select-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(globalWebhookUrl, 'global_webhook')}
                  className="absolute right-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                >
                  {copiedField === 'global_webhook' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Global Webhook Verify Token */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Global Webhook Verify Token
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData({ ...formData, webhook_verify_token: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono pr-24 text-xs focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(formData.webhook_verify_token, 'global_verify')}
                  className="absolute right-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                >
                  {copiedField === 'global_verify' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              {saving ? <span>Saving...</span> : <span>Save Platform Configuration</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
