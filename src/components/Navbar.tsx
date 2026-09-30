import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowLeft,
  Building2,
  ChevronDown,
  Sparkles,
  Zap,
  Coins,
  LogOut,
  UserCheck,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, client, isImpersonating, returnToSuperAdmin, quickSwitchWorkspace, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      {/* Impersonation Notice Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-1.5 font-medium text-xs flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>
              <strong>Super Admin Impersonation:</strong> You are currently logged into <strong>{client?.company_name}</strong> ({client?.id}). Actions will be logged in platform audit records.
            </span>
          </div>
          <button
            onClick={() => returnToSuperAdmin()}
            className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 px-2.5 py-1 rounded text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Super Admin</span>
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand & Meta Status & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white">Meta WABA Cloud</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-500/30">
                  v21.0 API
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Multi-Client WhatsApp Campaign SaaS</p>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-2 hidden sm:block" />

          {/* Current Workspace Tag */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">
              {user?.role === 'super_admin' ? 'Super Admin Portal' : client?.company_name || 'Client Workspace'}
            </span>
            {client?.id && (
              <span className="text-[10px] font-mono text-slate-400">({client.id})</span>
            )}
          </div>
        </div>

        {/* Right: Credits pills + Workspace Switcher */}
        <div className="flex items-center space-x-3">
          {/* Client Credit Badges */}
          {client && (
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 px-2.5 py-1 rounded-full text-xs" title="Marketing message credits">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">Marketing:</span>
                <span className="font-bold font-mono">{client.marketing_credits?.toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-1.5 bg-blue-950/60 border border-blue-800/50 text-blue-300 px-2.5 py-1 rounded-full text-xs" title="Utility message credits">
                <Coins className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium">Utility:</span>
                <span className="font-bold font-mono">{client.utility_credits?.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Quick Demo Workspace Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Workspace:</span>
              <span className="font-semibold text-white">
                {user?.role === 'super_admin' ? 'Super Admin' : client?.company_name?.split(' ')[0] || 'Client'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  Switch Active Persona
                </div>

                <button
                  onClick={() => { quickSwitchWorkspace('admin'); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <div>
                      <p className="font-medium text-white">Super Admin</p>
                      <p className="text-[10px] text-slate-400">admin@whatsappplatform.io</p>
                    </div>
                  </div>
                  {user?.role === 'super_admin' && !isImpersonating && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <div className="my-1 border-t border-slate-700/60" />
                <div className="px-3 py-1 text-[10px] font-medium text-slate-400">Tenants (Isolated Accounts):</div>

                <button
                  onClick={() => { quickSwitchWorkspace('CLT-00001'); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="font-medium text-white">ABC Salon & Spa</p>
                      <p className="text-[10px] text-slate-400">CLT-00001 • Growth Plan</p>
                    </div>
                  </div>
                  {client?.id === 'CLT-00001' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <button
                  onClick={() => { quickSwitchWorkspace('CLT-00002'); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="font-medium text-white">Zen Retail Fashion</p>
                      <p className="text-[10px] text-slate-400">CLT-00002 • Enterprise</p>
                    </div>
                  </div>
                  {client?.id === 'CLT-00002' && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <button
                  onClick={() => { quickSwitchWorkspace('CLT-00003'); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div>
                      <p className="font-medium text-white">Apex Health Care</p>
                      <p className="text-[10px] text-slate-400">CLT-00003 • Starter</p>
                    </div>
                  </div>
                  {client?.id === 'CLT-00003' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>

                <div className="my-1 border-t border-slate-700/60" />

                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-400 flex items-center space-x-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Reset / Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
