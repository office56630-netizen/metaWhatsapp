import React from 'react';
import {
  X,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Download,
  Calendar,
  Send,
  Users
} from 'lucide-react';
import { Campaign } from '../../types';

interface CampaignReportModalProps {
  campaign: Campaign;
  onClose: () => void;
  onExport: (format: 'csv' | 'xlsx') => void;
}

export const CampaignReportModal: React.FC<CampaignReportModalProps> = ({ campaign, onClose, onExport }) => {
  const sent = campaign.sent_count || 0;
  const delivered = campaign.delivered_count || 0;
  const read = campaign.read_count || 0;
  const failed = campaign.failed_count || 0;
  const total = campaign.total_recipients || 1;

  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
  const failureRate = sent > 0 ? Math.round((failed / sent) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-emerald-400 font-bold text-xs">{campaign.id}</span>
              <span className="text-white font-bold text-base">{campaign.name}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Template: <span className="font-mono text-slate-300">{campaign.template_name}</span> • Type: <span className="capitalize text-slate-300">{campaign.type}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Total Recipients</span>
              <p className="text-xl font-bold font-mono text-white mt-1">{total}</p>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Messages Sent</span>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{sent}</p>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Delivered</span>
              <p className="text-xl font-bold font-mono text-blue-400 mt-1">{delivered}</p>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Read by Users</span>
              <p className="text-xl font-bold font-mono text-teal-400 mt-1">{read}</p>
            </div>
          </div>

          {/* Performance Rate Bars */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-semibold text-white">Campaign Conversion & Delivery Ratios</h4>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Delivery Success Rate</span>
                </span>
                <span className="font-bold text-white font-mono">{deliveryRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${deliveryRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Read Rate (Opens)</span>
                </span>
                <span className="font-bold text-white font-mono">{readRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${readRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Failure / Bounce Rate</span>
                </span>
                <span className="font-bold text-white font-mono">{failureRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full"
                  style={{ width: `${failureRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Timestamps and Meta Info */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-500">Started At:</span>
              <p className="text-slate-300 font-mono mt-0.5">
                {campaign.started_at ? new Date(campaign.started_at).toLocaleString() : 'Pending'}
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-500">Completed At:</span>
              <p className="text-slate-300 font-mono mt-0.5">
                {campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : 'In Progress'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Status: <strong className="text-emerald-400 uppercase">{campaign.status}</strong>
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExport('csv')}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => onExport('xlsx')}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
