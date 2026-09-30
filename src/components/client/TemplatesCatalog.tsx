import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Sparkles,
  Coins,
  CheckCircle2,
  Copy,
  ExternalLink,
  Phone,
  MessageSquare,
  RefreshCw,
  Key,
  Globe,
  AlertCircle,
  HelpCircle,
  X,
  Check
} from 'lucide-react';
import { api } from '../../api';
import { WhatsAppTemplate } from '../../types';
import { WhatsAppPreviewSimulator } from '../WhatsAppPreviewSimulator';

export const TemplatesCatalog: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [wabaId, setWabaId] = useState<string>('');
  const [metaAccessToken, setMetaAccessToken] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.getTemplates();
      if (res.success) {
        setTemplates(res.templates);
        if (res.templates.length > 0 && !activeTemplate) {
          setActiveTemplate(res.templates[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openSyncModal = async () => {
    setIsSyncModalOpen(true);
    setSyncStatus(null);
    try {
      const configRes = await api.getWhatsAppConfig();
      if (configRes.success && configRes.whatsapp) {
        setWabaId(configRes.whatsapp.waba_id || '');
        setMetaAccessToken(configRes.whatsapp.meta_access_token || '');
        setAppSecret(configRes.whatsapp.app_secret || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const res = await api.syncRealTemplates({
        wabaId: wabaId.trim() || undefined,
        metaAccessToken: metaAccessToken.trim() || undefined,
        appSecret: appSecret.trim() || undefined
      });

      if (res.success) {
        setSyncStatus({
          success: true,
          count: res.count,
          message: `Successfully fetched and synced ${res.count} real templates from your Meta WhatsApp account.`
        });
        fetchTemplates();
      } else {
        setSyncStatus({
          success: false,
          message: res.error || 'Failed to fetch templates from Meta Graph API'
        });
      }
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err.message || 'Error communicating with Meta'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = templates.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-emerald-400" />
            <span>Official Meta WhatsApp Templates</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Meta Cloud API verified and approved templates available for bulk campaigns and WhatsApp Live Chat.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh */}
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Refresh templates list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Sync Real Meta Templates Button */}
          <button
            onClick={openSyncModal}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Sync Real Templates</span>
          </button>
        </div>
      </div>

      {/* Filter and Overview Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Category:</span>
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({templates.length})
            </button>
            <button
              onClick={() => setSelectedCategory('MARKETING')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'MARKETING' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Marketing ({templates.filter((t) => t.category === 'MARKETING').length})
            </button>
            <button
              onClick={() => setSelectedCategory('UTILITY')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedCategory === 'UTILITY' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Utility ({templates.filter((t) => t.category === 'UTILITY').length})
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Showing <strong>{filtered.length}</strong> active Meta templates
        </div>
      </div>

      {/* Main Grid: Template Cards + Live WhatsApp Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-7 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
              <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-white font-semibold">No templates found in this category</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Sync with your real Meta WhatsApp Business Account to fetch all your live approved templates.
              </p>
              <button
                onClick={openSyncModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Sync Real Templates from Meta
              </button>
            </div>
          ) : (
            filtered.map((t) => {
              const isSelected = activeTemplate?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTemplate(t)}
                  className={`bg-slate-900 border p-5 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/5 bg-slate-850'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-sm">{t.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-medium flex items-center space-x-1 ${
                            t.category === 'MARKETING'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          <Coins className="w-3 h-3" />
                          <span>{t.category}</span>
                        </span>
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.2 rounded-full font-mono">
                          {t.language}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.status}</span>
                    </span>
                  </div>

                  {/* Header info */}
                  {t.header_content && (
                    <div className="mt-3 text-[11px] font-semibold text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      Header: {t.header_content}
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="mt-2.5 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {t.body_text}
                  </div>

                  {/* Footer & Buttons */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span>Variables: <strong>{t.variables.length > 0 ? t.variables.join(', ') : 'None'}</strong></span>
                      {t.buttons && t.buttons.length > 0 && (
                        <span>Buttons: <strong>{t.buttons.length} Interactive</strong></span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(t.name, t.id);
                      }}
                      className="text-slate-400 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied Name</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Template Name</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Simulator Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            {activeTemplate ? (
              <WhatsAppPreviewSimulator
                template={activeTemplate}
                previewVariables={{
                  '1': 'Rahul Sharma',
                  '2': 'FESTIVE25',
                  '3': 'Sunday',
                  '4': '25%',
                  'name': 'Rahul Sharma'
                }}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500">
                Select a template to view the live WhatsApp phone simulator.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Real Meta Templates Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Sync Real Meta WhatsApp Templates</h2>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSyncMeta} className="p-6 space-y-4 text-xs text-slate-300">
              <p className="text-slate-400 text-xs">
                Connects directly to Meta's WhatsApp Cloud API (<code>graph.facebook.com/v21.0</code>) using your WhatsApp
                Business Account ID (WABA ID) and Permanent System User Access Token to fetch all live approved templates.
              </p>

              {syncStatus && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
                    syncStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {syncStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{syncStatus.success ? 'Sync Successful' : 'Meta API Error'}</p>
                    <p className="text-[11px] mt-0.5">{syncStatus.message}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    WhatsApp Business Account ID (WABA ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 209823487654322"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Found in Meta Business Suite &gt; WhatsApp Business Account Settings
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Meta Permanent Access Token (System User) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="EAAB... or EAAG..."
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Token requires <code>whatsapp_business_management</code> and <code>whatsapp_business_messaging</code> permissions.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Meta App Secret (App Secret Proof)
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 6912a015ebb9131b92b23094e09825d1"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Found in Meta App Dashboard &gt; App settings &gt; Basic &gt; App Secret. Enables HMAC-SHA256 <code>appsecret_proof</code> to satisfy Meta security requirements (fixes Code 100).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                <span className="font-semibold text-slate-300">How real sync works:</span>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                  <li>Calls <code>GET /v21.0/{'{waba_id}'}/message_templates</code></li>
                  <li>Parses Header, Body, Footer, and Quick Reply / URL buttons</li>
                  <li>Automatically extracts all <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> variables for campaign mapping and live chat</li>
                  <li>Updates your client template catalog instantly</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing || !wabaId.trim() || !metaAccessToken.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Fetching from Meta...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Fetch Real Templates</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
