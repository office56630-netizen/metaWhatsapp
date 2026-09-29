import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Radio,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../api';
import { WebhookLog, CampaignMessage } from '../../types';

export const WebhookSimulator: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator controls
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [targetStatus, setTargetStatus] = useState<'Delivered' | 'Read' | 'Failed'>('Delivered');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [lRes, mRes] = await Promise.all([
        api.getAdminLogs(),
        api.getCampaignRecords({ limit: 20 })
      ]);
      if (lRes.success) setLogs(lRes.webhook_logs);
      if (mRes.success) {
        setMessages(mRes.messages.filter((m: any) => m.message_id));
        if (mRes.messages.length > 0 && !selectedMessageId) {
          const firstWithId = mRes.messages.find((m: any) => m.message_id);
          if (firstWithId) setSelectedMessageId(firstWithId.message_id);
        }
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

  const handleFireWebhook = async () => {
    if (!selectedMessageId) return;
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await api.simulateWebhookStatus(selectedMessageId, targetStatus);
      setSimResult(res);
      fetchLogs();
    } catch (err: any) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Meta Webhook Processing & Live Simulator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Test incoming Meta Cloud API status notifications and monitor delivery status reconciliation.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Interactive Simulator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Simulate Meta Webhook Delivery Event</h3>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
            POST /api/v1/webhook Simulator
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Select an active message dispatched via Meta Cloud API and simulate an incoming status change callback to verify that the message status, delivery timestamps, and campaign counters update automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="md:col-span-2">
            <label className="block text-slate-400 mb-1 font-medium">Target Message (Meta WAMID)</label>
            <select
              value={selectedMessageId}
              onChange={(e) => setSelectedMessageId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
            >
              {messages.map((m) => (
                <option key={m.id} value={m.message_id || m.id}>
                  {m.recipient_name} ({m.phone}) • Current: {m.status} • {m.message_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">New Status Event</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 font-semibold"
            >
              <option value="Delivered">Delivered (Double Gray Tick)</option>
              <option value="Read">Read (Double Blue Tick)</option>
              <option value="Failed">Failed (Undeliverable / Error)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleFireWebhook}
            disabled={isSimulating || !selectedMessageId}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Webhook Event...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Fire Status Update Callback</span>
              </>
            )}
          </button>
        </div>

        {simResult && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
            ✓ Webhook successfully processed. Message status transitioned to <strong>{targetStatus}</strong>.
          </div>
        )}
      </div>

      {/* Webhook Activity Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm">Recent Meta Webhook Ingestion Log</h3>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Message ID</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No webhook events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{log.id}</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">{log.event_type}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                      {log.message_id || 'N/A'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
