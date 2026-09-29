import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  XCircle,
  BarChart3,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api';
import { Campaign } from '../../types';
import { CampaignWizard } from './CampaignWizard';
import { CampaignReportModal } from './CampaignReportModal';

interface CampaignsListProps {
  onViewRecords: (campaignId: string) => void;
}

export const CampaignsList: React.FC<CampaignsListProps> = ({ onViewRecords }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedReportCampaign, setSelectedReportCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns();
      if (res.success) {
        setCampaigns(res.campaigns);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // Auto-refresh every 5 seconds to track queue processing
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePause = async (id: string) => {
    await api.pauseCampaign(id);
    fetchCampaigns();
  };

  const handleResume = async (id: string) => {
    await api.resumeCampaign(id);
    fetchCampaigns();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this campaign? Remaining un-sent messages will be refunded to your credit balance.')) {
      return;
    }
    await api.cancelCampaign(id);
    fetchCampaigns();
  };

  const handleExport = (campaignId: string, format: 'csv' | 'xlsx') => {
    window.location.href = `/api/client/campaign-records/export?campaignId=${campaignId}&format=${format}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <span>Campaign Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor bulk broadcasts, queue progress, live delivery stats, and automated reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchCampaigns}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Recipients</th>
                <th className="py-3 px-4 text-center">Sent</th>
                <th className="py-3 px-4 text-center">Delivered</th>
                <th className="py-3 px-4 text-center">Read</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No campaigns launched yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "Create Campaign" to launch your first WhatsApp bulk broadcast.
                    </p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{camp.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                        <span className="text-emerald-400">{camp.id}</span>
                        <span>•</span>
                        <span>{camp.template_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[10px] uppercase font-medium">
                        {camp.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      {camp.total_recipients.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">
                      {camp.sent_count.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-blue-400 font-semibold">
                      {camp.delivered_count.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-teal-400 font-semibold">
                      {camp.read_count.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          camp.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : camp.status === 'Running' || camp.status === 'Processing'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : camp.status === 'Paused'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : camp.status === 'Scheduled'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {camp.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {camp.status === 'Running' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {camp.status === 'Scheduled' && <Clock className="w-3 h-3" />}
                        <span>{camp.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(camp.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {camp.status === 'Running' && (
                          <button
                            onClick={() => handlePause(camp.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400"
                            title="Pause Campaign"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {camp.status === 'Paused' && (
                          <button
                            onClick={() => handleResume(camp.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-emerald-400"
                            title="Resume Campaign"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(camp.status === 'Running' || camp.status === 'Paused' || camp.status === 'Scheduled') && (
                          <button
                            onClick={() => handleCancel(camp.id)}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400"
                            title="Cancel Campaign & Refund"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedReportCampaign(camp)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                          title="View Campaign Analytics"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onViewRecords(camp.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400"
                          title="Inspect Message Records"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExport(camp.id, 'csv')}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400"
                          title="Download CSV Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Launch Wizard Modal */}
      {isWizardOpen && (
        <CampaignWizard
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            fetchCampaigns();
          }}
        />
      )}

      {/* Campaign Report Analytics Modal */}
      {selectedReportCampaign && (
        <CampaignReportModal
          campaign={selectedReportCampaign}
          onClose={() => setSelectedReportCampaign(null)}
          onExport={(format) => handleExport(selectedReportCampaign.id, format)}
        />
      )}
    </div>
  );
};
