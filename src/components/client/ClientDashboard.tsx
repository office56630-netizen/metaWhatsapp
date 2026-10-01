import React, { useEffect, useState } from 'react';
import {
  Users,
  Send,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Sparkles,
  Coins,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Radio,
  Database
} from 'lucide-react';
import { api } from '../../api';

interface ClientDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getClientDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading workspace metrics...</span>
      </div>
    );
  }

  const { client, plan, whatsapp, overview } = data || {};

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{client?.company_name}</h1>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
              {plan?.name || 'Active Plan'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tenant ID: <span className="font-mono text-slate-300 font-semibold">{client?.id}</span> • Connected WhatsApp: <span className="text-slate-300">{whatsapp?.display_name} ({whatsapp?.phone_number})</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('whatsapp_setup')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Cloud API Setup</span>
          </button>
          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Live Chat</span>
          </button>
          <button
            onClick={() => onNavigate('campaigns')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
          <button
            onClick={() => onNavigate('contacts')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Contacts</span>
          </button>
        </div>
      </div>

      {/* Credit Cards & Plan Limits (Two-Credit System) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Marketing Credits Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Marketing Credits</span>
            </div>
            <button
              onClick={() => onNavigate('credits')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-0.5 cursor-pointer font-medium"
            >
              <span>Ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {overview?.marketing_credits?.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used: <span className="font-mono text-slate-300">{overview?.marketing_credits_used?.toLocaleString()}</span> credits
            </p>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((overview?.marketing_credits || 1) /
                    ((overview?.marketing_credits || 1) + (overview?.marketing_credits_used || 0))) *
                    100
                )}%`
              }}
            />
          </div>
        </div>

        {/* Utility Credits Card */}
        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/40 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-400">
              <Coins className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Utility Credits</span>
            </div>
            <button
              onClick={() => onNavigate('credits')}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5 cursor-pointer font-medium"
            >
              <span>Ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {overview?.utility_credits?.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used: <span className="font-mono text-slate-300">{overview?.utility_credits_used?.toLocaleString()}</span> credits
            </p>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((overview?.utility_credits || 1) /
                    ((overview?.utility_credits || 1) + (overview?.utility_credits_used || 0))) *
                    100
                )}%`
              }}
            />
          </div>
        </div>

        {/* Plan Message Quota Bar */}
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-purple-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Message Quota</span>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
              Monthly Limit
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {overview?.campaign_messages_remaining?.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Limit: <span className="font-mono text-slate-300">{overview?.campaign_message_limit?.toLocaleString()}</span> total messages
            </p>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((overview?.campaign_messages_remaining || 0) / (overview?.campaign_message_limit || 1)) * 100
                )}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-400" />}
          label="Total Contacts"
          value={overview?.total_contacts?.toLocaleString()}
          subtext={`${overview?.total_groups || 0} Groups`}
          onClick={() => onNavigate('contacts')}
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-emerald-400" />}
          label="Messages Sent"
          value={overview?.messages_sent?.toLocaleString()}
          subtext={`${overview?.total_campaigns || 0} Campaigns`}
          onClick={() => onNavigate('records')}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-blue-400" />}
          label="Delivered"
          value={overview?.messages_delivered?.toLocaleString()}
          subtext={`${overview?.delivery_rate || 0}% Delivery Rate`}
          onClick={() => onNavigate('records')}
        />
        <StatCard
          icon={<Eye className="w-5 h-5 text-teal-400" />}
          label="Read by Recipients"
          value={overview?.messages_read?.toLocaleString()}
          subtext={`${overview?.read_rate || 0}% Read Rate`}
          onClick={() => onNavigate('records')}
        />
      </div>

      {/* Quick Actions & Meta Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Campaign Quick Launch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('campaigns')}
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 transition-all text-left flex items-start space-x-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Create Bulk Campaign
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Launch template campaign to contact groups or uploaded CSV file.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('contacts')}
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 transition-all text-left flex items-start space-x-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Manage Contacts & Groups
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Organize customers into segments and enforce phone deduplication.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('templates')}
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 transition-all text-left flex items-start space-x-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors">
                  View Meta Templates
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Approved Marketing and Utility templates with dynamic variable slots.
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('api')}
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 transition-all text-left flex items-start space-x-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                  Developer API & Token
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Integrate your backend via REST endpoints with copyable code snippets.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Official Meta WABA Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Meta API Status</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{whatsapp?.status || 'CONNECTED'}</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Quality Rating:</span>
                <span className="font-semibold text-emerald-400">{whatsapp?.quality_rating || 'GREEN (High)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone Number ID:</span>
                <span className="font-mono text-slate-300 text-[11px]">{whatsapp?.phone_number_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WABA Account ID:</span>
                <span className="font-mono text-slate-300 text-[11px]">{whatsapp?.waba_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Meta API Version:</span>
                <span className="font-mono text-slate-300 text-[11px]">v21.0 Cloud API</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-emerald-400/90 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Dedicated tenant token isolation is actively enforced.</span>
            </div>

            <button
              onClick={() => onNavigate('whatsapp_setup')}
              className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure WhatsApp Cloud API</span>
            </button>

            <button
              onClick={() => onNavigate('cloud_storage')}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Cloud Storage & Records</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  subtext?: string;
  onClick?: () => void;
}> = ({ icon, label, value, subtext, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition-all ${
        onClick ? 'cursor-pointer hover:bg-slate-850' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <div className="p-1.5 rounded-lg bg-slate-800">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
        {value || '0'}
      </div>
      {subtext && <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
};
