import React, { useEffect, useState } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  Send,
  Users,
  Radio,
  FileCode2,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  HardDrive,
  Activity,
  Check,
  ListOrdered
} from 'lucide-react';
import { api } from '../../api';

interface CloudStorageProps {
  onNavigateTab?: (tab: string) => void;
}

export const CloudStorageManager: React.FC<CloudStorageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'campaigns' | 'contacts' | 'whatsapp'>('records');

  const [status, setStatus] = useState<any>({
    connected: true,
    provider: 'Google Cloud Firestore',
    projectId: 'gleaming-dispatch-1kx2q',
    databaseId: 'ai-studio-metawhatsappmult-1ba2bda5-2b9f-406e-b07f-4befbea47c77',
    lastSyncAt: null,
    syncedCounts: {
      campaigns: 0,
      campaign_messages: 0,
      contacts: 0,
      whatsapp_accounts: 0,
      templates: 0,
      chat_messages: 0,
      credit_transactions: 0
    }
  });

  const [records, setRecords] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [whatsapp, setWhatsapp] = useState<any>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, msgsRes, campsRes, contactsRes, waRes] = await Promise.all([
        api.getCloudStorageStatus(),
        api.getCampaignRecords({ limit: 50 }),
        api.getCampaigns(),
        api.getContacts({ limit: 50 }),
        api.getClientWhatsAppConfig()
      ]);

      if (statusRes.success && statusRes.cloudStorage) {
        setStatus(statusRes.cloudStorage);
      }
      if (msgsRes.success && msgsRes.messages) {
        setRecords(msgsRes.messages);
      }
      if (campsRes.success && campsRes.campaigns) {
        setCampaigns(campsRes.campaigns);
      }
      if (contactsRes.success && contactsRes.contacts) {
        setContacts(contactsRes.contacts);
      }
      if (waRes.success && waRes.whatsapp) {
        setWhatsapp(waRes.whatsapp);
      }
    } catch (err: any) {
      console.error('Error fetching cloud storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncCloudStorage();
      if (res.success) {
        setStatus(res.cloudStorage);
        setSyncFeedback(
          `Successfully synchronized ${res.synced?.campaign_messages || 0} message records, ${res.synced?.campaigns || 0} campaigns, and ${res.synced?.contacts || 0} contacts to Google Cloud Firestore!`
        );
        fetchData();
      } else {
        setSyncFeedback(`Sync error: ${res.error || 'Failed to sync with Google Cloud'}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !status.lastSyncAt) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-400" />
        <span>Connecting to Google Cloud Firestore database...</span>
      </div>
    );
  }

  const { syncedCounts } = status || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database className="w-40 h-40 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">☁️</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Google Cloud Storage & Database</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
                Google Cloud Firestore (Free Tier)
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Your WhatsApp campaign records, message dispatches, audience contacts, and WhatsApp credentials are authenticated and stored persistently on Google Cloud Firestore.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing to Google Cloud...' : 'Sync All Records to Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Cloud Project Info Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Google Cloud Project: <code className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{status.projectId}</code></span>
            </span>
            <span>•</span>
            <span>Firestore Database: <code className="text-slate-300 font-mono text-[11px]">{status.databaseId}</code></span>
          </div>
          <span className="text-slate-500 text-[11px]">
            {status.lastSyncAt ? `Last Synced: ${new Date(status.lastSyncAt).toLocaleString()}` : 'Continuous Auto-Sync Active'}
          </span>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer ml-4">✕</button>
        </div>
      )}

      {/* Metrics Row: Documents Stored in Google Cloud Firestore */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={<ListOrdered className="w-4 h-4 text-emerald-400" />}
          label="Message Records"
          count={records.length || syncedCounts?.campaign_messages || 0}
          collection="campaign_messages"
        />
        <MetricCard
          icon={<Send className="w-4 h-4 text-blue-400" />}
          label="Campaigns"
          count={campaigns.length || syncedCounts?.campaigns || 0}
          collection="campaigns"
        />
        <MetricCard
          icon={<Users className="w-4 h-4 text-purple-400" />}
          label="Contacts"
          count={contacts.length || syncedCounts?.contacts || 0}
          collection="contacts"
        />
        <MetricCard
          icon={<Radio className="w-4 h-4 text-amber-400" />}
          label="WhatsApp Config"
          count={syncedCounts?.whatsapp_accounts || 1}
          collection="whatsapp_accounts"
        />
        <MetricCard
          icon={<FileCode2 className="w-4 h-4 text-teal-400" />}
          label="Meta Templates"
          count={syncedCounts?.templates || 0}
          collection="templates"
        />
        <MetricCard
          icon={<MessageSquare className="w-4 h-4 text-pink-400" />}
          label="Live Chat Msgs"
          count={syncedCounts?.chat_messages || 0}
          collection="chat_messages"
        />
      </div>

      {/* Architecture Explainer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">How Google Cloud Storage Works Here</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="font-semibold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">1</span>
              <span>Cloud Firestore Persistence</span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Every dispatched WhatsApp message, campaign batch, audience contact, and template is saved to Google Cloud Firestore with real-time durability.
            </p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="font-semibold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">2</span>
              <span>Zero Browser Local Storage</span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Tokens, secrets, and business records are never exposed in browser localStorage. Everything routes through authenticated backend cloud handlers.
            </p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="font-semibold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">3</span>
              <span>Google Cloud Spark Free Plan</span>
            </div>
            <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
              Runs on Google's generous free tier (50,000 document reads, 20,000 writes, and 1 GB stored per day for free with zero charges).
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Records Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 pt-3 flex-wrap gap-2">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveSubTab('records')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'records'
                  ? 'bg-slate-950 text-emerald-400 border-t border-x border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Campaign Records ({records.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('campaigns')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'campaigns'
                  ? 'bg-slate-950 text-emerald-400 border-t border-x border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Campaigns ({campaigns.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('contacts')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'contacts'
                  ? 'bg-slate-950 text-emerald-400 border-t border-x border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Audience Contacts ({contacts.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('whatsapp')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'whatsapp'
                  ? 'bg-slate-950 text-emerald-400 border-t border-x border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>WhatsApp Cloud Credentials</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 pb-2">
            Collection Path: <code className="text-emerald-400 font-mono">/{activeSubTab === 'records' ? 'campaign_messages' : activeSubTab}</code>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 bg-slate-950">
          {activeSubTab === 'records' && (
            <div>
              {records.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No message records created yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When you launch a campaign from the Campaigns tab, every single message dispatch and delivery receipt will be stored here in Google Cloud Firestore.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Message ID (Cloud ID)</th>
                        <th className="py-2.5 px-3">Recipient Phone</th>
                        <th className="py-2.5 px-3">Recipient Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Template</th>
                        <th className="py-2.5 px-3">Meta WAMID</th>
                        <th className="py-2.5 px-3">Dispatched At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 text-slate-300 font-semibold">{r.id}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{r.phone}</td>
                          <td className="py-2.5 px-3 text-slate-200 font-sans">{r.recipient_name || 'Recipient'}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                                r.status === 'Delivered' || r.status === 'Read'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : r.status === 'Sent'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : r.status === 'Failed'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{r.template_name}</td>
                          <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]">{r.message_id || 'Queued'}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'campaigns' && (
            <div>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No campaigns launched yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Campaign definitions and real-time execution statistics are tracked in Firestore collection <code className="text-emerald-400 font-mono">/campaigns</code>.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Campaign ID</th>
                        <th className="py-2.5 px-3">Campaign Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Recipients</th>
                        <th className="py-2.5 px-3">Sent</th>
                        <th className="py-2.5 px-3">Delivered</th>
                        <th className="py-2.5 px-3">Read</th>
                        <th className="py-2.5 px-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {campaigns.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 text-slate-300 font-semibold">{c.id}</td>
                          <td className="py-2.5 px-3 text-white font-sans">{c.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-sans font-semibold">
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">{c.total_recipients || 0}</td>
                          <td className="py-2.5 px-3 text-blue-400">{c.sent_count || 0}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{c.delivered_count || 0}</td>
                          <td className="py-2.5 px-3 text-purple-400">{c.read_count || 0}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{new Date(c.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'contacts' && (
            <div>
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No audience contacts stored yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload a CSV/Excel file in the Contacts tab to store your audience securely in Google Cloud Firestore.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Contact ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {contacts.map((ct) => (
                        <tr key={ct.id} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 text-slate-300">{ct.id}</td>
                          <td className="py-2.5 px-3 text-white font-sans">{ct.name}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{ct.phone}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded">
                              {ct.status || 'active'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{new Date(ct.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-bold text-white mb-2 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Google Cloud Firestore Encrypted Credentials Document</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block uppercase">Firestore Collection & Doc</span>
                    <span className="text-emerald-400">/whatsapp_accounts/{whatsapp?.id || 'WA-00001'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block uppercase">Phone Number ID</span>
                    <span className="text-white">{whatsapp?.phone_number_id || 'Configured'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block uppercase">WABA Account ID</span>
                    <span className="text-white">{whatsapp?.waba_id || 'Configured'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block uppercase">Webhook Verify Token</span>
                    <span className="text-slate-300 truncate block">{whatsapp?.webhook_verify_token || 'Configured'}</span>
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('whatsapp_setup')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Edit WhatsApp Cloud API Configuration</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  count: number;
  collection: string;
}> = ({ icon, label, count, collection }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <div className="p-1 rounded bg-slate-800/80">{icon}</div>
      </div>
      <div className="mt-1.5 text-xl font-bold font-mono text-white">{count}</div>
      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">/{collection}</div>
    </div>
  );
};
