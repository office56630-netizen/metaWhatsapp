import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  FileCode2,
  Send,
  ListOrdered,
  BarChart3,
  CreditCard,
  KeyRound,
  FileSpreadsheet,
  Terminal,
  ShieldCheck,
  Building2,
  Radio,
  FileCheck2,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ClientTab =
  | 'dashboard'
  | 'chat'
  | 'contacts'
  | 'groups'
  | 'templates'
  | 'campaigns'
  | 'records'
  | 'reports'
  | 'credits'
  | 'api'
  | 'api_logs'
  | 'download_templates';

export type AdminTab =
  | 'admin_dashboard'
  | 'admin_clients'
  | 'admin_whatsapp'
  | 'admin_campaigns'
  | 'admin_webhook_simulator'
  | 'admin_audit_logs';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] text-slate-300">
      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* SUPER ADMIN NAVIGATION */}
        {isSuperAdmin ? (
          <div>
            <div className="px-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Super Admin Portal</span>
              <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.2 rounded font-mono">
                Platform
              </span>
            </div>
            <nav className="space-y-1">
              <NavItem
                active={activeTab === 'admin_dashboard'}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="System Dashboard"
                onClick={() => onSelectTab('admin_dashboard')}
              />
              <NavItem
                active={activeTab === 'admin_clients'}
                icon={<Building2 className="w-4 h-4" />}
                label="Clients Management"
                onClick={() => onSelectTab('admin_clients')}
              />
              <NavItem
                active={activeTab === 'admin_whatsapp'}
                icon={<Radio className="w-4 h-4" />}
                label="WhatsApp Credentials"
                onClick={() => onSelectTab('admin_whatsapp')}
              />
              <NavItem
                active={activeTab === 'admin_campaigns'}
                icon={<Send className="w-4 h-4" />}
                label="All Client Campaigns"
                onClick={() => onSelectTab('admin_campaigns')}
              />
              <NavItem
                active={activeTab === 'admin_webhook_simulator'}
                icon={<Terminal className="w-4 h-4" />}
                label="Webhook Simulator"
                badge="Test Tool"
                onClick={() => onSelectTab('admin_webhook_simulator')}
              />
              <NavItem
                active={activeTab === 'admin_audit_logs'}
                icon={<ShieldCheck className="w-4 h-4" />}
                label="Audit & Impersonation"
                onClick={() => onSelectTab('admin_audit_logs')}
              />
            </nav>
          </div>
        ) : (
          /* CLIENT DASHBOARD NAVIGATION */
          <>
            <div>
              <div className="px-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Campaign & Chat Operations
              </div>
              <nav className="space-y-1">
                <NavItem
                  active={activeTab === 'dashboard'}
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  label="Overview"
                  onClick={() => onSelectTab('dashboard')}
                />
                <NavItem
                  active={activeTab === 'chat'}
                  icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
                  label="Live Chat & Inbox"
                  badge="WhatsApp"
                  onClick={() => onSelectTab('chat')}
                />
                <NavItem
                  active={activeTab === 'campaigns'}
                  icon={<Send className="w-4 h-4" />}
                  label="Campaigns"
                  onClick={() => onSelectTab('campaigns')}
                />
                <NavItem
                  active={activeTab === 'records'}
                  icon={<ListOrdered className="w-4 h-4" />}
                  label="Campaign Records"
                  onClick={() => onSelectTab('records')}
                />
                <NavItem
                  active={activeTab === 'reports'}
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Analytics & Reports"
                  onClick={() => onSelectTab('reports')}
                />
              </nav>
            </div>

            <div>
              <div className="px-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Audience & Templates
              </div>
              <nav className="space-y-1">
                <NavItem
                  active={activeTab === 'contacts'}
                  icon={<Users className="w-4 h-4" />}
                  label="Contacts"
                  onClick={() => onSelectTab('contacts')}
                />
                <NavItem
                  active={activeTab === 'groups'}
                  icon={<FolderGit2 className="w-4 h-4" />}
                  label="Contact Groups"
                  onClick={() => onSelectTab('groups')}
                />
                <NavItem
                  active={activeTab === 'templates'}
                  icon={<FileCode2 className="w-4 h-4" />}
                  label="Meta Templates"
                  onClick={() => onSelectTab('templates')}
                />
                <NavItem
                  active={activeTab === 'download_templates'}
                  icon={<FileSpreadsheet className="w-4 h-4" />}
                  label="Download Templates"
                  badge="CSV / XLSX"
                  onClick={() => onSelectTab('download_templates')}
                />
              </nav>
            </div>

            <div>
              <div className="px-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Finance & Developer
              </div>
              <nav className="space-y-1">
                <NavItem
                  active={activeTab === 'credits'}
                  icon={<CreditCard className="w-4 h-4" />}
                  label="Credit Ledger"
                  onClick={() => onSelectTab('credits')}
                />
                <NavItem
                  active={activeTab === 'api'}
                  icon={<KeyRound className="w-4 h-4" />}
                  label="Developer API"
                  onClick={() => onSelectTab('api')}
                />
                <NavItem
                  active={activeTab === 'api_logs'}
                  icon={<Terminal className="w-4 h-4" />}
                  label="API Request Logs"
                  onClick={() => onSelectTab('api_logs')}
                />
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Meta API Trust Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center space-x-2 text-emerald-400 font-medium mb-1">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Meta Cloud API Official</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Graph API v21.0 compliance. Strict multi-tenant isolation.
        </p>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}> = ({ active, icon, label, badge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            active
              ? 'bg-white/20 text-white'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
