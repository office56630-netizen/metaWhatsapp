import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, UserCheck, Clock } from 'lucide-react';
import { api } from '../../api';
import { AuditLog, AdminImpersonationLog } from '../../types';

export const AdminAuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [impersonationLogs, setImpersonationLogs] = useState<AdminImpersonationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminLogs();
      if (res.success) {
        setAuditLogs(res.audit_logs);
        setImpersonationLogs(res.impersonation_logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span>Platform Security & Impersonation Audit Trails</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable records of critical tenant operations, credit adjustments, and admin logins.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Impersonation Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Super Admin Client Impersonation ("Login as Client") Ledger</span>
        </h3>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Admin Email</th>
                <th className="py-2.5 px-4">Impersonated Client</th>
                <th className="py-2.5 px-4">Login Time</th>
                <th className="py-2.5 px-4">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {impersonationLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No impersonation sessions recorded yet.
                  </td>
                </tr>
              ) : (
                impersonationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-purple-300 font-semibold">{log.admin_email}</td>
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {log.client_company} <span className="font-mono text-slate-400 text-[11px]">({log.client_id})</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-300 text-[11px]">
                      {new Date(log.login_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* General System Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm">System Operations Audit Log</h3>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Tenant Scope</th>
                <th className="py-2.5 px-4">Details</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-400 text-[11px]">{log.action}</td>
                  <td className="py-2.5 px-4 text-white font-medium">{log.user_name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {log.client_id ? log.client_id : 'System-Wide'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-sm truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
