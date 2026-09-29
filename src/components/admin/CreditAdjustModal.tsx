import React, { useState } from 'react';
import { CreditCard, X, Sparkles, Coins, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { Client } from '../../types';

interface CreditAdjustModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreditAdjustModal: React.FC<CreditAdjustModalProps> = ({ client, onClose, onSuccess }) => {
  const [creditType, setCreditType] = useState<'marketing' | 'utility'>('marketing');
  const [amount, setAmount] = useState<string>('5000');
  const [description, setDescription] = useState<string>('Super Admin quota adjustment');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount === 0) {
      setError('Please provide a valid non-zero adjustment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.adjustCredits(client.id, {
        credit_type: creditType,
        amount: numAmount,
        description
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to adjust credits');
      }
    } catch (err: any) {
      setError(err.message || 'Error adjusting credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Adjust Tenant Credits</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <span className="text-slate-400 block mb-1">Target Client Account</span>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-semibold text-white flex justify-between">
              <span>{client.company_name}</span>
              <span className="font-mono text-emerald-400">{client.id}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Select Credit Balance *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreditType('marketing')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  creditType === 'marketing'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Marketing</span>
                </div>
                <p className="text-[10px] text-slate-400">Current: {client.marketing_credits.toLocaleString()}</p>
              </button>

              <button
                type="button"
                onClick={() => setCreditType('utility')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  creditType === 'utility'
                    ? 'bg-blue-950/40 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-1">
                  <Coins className="w-4 h-4" />
                  <span>Utility</span>
                </div>
                <p className="text-[10px] text-slate-400">Current: {client.utility_credits.toLocaleString()}</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Adjustment Amount (+ to add, - to deduct) *
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000 or -2000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Ledger Reason / Description *</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for granting or adjusting credits"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? 'Adjusting...' : 'Commit Credit Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
