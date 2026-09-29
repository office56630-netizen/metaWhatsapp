import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send,
  Users,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Coins,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api';
import { WhatsAppTemplate, ContactGroup, Contact } from '../../types';
import { WhatsAppPreviewSimulator } from '../WhatsAppPreviewSimulator';
import Papa from 'papaparse';

interface CampaignWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [credits, setCredits] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<'group' | 'file' | 'individual'>('group');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupContacts, setGroupContacts] = useState<Contact[]>([]);

  // File Campaign State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileRows, setFileRows] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);

  // Individual Send State
  const [singlePhone, setSinglePhone] = useState('');
  const [singleName, setSingleName] = useState('');

  // Variable Mapping (templateVarKey -> contactFieldKey or fileColumn)
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});

  // Scheduling
  const [sendTiming, setSendTiming] = useState<'now' | 'schedule'>('now');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    Promise.all([api.getTemplates(), api.getGroups(), api.getCredits()]).then(
      ([tRes, gRes, cRes]) => {
        if (tRes.success) {
          setTemplates(tRes.templates);
          if (tRes.templates.length > 0) setSelectedTemplate(tRes.templates[0]);
        }
        if (gRes.success) {
          setGroups(gRes.groups);
          if (gRes.groups.length > 0) setSelectedGroupId(gRes.groups[0].id);
        }
        if (cRes.success) setCredits(cRes.balances);
        setLoadingInitial(false);
      }
    );
  }, []);

  // Fetch group contacts when group changes
  useEffect(() => {
    if (campaignType === 'group' && selectedGroupId) {
      api.getContacts({ groupId: selectedGroupId, limit: 5000 }).then((res) => {
        if (res.success) setGroupContacts(res.contacts);
      });
    }
  }, [campaignType, selectedGroupId]);

  // Auto-init variable mapping when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initialMap: Record<string, string> = {};
      selectedTemplate.variables.forEach((v, idx) => {
        const slotKey = String(idx + 1);
        if (v === 'name' || idx === 0) initialMap[slotKey] = 'name';
        else if (v === 'custom1' || idx === 1) initialMap[slotKey] = 'custom1';
        else if (v === 'custom2' || idx === 2) initialMap[slotKey] = 'custom2';
        else if (v === 'custom3' || idx === 3) initialMap[slotKey] = 'custom3';
        else initialMap[slotKey] = `custom${idx + 1}`;
      });
      setVariableMapping(initialMap);
    }
  }, [selectedTemplate]);

  // Handle CSV/XLSX file upload for file campaign
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.data && parsed.data.length > 0) {
        setFileRows(parsed.data);
        setFileHeaders(Object.keys(parsed.data[0] as object));
      }
    };
    reader.readAsText(file);
  };

  // Compute recipients list based on type
  const getPreparedRecipients = () => {
    if (campaignType === 'group') {
      return groupContacts.map((c) => ({
        phone: c.phone,
        name: c.name,
        contact_id: c.id,
        variables: variableMapping,
        custom1: c.custom1,
        custom2: c.custom2,
        custom3: c.custom3,
        custom4: c.custom4,
        custom5: c.custom5
      }));
    } else if (campaignType === 'file') {
      return fileRows.map((r) => {
        const keys = Object.keys(r);
        const phoneKey = keys.find((k) => /phone|mobile|number/i.test(k)) || keys[0];
        const nameKey = keys.find((k) => /name/i.test(k)) || keys[1];

        // build variables based on mapping
        const vars: Record<string, string> = {};
        Object.entries(variableMapping).forEach(([slot, colName]) => {
          vars[slot] = String(r[colName] || '');
        });

        return {
          phone: String(r[phoneKey] || ''),
          name: nameKey ? String(r[nameKey] || '') : 'Recipient',
          variables: vars
        };
      });
    } else {
      return [
        {
          phone: singlePhone,
          name: singleName || 'Recipient',
          variables: variableMapping
        }
      ];
    }
  };

  const recipients = getPreparedRecipients();
  const recipientCount = recipients.length;
  const isMarketing = selectedTemplate?.category !== 'UTILITY';
  const creditTypeNeeded = isMarketing ? 'marketing' : 'utility';
  const availableCredits = isMarketing
    ? credits?.marketing_credits || 0
    : credits?.utility_credits || 0;
  const messageLimitRemaining = credits?.campaign_messages_remaining || 0;

  const hasEnoughCredits = availableCredits >= recipientCount;
  const hasEnoughQuota = messageLimitRemaining >= recipientCount;

  // Build sample preview message for step 5
  const getSamplePreviewVars = (): Record<string, string> => {
    const sample: any = recipients[0];
    const vars: Record<string, string> = {};
    if (!sample) return { '1': 'Rahul', '2': 'VIP-101', '3': 'Downtown' };

    Object.entries(variableMapping).forEach(([slot, field]) => {
      if (field === 'name') vars[slot] = sample.name || 'Rahul';
      else if (field === 'custom1') vars[slot] = sample.custom1 || 'ORD-901';
      else if (field === 'custom2') vars[slot] = sample.custom2 || 'Mumbai';
      else if (field === 'custom3') vars[slot] = sample.custom3 || 'Gold';
      else if (field === 'custom4') vars[slot] = sample.custom4 || '20% Off';
      else if (field === 'custom5') vars[slot] = sample.custom5 || 'Valid Today';
      else if (typeof sample.variables === 'object') {
        vars[slot] = (sample.variables as any)[slot] || sample[field] || `[${field}]`;
      }
    });

    if (!vars['1'] && sample.name) vars['1'] = sample.name;
    return vars;
  };

  const handleLaunch = async () => {
    setErrorMessage('');
    if (!hasEnoughCredits) {
      setErrorMessage(`Insufficient ${creditTypeNeeded} credits. Available: ${availableCredits}, Required: ${recipientCount}`);
      return;
    }
    if (!hasEnoughQuota) {
      setErrorMessage(`Monthly message limit exceeded. Remaining quota: ${messageLimitRemaining}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: campaignName,
        type: campaignType,
        templateId: selectedTemplate!.id,
        language: selectedTemplate!.language,
        groupId: campaignType === 'group' ? selectedGroupId : null,
        variableMapping,
        recipients,
        scheduleAt: sendTiming === 'schedule' && scheduleDateTime ? scheduleDateTime : null
      };

      const res = await api.createCampaign(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to create campaign');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error launching campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex items-center space-x-3 text-slate-300 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Initializing campaign wizard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Campaign Launch Wizard
              </h2>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Step {step} of 8
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Official Meta WhatsApp Cloud API multi-recipient campaign dispatcher
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between overflow-x-auto text-[11px] font-medium text-slate-400">
          {[
            '1. Info',
            '2. Template',
            '3. Audience',
            '4. Variables',
            '5. Preview',
            '6. Validation',
            '7. Schedule',
            '8. Launch'
          ].map((title, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div
                key={title}
                className={`flex items-center space-x-1 whitespace-nowrap px-2 py-1 rounded-md transition-colors ${
                  isCurrent
                    ? 'text-emerald-400 bg-emerald-500/10 font-semibold'
                    : isCompleted
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-current text-[9px] flex items-center justify-center shrink-0">
                    {stepNum}
                  </span>
                )}
                <span>{title}</span>
              </div>
            );
          })}
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-300 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Campaign Information */}
          {step === 1 && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival Offer Season 2"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-medium">Campaign Dispatch Type *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCampaignType('group')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      campaignType === 'group'
                        ? 'bg-emerald-950/30 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Users className="w-5 h-5 text-emerald-400 mb-1.5" />
                    <p className="font-semibold text-white">Group Campaign</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select from contacts database</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCampaignType('file')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      campaignType === 'file'
                        ? 'bg-emerald-950/30 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-blue-400 mb-1.5" />
                    <p className="font-semibold text-white">File Campaign</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Upload CSV/XLSX recipient list</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCampaignType('individual')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      campaignType === 'individual'
                        ? 'bg-emerald-950/30 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Send className="w-5 h-5 text-purple-400 mb-1.5" />
                    <p className="font-semibold text-white">Individual Send</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Single test or priority recipient</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Template */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white text-sm">Select an Approved WhatsApp Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/20 border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white text-xs">{tpl.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                            tpl.category === 'MARKETING'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {tpl.body_text}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Language: {tpl.language}</span>
                        <span>{tpl.variables.length} Variables</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Select Audience */}
          {step === 3 && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              {campaignType === 'group' && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Select Contact Group *</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.contact_count || 0} contacts)
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Target Recipients in selected group:</span>
                    <strong className="text-white font-mono text-sm">{groupContacts.length} contacts</strong>
                  </div>
                </div>
              )}

              {campaignType === 'file' && (
                <div className="space-y-3">
                  <label className="block text-slate-400 font-medium">Upload Audience CSV / Excel *</label>
                  <div className="border-2 border-dashed border-slate-700 bg-slate-950 p-6 rounded-2xl text-center">
                    <input
                      type="file"
                      id="campaignFileInput"
                      accept=".csv, .xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="campaignFileInput" className="cursor-pointer space-y-2 block">
                      <FileSpreadsheet className="w-8 h-8 text-blue-400 mx-auto" />
                      <p className="font-semibold text-blue-400">Click to upload recipient file</p>
                      <p className="text-[11px] text-slate-500">File should contain phone numbers and any dynamic fields</p>
                    </label>
                  </div>
                  {uploadedFileName && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-mono">{uploadedFileName}</span>
                      <span className="text-emerald-400 font-bold font-mono">{fileRows.length} rows detected</span>
                    </div>
                  )}
                </div>
              )}

              {campaignType === 'individual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Recipient Phone Number (E.164) *</label>
                    <input
                      type="text"
                      placeholder="+919876543210"
                      value={singlePhone}
                      onChange={(e) => setSinglePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Variable Mapping */}
          {step === 4 && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div>
                <h3 className="font-semibold text-white text-sm">Map Template Variables to Data Columns</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Replace dynamic placeholders like <code className="text-emerald-400">{'{{1}}'}</code> with actual customer fields.
                </p>
              </div>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {selectedTemplate?.variables.map((v, idx) => {
                  const slotKey = String(idx + 1);
                  return (
                    <div key={slotKey} className="flex items-center justify-between gap-3">
                      <div className="w-1/2">
                        <span className="font-mono text-emerald-400 font-bold">
                          {`{{${slotKey}}}`}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          (Meta var {v})
                        </span>
                      </div>

                      <select
                        value={variableMapping[slotKey] || 'name'}
                        onChange={(e) =>
                          setVariableMapping({ ...variableMapping, [slotKey]: e.target.value })
                        }
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        {campaignType === 'file' ? (
                          fileHeaders.map((col) => (
                            <option key={col} value={col}>
                              Column: {col}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="name">Contact Name</option>
                            <option value="phone">Phone Number</option>
                            <option value="custom1">Custom 1 (e.g. Order ID)</option>
                            <option value="custom2">Custom 2 (e.g. Location)</option>
                            <option value="custom3">Custom 3 (e.g. Tier)</option>
                            <option value="custom4">Custom 4 (e.g. Discount)</option>
                            <option value="custom5">Custom 5 (e.g. Expiry Date)</option>
                          </>
                        )}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Live WhatsApp Phone Simulator Preview */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-white text-sm">Recipient Message Preview</h3>
                <p className="text-[11px] text-slate-400">
                  Simulating message output using actual variables for recipient:{' '}
                  <strong className="text-emerald-400">{recipients[0]?.name || 'Sample Recipient'}</strong>
                </p>
              </div>

              {selectedTemplate && (
                <div className="py-2 flex justify-center">
                  <WhatsAppPreviewSimulator
                    template={selectedTemplate}
                    previewVariables={getSamplePreviewVars()}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Validation & Credit Verification */}
          {step === 6 && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <h3 className="font-semibold text-white text-sm">Pre-flight Validation & Credit Verification</h3>

              <div className="space-y-3">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Target Audience</span>
                    <p className="text-white font-semibold mt-0.5">{campaignName || 'Campaign'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Total Recipients</span>
                    <p className="text-xl font-bold font-mono text-white mt-0.5">{recipientCount}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isMarketing ? (
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Coins className="w-5 h-5 text-blue-400" />
                    )}
                    <div>
                      <span className="text-slate-400">
                        {isMarketing ? 'Marketing Credits' : 'Utility Credits'}
                      </span>
                      <p className="text-white font-semibold">Available: {availableCredits.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Required Credits</span>
                    <p
                      className={`text-xl font-bold font-mono ${
                        hasEnoughCredits ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {recipientCount}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Monthly Message Limit Quota</span>
                    <p className="text-white font-semibold">Remaining Quota: {messageLimitRemaining.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-semibold text-xs px-2 py-0.5 rounded ${
                        hasEnoughQuota ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {hasEnoughQuota ? 'Within Quota Limit' : 'Quota Exceeded'}
                    </span>
                  </div>
                </div>

                {(!hasEnoughCredits || !hasEnoughQuota) && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
                      Cannot launch campaign. You need {recipientCount} {creditTypeNeeded} credits (currently {availableCredits}). Please contact Super Admin to adjust credits.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: Schedule Timing */}
          {step === 7 && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <h3 className="font-semibold text-white text-sm">Campaign Dispatch Schedule</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendTiming('now')}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    sendTiming === 'now'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Send className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="font-semibold text-white">Send Immediately</p>
                  <p className="text-[10px] text-slate-400 mt-1">Dispatches queue right away via Cloud API worker</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSendTiming('schedule')}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    sendTiming === 'schedule'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Calendar className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="font-semibold text-white">Schedule for Later</p>
                  <p className="text-[10px] text-slate-400 mt-1">Specify automated future send timestamp</p>
                </button>
              </div>

              {sendTiming === 'schedule' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-slate-400 font-medium">Select Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 8: Confirmation & Launch */}
          {step === 8 && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-white text-base">Ready to Launch Campaign</h3>
                <p className="text-[11px] text-slate-400">
                  Review your parameters below and confirm dispatch.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Campaign Name:</span>
                  <span className="font-semibold text-white">{campaignName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Template:</span>
                  <span className="font-mono text-emerald-400">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Recipients Count:</span>
                  <span className="font-mono font-bold text-white">{recipientCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Credits Deducted:</span>
                  <span className="font-semibold text-slate-200">
                    {recipientCount} {creditTypeNeeded} credits
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Execution Mode:</span>
                  <span className="font-medium text-emerald-300">
                    {sendTiming === 'now' ? 'Immediate Background Queue' : `Scheduled for ${scheduleDateTime}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
            }}
            disabled={step === 1}
            className="flex items-center space-x-1 text-slate-400 hover:text-white disabled:opacity-30 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < 8 ? (
            <button
              onClick={() => {
                if (step === 1 && !campaignName.trim()) {
                  setErrorMessage('Campaign Name is required.');
                  return;
                }
                if (step === 3 && recipientCount === 0) {
                  setErrorMessage('Please select or upload at least 1 recipient.');
                  return;
                }
                setErrorMessage('');
                setStep(step + 1);
              }}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isSubmitting || !hasEnoughCredits || !hasEnoughQuota}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Queueing Messages...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Campaign</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
