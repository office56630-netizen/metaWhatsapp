import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Clock } from 'lucide-react';
import { api } from '../../api';
import { ApiLog } from '../../types';

export const ApiLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getApiLogs();
      if (res.success) setLogs(res.logs);
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Client API Request Activity</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs of incoming REST API calls, execution latency, and HTTP response codes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Request ID</th>
              <th className="py-3 px-4">Method & Endpoint</th>
              <th className="py-3 px-4">Status Code</th>
              <th className="py-3 px-4">Client IP</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  No API requests recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-400">{log.request_id}</td>
                  <td className="py-3 px-4 font-mono">
                    <span className="text-emerald-400 font-bold mr-1.5">{log.method}</span>
                    <span className="text-white">{log.endpoint}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        log.status_code === 200
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.status_code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{log.ip}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{log.execution_time_ms} ms</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
