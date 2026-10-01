import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database
} from 'lucide-react';
import { api } from '../../api';
import { CampaignMessage, Campaign } from '../../types';

interface CampaignRecordsProps {
  initialCampaignId?: string;
}

export const CampaignRecords: React.FC<CampaignRecordsProps> = ({ initialCampaignId }) => {
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [campaignFilter, setCampaignFilter] = useState<string>(initialCampaignId || '');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaignRecords({
        campaignId: campaignFilter || undefined,
        status: statusFilter || undefined,
        phone: phoneSearch || undefined,
        limit: pageSize,
        offset: page * pageSize
      });
      if (res.success) {
        setMessages(res.messages);
        setTotal(res.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getCampaigns().then(res => {
      if (res.success) setCampaigns(res.campaigns);
    });
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [campaignFilter, statusFilter, phoneSearch, page]);

  const handleExport = (status?: string, format: 'csv' | 'xlsx' = 'csv') => {
    const q = new URLSearchParams();
    if (campaignFilter) q.set('campaignId', campaignFilter);
    if (status || statusFilter) q.set('status', status || statusFilter);
    q.set('format', format);
    window.location.href = `/api/client/campaign-records/export?${q.toString()}`;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-emerald-400" />
            <span>Campaign Delivery Records</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual message audit trails, Meta WAMID tracking, and real-time delivery lifecycle.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              await api.syncCloudStorage();
              fetchRecords();
            }}
            className="flex items-center space-x-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
            title="Synchronize all campaign records to Google Cloud Firestore database"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync to Google Cloud</span>
          </button>
          <button
            onClick={() => handleExport(undefined, 'csv')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All (CSV)</span>
          </button>
          <button
            onClick={() => handleExport(undefined, 'xlsx')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Excel</span>
          </button>
          <button
            onClick={() => handleExport('Failed', 'csv')}
            className="flex items-center space-x-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Download Failed</span>
          </button>
        </div>
      </div>

      {/* Google Cloud Firestore Storage Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Database Storage: <strong className="text-white">Google Cloud Firestore</strong> (Free Tier) • Collection: <code className="text-emerald-400 font-mono text-[11px]">/campaign_messages</code>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Project: gleaming-dispatch-1kx2q
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Phone search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search phone or name..."
              value={phoneSearch}
              onChange={(e) => { setPhoneSearch(e.target.value); setPage(0); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Campaign Filter */}
          <select
            value={campaignFilter}
            onChange={(e) => { setCampaignFilter(e.target.value); setPage(0); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="Queued">Queued</option>
            <option value="Sent">Sent</option>
            <option value="Delivered">Delivered</option>
            <option value="Read">Read</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <button
          onClick={fetchRecords}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Message Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Campaign & Template</th>
                <th className="py-3 px-4">Meta Message ID (WAMID)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sent Time</th>
                <th className="py-3 px-4">Delivered</th>
                <th className="py-3 px-4">Read</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading message delivery records...</span>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ListOrdered className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No records match filters</p>
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.recipient_name}</div>
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span>{m.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{m.campaign_id}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.template_name}</div>
                    </td>

                    <td className="py-3 px-4 max-w-[220px]">
                      {m.message_id ? (
                        <span
                          className="font-mono text-[10px] text-slate-400 truncate block bg-slate-950 px-2 py-1 rounded border border-slate-850"
                          title={m.message_id}
                        >
                          {m.message_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Pending WAMID</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          m.status === 'Read'
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : m.status === 'Delivered'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : m.status === 'Sent'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : m.status === 'Queued'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {m.status === 'Read' && <Eye className="w-3 h-3" />}
                        {m.status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                        {m.status === 'Failed' && <AlertCircle className="w-3 h-3" />}
                        <span>{m.status}</span>
                      </span>
                      {m.error_message && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-[150px] truncate" title={m.error_message}>
                          {m.error_message}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : '-'}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {m.delivered_at ? new Date(m.delivered_at).toLocaleTimeString() : '-'}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {m.read_at ? new Date(m.read_at).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{messages.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> total messages
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page + 1 >= totalPages}
              className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
