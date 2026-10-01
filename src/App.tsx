import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ClientDashboard } from './components/client/ClientDashboard';
import { ContactsManager } from './components/client/ContactsManager';
import { TemplatesCatalog } from './components/client/TemplatesCatalog';
import { CampaignsList } from './components/client/CampaignsList';
import { CampaignRecords } from './components/client/CampaignRecords';
import { CreditLedger } from './components/client/CreditLedger';
import { ApiDocumentation } from './components/client/ApiDocumentation';
import { ApiLogs } from './components/client/ApiLogs';
import { DownloadTemplates } from './components/client/DownloadTemplates';
import { ClientLiveChat } from './components/client/ClientLiveChat';
import { WhatsAppApiSetup } from './components/client/WhatsAppApiSetup';
import { CloudStorageManager } from './components/client/CloudStorageManager';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ClientsManager } from './components/admin/ClientsManager';
import { WebhookSimulator } from './components/admin/WebhookSimulator';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';
import { WhatsAppConfigModal } from './components/admin/WhatsAppConfigModal';
import { CreditAdjustModal } from './components/admin/CreditAdjustModal';
import { Client } from './types';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, client, isLoading } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Active Tab & Mobile Navigation
  const [activeTab, setActiveTab] = useState<string>(isSuperAdmin ? 'admin_dashboard' : 'dashboard');
  const [targetCampaignId, setTargetCampaignId] = useState<string | undefined>(undefined);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Admin Modals
  const [whatsAppConfigClient, setWhatsAppConfigClient] = useState<Client | null>(null);
  const [creditAdjustClient, setCreditAdjustClient] = useState<Client | null>(null);

  // If user role switches, reset active tab
  React.useEffect(() => {
    if (isSuperAdmin && !activeTab.startsWith('admin_')) {
      setActiveTab('admin_dashboard');
    } else if (!isSuperAdmin && activeTab.startsWith('admin_')) {
      setActiveTab('dashboard');
    }
  }, [isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
        <span>Loading workspace environment...</span>
      </div>
    );
  }

  const handleViewRecords = (campaignId: string) => {
    setTargetCampaignId(campaignId);
    setActiveTab('records');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setTargetCampaignId(undefined);
            setActiveTab(tab);
          }}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {/* SUPER ADMIN ROUTING */}
            {isSuperAdmin ? (
              <>
                {activeTab === 'admin_dashboard' && (
                  <AdminDashboard
                    onNavigateTab={setActiveTab}
                    onOpenWhatsAppConfig={(c) => setWhatsAppConfigClient(c)}
                    onOpenCreditAdjust={(c) => setCreditAdjustClient(c)}
                  />
                )}
                {(activeTab === 'admin_clients' || activeTab === 'admin_whatsapp') && (
                  <ClientsManager
                    onOpenWhatsAppConfig={(c) => setWhatsAppConfigClient(c)}
                    onOpenCreditAdjust={(c) => setCreditAdjustClient(c)}
                  />
                )}
                {activeTab === 'admin_campaigns' && (
                  <CampaignsList onViewRecords={handleViewRecords} />
                )}
                {activeTab === 'admin_webhook_simulator' && <WebhookSimulator />}
                {activeTab === 'admin_audit_logs' && <AdminAuditLogs />}
              </>
            ) : (
              /* CLIENT ROUTING */
              <>
                {activeTab === 'dashboard' && <ClientDashboard onNavigate={setActiveTab} />}
                {activeTab === 'whatsapp_setup' && <WhatsAppApiSetup onNavigateTab={setActiveTab} />}
                {activeTab === 'cloud_storage' && <CloudStorageManager onNavigateTab={setActiveTab} />}
                {activeTab === 'chat' && <ClientLiveChat />}
                {(activeTab === 'contacts' || activeTab === 'groups') && <ContactsManager />}
                {activeTab === 'templates' && <TemplatesCatalog />}
                {activeTab === 'campaigns' && <CampaignsList onViewRecords={handleViewRecords} />}
                {activeTab === 'records' && (
                  <CampaignRecords initialCampaignId={targetCampaignId} />
                )}
                {activeTab === 'reports' && (
                  <CampaignRecords initialCampaignId={targetCampaignId} />
                )}
                {activeTab === 'credits' && <CreditLedger />}
                {activeTab === 'api' && <ApiDocumentation />}
                {activeTab === 'api_logs' && <ApiLogs />}
                {activeTab === 'download_templates' && <DownloadTemplates />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Modals for Admin */}
      {whatsAppConfigClient && (
        <WhatsAppConfigModal
          client={whatsAppConfigClient}
          onClose={() => setWhatsAppConfigClient(null)}
          onSuccess={() => {}}
        />
      )}

      {creditAdjustClient && (
        <CreditAdjustModal
          client={creditAdjustClient}
          onClose={() => setCreditAdjustClient(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
