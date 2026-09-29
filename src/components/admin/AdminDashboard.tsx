import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Send,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Sparkles,
  Coins,
  Terminal,
  ShieldCheck,
  RefreshCw,
  LogIn,
  KeyRound,
  Radio
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../types';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenWhatsAppConfig: (client: Client) => void;
  onOpenCreditAdjust: (client: Client) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenWhatsAppConfig,
  onOpenCreditAdjust
}) => {
  const { impersonateClient } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      if (res.success) setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-purple-400" />
        <span>Loading platform metrics...</span>
      </div>
    );
  }

  const { stats, clients = [], plans = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Super Admin Platform Operations</h1>
            <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 font-medium">
              Multi-Tenant Architecture
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global management over all isolated client workspaces, Meta Cloud API connections, plans, and credits.
          </p>
        </div>

        <button
          onClick={fetchAdminDashboard}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Top Global KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Clients</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {stats?.total_clients || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-medium">{stats?.active_clients || 0} Active</span> •{' '}
            <span className="text-rose-400">{stats?.suspended_clients || 0} Suspended</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Broadcasts</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {stats?.total_campaigns || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.messages_sent?.toLocaleString() || 0} Messages Dispatched
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Messages Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {stats?.messages_delivered?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.messages_read?.toLocaleString() || 0} Read by Users
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total API Requests</span>
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {stats?.api_requests?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Client Developer Invocations</p>
        </div>
      </div>

      {/* Credit Utilization across platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-800/30 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Marketing Credits Used</span>
              <p className="text-2xl font-extrabold font-mono text-emerald-300 mt-0.5">
                {stats?.marketing_credits_used?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
            Platform Consumption
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-950/30 to-slate-900 border border-blue-800/30 p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Utility Credits Used</span>
              <p className="text-2xl font-extrabold font-mono text-blue-300 mt-0.5">
                {stats?.utility_credits_used?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">
            Platform Consumption
          </span>
        </div>
      </div>

      {/* Clients Quick Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client Accounts Overview</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Super Admin can impersonate any client or configure WhatsApp Cloud API credentials.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('admin_clients')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
          >
            Manage All Clients →
          </button>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client ID & Name</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Marketing Credits</th>
                <th className="py-3 px-4 text-center">Utility Credits</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {clients.map((c: Client) => {
                const plan = plans.find((p: any) => p.id === c.plan_id);
                return (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{c.company_name}</div>
                      <div className="text-[11px] font-mono text-purple-400 mt-0.5">{c.id} • {c.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        {plan?.name || c.plan_id}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                      {c.marketing_credits.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-400">
                      {c.utility_credits.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => impersonateClient(c.id)}
                          className="flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer border border-amber-500/30"
                          title="Impersonate and login into this client account"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login As Client</span>
                        </button>

                        <button
                          onClick={() => onOpenWhatsAppConfig(c)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"
                          title="WhatsApp Credentials"
                        >
                          <Radio className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenCreditAdjust(c)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400"
                          title="Adjust Credits"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
