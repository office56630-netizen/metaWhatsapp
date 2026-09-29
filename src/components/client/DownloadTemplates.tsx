import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Info,
  CheckCircle2,
  FileCode,
  Users,
  Send
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const DownloadTemplates: React.FC = () => {
  const downloadContactCsv = () => {
    const csv = `phone,name,email,group,city,tier,order_id,discount,points
+919876543210,Rahul Sharma,rahul@example.com,VIP Customers,Mumbai,Gold Tier,ORD-9021,20% Off,1500
+919876543211,Amit Verma,amit@example.com,VIP Customers,Pune,Silver Tier,ORD-9022,15% Off,620
+919876543212,Pooja Hegde,pooja@example.com,Weekend Leads,Delhi,Diamond Tier,ORD-9023,25% Off,3400`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_contact_import_with_metadata.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadContactXlsx = () => {
    const data = [
      {
        phone: '+919876543210',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        group: 'VIP Customers',
        city: 'Mumbai',
        tier: 'Gold Tier',
        order_id: 'ORD-9021',
        discount: '20% Off',
        points: 1500
      },
      {
        phone: '+919876543211',
        name: 'Amit Verma',
        email: 'amit@example.com',
        group: 'VIP Customers',
        city: 'Pune',
        tier: 'Silver Tier',
        order_id: 'ORD-9022',
        discount: '15% Off',
        points: 620
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'sample_contact_import_with_metadata.xlsx');
  };

  const downloadCampaignCsv = () => {
    const csv = `phone,name,custom1,custom2,custom3,custom4,custom5
+919876543210,Rahul,ORD1001,₹1500,Confirmed,Express,Tomorrow
+919876543211,Amit,ORD1002,₹2200,Dispatched,Standard,Thursday
+919876543212,Pooja,ORD1003,₹3400,Confirmed,Priority,Today`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_campaign_recipients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCampaignXlsx = () => {
    const data = [
      {
        phone: '+919876543210',
        name: 'Rahul',
        custom1: 'ORD1001',
        custom2: '₹1500',
        custom3: 'Confirmed',
        custom4: 'Express Delivery',
        custom5: 'Tomorrow'
      },
      {
        phone: '+919876543211',
        name: 'Amit',
        custom1: 'ORD1002',
        custom2: '₹2200',
        custom3: 'Dispatched',
        custom4: 'Standard Delivery',
        custom5: 'Thursday'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CampaignRecipients');
    XLSX.writeFile(wb, 'sample_campaign_recipients.xlsx');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Downloadable Sample Templates</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Standardized CSV and Excel spreadsheet files ready to populate with your audience data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Import Template */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Contact Import Template</h2>
              <p className="text-[11px] text-slate-400">For building customer databases & groups</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>phone:</strong> International format (e.g. +919876543210 or 919876543210).</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>name:</strong> Full name of the contact.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>group:</strong> Automatically creates or assigns to this group.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>custom1 to custom5:</strong> Custom fields used for template variables.</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={downloadContactCsv}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV Template</span>
            </button>
            <button
              onClick={downloadContactXlsx}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Campaign File Template */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Campaign File Template</h2>
              <p className="text-[11px] text-slate-400">For direct ad-hoc file-based broadcasts</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><strong>phone:</strong> Direct recipient phone number.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><strong>name:</strong> Mapped to recipient name.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span><strong>custom1 to custom5:</strong> Variable slots for order ID, amount, discount, etc.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Can be uploaded directly into Step 3 of the Campaign Wizard.</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={downloadCampaignCsv}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV Template</span>
            </button>
            <button
              onClick={downloadCampaignXlsx}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
