import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Sparkles,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../api';
import { CreditTransaction } from '../../types';

export const CreditLedger: React.FC = () => {
  const [balances, setBalances] = useState<any>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const res = await api.getCredits();
      if (res.success) {
        setBalances(res.balances);
        setTransactions(res.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const filtered = transactions.filter(
    (t) => filterType === 'ALL' || t.credit_type.toUpperCase() === filterType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Dual Credit Ledger & Balance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Meta WhatsApp compliance enforces separate balances for Marketing and Utility messaging.
          </p>
        </div>

        <button
          onClick={fetchCredits}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Marketing Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 p-6 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Marketing Credits</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
              Dedicated Balance
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {balances?.marketing_credits?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Available for marketing campaigns</p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <span>Consumed: </span>
              <strong className="text-slate-200">{balances?.marketing_credits_used?.toLocaleString() || '0'}</strong>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/30 text-[11px] text-emerald-300/90 leading-relaxed">
            Meta classifies promotional offers, product alerts, and festive greetings as Marketing messages.
          </div>
        </div>

        {/* Utility Card */}
        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/40 p-6 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-400">
              <Coins className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Utility Message Credits</span>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
              Dedicated Balance
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {balances?.utility_credits?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Available for order updates & reminders</p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <span>Consumed: </span>
              <strong className="text-slate-200">{balances?.utility_credits_used?.toLocaleString() || '0'}</strong>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-950/30 rounded-xl border border-blue-800/30 text-[11px] text-blue-300/90 leading-relaxed">
            Utility credits power appointment confirmations, dispatch tracking, OTPs, and account status alerts.
          </div>
        </div>
      </div>

      {/* Credit Transactions Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Credit Transaction History
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Audited records of every credit grant, campaign deduction, adjustment, and refund.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setFilterType('MARKETING')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'MARKETING' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Marketing
            </button>
            <button
              onClick={() => setFilterType('UTILITY')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'UTILITY' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Utility
            </button>
          </div>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Credit Type</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Before → After</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions recorded for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">{t.id}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                          t.credit_type === 'marketing'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {t.credit_type.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-white">{t.transaction_type}</td>

                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.amount > 0 ? `+${t.amount.toLocaleString()}` : t.amount.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {t.balance_before.toLocaleString()} → <strong className="text-white">{t.balance_after.toLocaleString()}</strong>
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
