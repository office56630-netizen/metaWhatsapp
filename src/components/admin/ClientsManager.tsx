import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Radio,
  Coins,
  LogIn,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Client, Plan } from '../../types';

interface ClientsManagerProps {
  onOpenWhatsAppConfig: (client: Client) => void;
  onOpenCreditAdjust: (client: Client) => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  onOpenWhatsAppConfig,
  onOpenCreditAdjust
}) => {
  const { impersonateClient } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // New Client Form
  const [newClientData, setNewClientData] = useState({
    company_name: '',
    email: '',
    phone: '',
    plan_id: 'plan_growth',
    initial_marketing_credits: 30000,
    initial_utility_credits: 20000
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      if (res.success) {
        setClients(res.clients);
        setPlans(res.plans);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createClient(newClientData);
      if (res.success) {
        setIsAddModalOpen(false);
        setNewClientData({
          company_name: '',
          email: '',
          phone: '',
          plan_id: 'plan_growth',
          initial_marketing_credits: 30000,
          initial_utility_credits: 20000
        });
        fetchClients();
      } else {
        alert(res.error || 'Failed to create client');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const nextStatus = client.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change status of ${client.company_name} to ${nextStatus}?`)) return;
    await api.updateClient(client.id, { status: nextStatus });
    fetchClients();
  };

  const handleToggleApiStatus = async (client: Client) => {
    const nextStatus = client.api_status === 'active' ? 'suspended' : 'active';
    await api.updateClient(client.id, { api_status: nextStatus });
    fetchClients();
  };

  const filtered = clients.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span>Client Accounts & Tenant Isolation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Provision client companies, configure Meta WhatsApp credentials, allocate credits, and manage API tokens.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchClients}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Client Account</span>
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by company name, client ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <span className="text-slate-400 text-xs">
          Showing <strong className="text-white">{filtered.length}</strong> clients
        </span>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client ID & Company</th>
                <th className="py-3 px-4">Plan & Quota</th>
                <th className="py-3 px-4 text-center">Marketing Credits</th>
                <th className="py-3 px-4 text-center">Utility Credits</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">API Access</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((c) => {
                const plan = plans.find((p) => p.id === c.plan_id);
                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{c.company_name}</div>
                      <div className="text-[11px] font-mono text-purple-400 mt-0.5">
                        {c.id} • {c.email}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{plan?.name || c.plan_id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Limit: {c.campaign_message_limit?.toLocaleString()} msgs
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                      {c.marketing_credits?.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-400">
                      {c.utility_credits?.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                        title="Click to suspend or activate"
                      >
                        {c.status.toUpperCase()}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleApiStatus(c)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono cursor-pointer ${
                          c.api_status === 'active'
                            ? 'bg-purple-500/15 text-purple-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                        title="Click to toggle API access"
                      >
                        {c.api_status}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => impersonateClient(c.id)}
                          className="flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border border-amber-500/30"
                          title="Impersonate into this client account"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login As Client</span>
                        </button>

                        <button
                          onClick={() => onOpenWhatsAppConfig(c)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 cursor-pointer"
                          title="Configure WhatsApp Cloud API"
                        >
                          <Radio className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenCreditAdjust(c)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 cursor-pointer"
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

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">Provision New Client Tenant</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Clinic"
                  value={newClientData.company_name}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, company_name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={newClientData.email}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, email: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">WhatsApp Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+15550198273"
                    value={newClientData.phone}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, phone: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subscription Plan *</label>
                <select
                  value={newClientData.plan_id}
                  onChange={(e) => {
                    const sel = plans.find((p) => p.id === e.target.value);
                    setNewClientData({
                      ...newClientData,
                      plan_id: e.target.value,
                      initial_marketing_credits: sel ? sel.initial_marketing_credits : 30000,
                      initial_utility_credits: sel ? sel.initial_utility_credits : 20000
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-purple-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.monthly_price}/mo - {p.message_limit.toLocaleString()} msgs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Initial Marketing Credits</label>
                  <input
                    type="number"
                    value={newClientData.initial_marketing_credits}
                    onChange={(e) =>
                      setNewClientData({
                        ...newClientData,
                        initial_marketing_credits: parseInt(e.target.value, 10)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Initial Utility Credits</label>
                  <input
                    type="number"
                    value={newClientData.initial_utility_credits}
                    onChange={(e) =>
                      setNewClientData({
                        ...newClientData,
                        initial_utility_credits: parseInt(e.target.value, 10)
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  Provision Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
