import React, { useState, useEffect } from 'react';
import { Radio, X, KeyRound, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import { Client, WhatsAppAccount } from '../../types';

interface WhatsAppConfigModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export const WhatsAppConfigModal: React.FC<WhatsAppConfigModalProps> = ({ client, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    display_name: '',
    phone_number_id: '',
    waba_id: '',
    business_id: '',
    meta_access_token: '',
    webhook_verify_token: '',
    quality_rating: 'GREEN' as const,
    status: 'CONNECTED' as const
  });

  useEffect(() => {
    api.getClientWhatsApp(client.id).then((res) => {
      if (res.success && res.whatsapp) {
        setFormData({
          phone_number: res.whatsapp.phone_number || '',
          display_name: res.whatsapp.display_name || client.company_name,
          phone_number_id: res.whatsapp.phone_number_id || '',
          waba_id: res.whatsapp.waba_id || '',
          business_id: res.whatsapp.business_id || '',
          meta_access_token: res.whatsapp.meta_access_token || '',
          webhook_verify_token: res.whatsapp.webhook_verify_token || '',
          quality_rating: res.whatsapp.quality_rating || 'GREEN',
          status: res.whatsapp.status || 'CONNECTED'
        });
      }
      setLoading(false);
    });
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateClientWhatsApp(client.id, formData);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error || 'Failed to update WhatsApp configuration');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              WhatsApp Cloud API Configuration: {client.company_name}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <span>Loading credentials...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Super Admin credential isolation. Each client account has its own isolated Meta WABA credentials.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">WhatsApp Business Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+15550198273"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Display Name in WhatsApp</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Official Brand Display Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Meta Phone Number ID *</label>
                <input
                  type="text"
                  required
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                  placeholder="109823487654321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WhatsApp Business Account ID (WABA ID) *</label>
                <input
                  type="text"
                  required
                  value={formData.waba_id}
                  onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                  placeholder="209823487654322"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Meta Business Manager ID</label>
                <input
                  type="text"
                  value={formData.business_id}
                  onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                  placeholder="309823487654323"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData({ ...formData, webhook_verify_token: e.target.value })}
                  placeholder="meta_verify_token_custom"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Permanent System User Meta Access Token *</label>
              <textarea
                rows={3}
                required
                value={formData.meta_access_token}
                onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                placeholder="EAAG... (Meta Graph API v21.0 Token)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Quality Rating</label>
                <select
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="GREEN">GREEN (High Quality)</option>
                  <option value="YELLOW">YELLOW (Medium Quality)</option>
                  <option value="RED">RED (Low Quality)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account State</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="CONNECTED">CONNECTED (Production Live)</option>
                  <option value="SANDBOX">SANDBOX (Simulator Mode)</option>
                  <option value="DISCONNECTED">DISCONNECTED</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {saving ? 'Saving...' : 'Save Meta Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
