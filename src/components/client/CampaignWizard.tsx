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
  RefreshCw,
  Download,
  Upload,
  Edit3,
  Database,
  Table,
  FileText,
  Check,
  RotateCcw,
  FileUp,
  Info,
  Eye
} from 'lucide-react';
import { api } from '../../api';
import { WhatsAppTemplate, ContactGroup, Contact } from '../../types';
import { WhatsAppPreviewSimulator } from '../WhatsAppPreviewSimulator';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getTemplateVariables, getVariableContext, renderTemplatePreview } from '../../utils/templateHelper';

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

  // Variable Mapping & Custom Typing
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [variableSourceType, setVariableSourceType] = useState<Record<string, 'column' | 'custom'>>({});
  const [customVariableValues, setCustomVariableValues] = useState<Record<string, string>>({});

  // Column Auto-detection & File Drag State
  const [detectedPhoneHeader, setDetectedPhoneHeader] = useState<string>('');
  const [detectedNameHeader, setDetectedNameHeader] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

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
      const tplVars = getTemplateVariables(selectedTemplate);
      const initialMap: Record<string, string> = {};
      const initialTypes: Record<string, 'column' | 'custom'> = {};
      const initialCustom: Record<string, string> = {};

      tplVars.forEach((v, idx) => {
        const slotKey = v;
        initialTypes[slotKey] = 'column';
        if (v === 'name' || idx === 0) {
          initialMap[slotKey] = 'name';
          initialCustom[slotKey] = '';
        } else {
          initialMap[slotKey] = `var${idx + 1}`;
          initialCustom[slotKey] = '';
        }
      });

      setVariableMapping(initialMap);
      setVariableSourceType(initialTypes);
      setCustomVariableValues(initialCustom);
    }
  }, [selectedTemplate]);

  const autoMapHeadersToVariables = (headers: string[]) => {
    if (!selectedTemplate) return;
    const tplVars = getTemplateVariables(selectedTemplate);
    const autoMap: Record<string, string> = {};
    const autoTypes: Record<string, 'column' | 'custom'> = {};

    // Auto-detect Phone and Name columns
    const phoneCol =
      headers.find((h) =>
        /^(?:phone|mobile|number|cell|tel|whatsapp|contact|customer_?mobile|contact_?number|phonenumber)$/i.test(
          h.trim()
        )
      ) ||
      headers.find((h) => /phone|mobile|number|cell|tel|whatsapp/i.test(h)) ||
      headers[0] ||
      '';

    const nameCol =
      headers.find((h) =>
        /^(?:customer_?name|name|full_?name|client_?name|contact_?name|recipient)$/i.test(h.trim())
      ) ||
      headers.find((h) => /name|customer/i.test(h)) ||
      '';

    setDetectedPhoneHeader(phoneCol);
    setDetectedNameHeader(nameCol);

    tplVars.forEach((v, idx) => {
      const slotKey = v;
      autoTypes[slotKey] = 'column';

      // Match file headers by name or variable index
      const matchedHeader = headers.find((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          clean === `var${v}` ||
          clean === `variable${v}` ||
          clean === `v${v}` ||
          clean === v.toLowerCase() ||
          (idx === 0 && nameCol && h === nameCol)
        );
      });

      if (matchedHeader) {
        autoMap[slotKey] = matchedHeader;
      } else if (headers[idx]) {
        autoMap[slotKey] = headers[idx];
      }
    });

    setVariableMapping((prev) => ({ ...prev, ...autoMap }));
    setVariableSourceType((prev) => ({ ...prev, ...autoTypes }));
  };

  // Helper to download sample CSV or Excel template
  const downloadSampleFile = (type: 'csv' | 'xlsx') => {
    const tplVars = getTemplateVariables(selectedTemplate);
    const varHeaders = tplVars.length > 0
      ? tplVars.map((v) => `var${v}`)
      : ['var1', 'var2', 'var3'];

    const headers = ['Phone', 'Customer Name', ...varHeaders, 'City', 'Order ID'];
    const sampleRows = [
      ['+919876543210', 'Rahul Sharma', ...varHeaders.map((_, i) => `Val_${i + 1}_A`), 'Mumbai', 'ORD-101'],
      ['+919876543211', 'Priya Patel', ...varHeaders.map((_, i) => `Val_${i + 1}_B`), 'Delhi', 'ORD-102'],
      ['+919876543212', 'Vikram Singhania', ...varHeaders.map((_, i) => `Val_${i + 1}_C`), 'Bangalore', 'ORD-103']
    ];

    const safeName = (selectedTemplate?.name || 'audience').toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (type === 'csv') {
      const csvContent = [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sample_${safeName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audience');
      XLSX.writeFile(wb, `sample_${safeName}.xlsx`);
    }
  };

  // Parse uploaded file (CSV or XLSX) with high precision formatting
  const parseUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          // raw: false ensures telephone numbers and integers are read as exact text rather than scientific notation
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '', raw: false });
          if (jsonData.length > 0) {
            // Sanitize headers and rows: trim keys and values
            const cleanRows = jsonData
              .map((row) => {
                const clean: Record<string, string> = {};
                Object.entries(row).forEach(([k, v]) => {
                  const cleanKey = k.trim();
                  if (cleanKey && !cleanKey.startsWith('__EMPTY')) {
                    clean[cleanKey] = v !== undefined && v !== null ? String(v).trim() : '';
                  }
                });
                return clean;
              })
              .filter((row) => Object.values(row).some((val) => val.length > 0));

            if (cleanRows.length === 0) {
              alert('The Excel file contains no valid data rows.');
              return;
            }

            setFileRows(cleanRows);
            const headers = Object.keys(cleanRows[0]);
            setFileHeaders(headers);
            autoMapHeadersToVariables(headers);
          } else {
            alert('The Excel file is empty.');
          }
        } catch (err: any) {
          alert('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
        if (parsed.data && parsed.data.length > 0) {
          const cleanRows = (parsed.data as Record<string, any>[])
            .map((row) => {
              const clean: Record<string, string> = {};
              Object.entries(row).forEach(([k, v]) => {
                const cleanKey = k.trim();
                if (cleanKey && !cleanKey.startsWith('__EMPTY')) {
                  clean[cleanKey] = v !== undefined && v !== null ? String(v).trim() : '';
                }
              });
              return clean;
            })
            .filter((row) => Object.values(row).some((val) => val.length > 0));

          if (cleanRows.length === 0) {
            alert('The CSV file contains no valid data rows.');
            return;
          }

          setFileRows(cleanRows);
          const headers = Object.keys(cleanRows[0]);
          setFileHeaders(headers);
          autoMapHeadersToVariables(headers);
        } else {
          alert('The CSV file contains no valid rows.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle CSV/XLSX file upload for file campaign
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseUploadedFile(file);
  };

  // Compute recipients list based on type
  const getPreparedRecipients = () => {
    const tplVars = getTemplateVariables(selectedTemplate);

    if (campaignType === 'group') {
      return groupContacts.map((c) => {
        const resolvedVars: Record<string, string> = {};

        tplVars.forEach((slot) => {
          if (variableSourceType[slot] === 'custom') {
            resolvedVars[slot] = customVariableValues[slot] || '';
          } else {
            const sourceField = variableMapping[slot] || (slot === '1' ? 'name' : `var${slot}`);
            if (sourceField === 'name') {
              resolvedVars[slot] = c.name;
            } else if (sourceField === 'phone') {
              resolvedVars[slot] = c.phone;
            } else if (sourceField.startsWith('var')) {
              const varNum = sourceField.replace('var', '');
              resolvedVars[slot] =
                c.variables?.[varNum] ||
                c.variables?.[`var_${varNum}`] ||
                c.metadata?.[`var_${varNum}`] ||
                c.metadata?.[varNum] ||
                (c as any)[`custom${varNum}`] ||
                '';
            } else if (sourceField.startsWith('custom')) {
              resolvedVars[slot] = (c as any)[sourceField] || '';
            } else if (c.metadata && c.metadata[sourceField]) {
              resolvedVars[slot] = c.metadata[sourceField];
            } else {
              resolvedVars[slot] = c.variables?.[slot] || (c as any)[sourceField] || '';
            }
          }
        });

        return {
          phone: c.phone,
          name: c.name,
          contact_id: c.id,
          variables: resolvedVars
        };
      });
    } else if (campaignType === 'file') {
      return fileRows.map((r) => {
        const keys = Object.keys(r);
        const phoneKey =
          detectedPhoneHeader ||
          keys.find((k) =>
            /^(?:phone|mobile|number|cell|tel|whatsapp|contact|customer_?mobile|contact_?number|phonenumber)$/i.test(
              k.trim()
            )
          ) ||
          keys.find((k) => /phone|mobile|number|cell|tel|whatsapp/i.test(k)) ||
          keys[0];

        const nameKey =
          detectedNameHeader ||
          keys.find((k) =>
            /^(?:customer_?name|name|full_?name|client_?name|contact_?name|recipient)$/i.test(k.trim())
          ) ||
          keys.find((k) => /name|customer/i.test(k)) ||
          keys[1];

        // build variables based on custom typed text or column mapping
        const vars: Record<string, string> = {};
        tplVars.forEach((slot) => {
          if (variableSourceType[slot] === 'custom') {
            vars[slot] = customVariableValues[slot] || '';
          } else {
            const colName = variableMapping[slot];
            vars[slot] =
              colName && r[colName] !== undefined
                ? String(r[colName])
                : customVariableValues[slot] || '';
          }
        });

        return {
          phone: String(r[phoneKey] || ''),
          name: nameKey && r[nameKey] ? String(r[nameKey]) : 'Customer',
          variables: vars
        };
      });
    } else {
      // Individual send
      const vars: Record<string, string> = {};
      tplVars.forEach((slot) => {
        vars[slot] = customVariableValues[slot] || variableMapping[slot] || '';
      });

      return [
        {
          phone: singlePhone,
          name: singleName || 'Recipient',
          variables: vars
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
    const tplVars = getTemplateVariables(selectedTemplate);

    tplVars.forEach((slot) => {
      if (variableSourceType[slot] === 'custom') {
        vars[slot] = customVariableValues[slot] || `[Custom {{${slot}}}]`;
      } else if (sample && sample.variables && sample.variables[slot]) {
        vars[slot] = sample.variables[slot];
      } else {
        const field = variableMapping[slot] || (slot === '1' ? 'name' : `var${slot}`);
        if (field === 'name') vars[slot] = sample?.name || 'Rahul';
        else if (field === 'phone') vars[slot] = sample?.phone || '+919876543210';
        else vars[slot] = sample ? (sample[field] || `[${field}]`) : `[${field}]`;
      }
    });

    if (!vars['1'] && sample?.name) vars['1'] = sample.name;
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
      const effectiveMapping: Record<string, string> = {};
      const tplVars = getTemplateVariables(selectedTemplate);
      tplVars.forEach((slot) => {
        if (variableSourceType[slot] === 'custom') {
          effectiveMapping[slot] = `custom:${customVariableValues[slot] || ''}`;
        } else {
          effectiveMapping[slot] = variableMapping[slot] || (slot === '1' ? 'name' : `var${slot}`);
        }
      });

      const payload = {
        name: campaignName,
        type: campaignType,
        templateId: selectedTemplate!.id,
        language: selectedTemplate!.language,
        groupId: campaignType === 'group' ? selectedGroupId : null,
        variableMapping: effectiveMapping,
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
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between flex-wrap gap-1">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                          Lang: {tpl.language}
                        </span>
                        {(() => {
                          const tplVars = getTemplateVariables(tpl);
                          return (
                            <span
                              className={`px-2 py-0.5 rounded font-medium ${
                                tplVars.length === 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              }`}
                            >
                              {tplVars.length === 0
                                ? '✨ 0 Variables'
                                : `🎯 ${tplVars.length} Variable${tplVars.length > 1 ? 's' : ''}`}
                            </span>
                          );
                        })()}
                      </div>
                      {(() => {
                        const tplVars = getTemplateVariables(tpl);
                        if (tplVars.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[9px]">
                            {tplVars.map((v) => (
                              <span
                                key={v}
                                className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-bold"
                              >
                                {`{{${v}}}`}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
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
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold text-sm">
                        Upload Audience Spreadsheet / CSV *
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Supports Excel (<code className="text-emerald-400">.xlsx</code>, <code className="text-emerald-400">.xls</code>) and CSV (<code className="text-emerald-400">.csv</code>)
                      </p>
                    </div>

                    {/* Download Sample Files */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => downloadSampleFile('csv')}
                        className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors"
                        title="Download sample CSV template matching this template"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>Sample CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSampleFile('xlsx')}
                        className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors"
                        title="Download sample Excel XLSX template matching this template"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sample Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  {!uploadedFileName ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) parseUploadedFile(file);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                        isDragOver
                          ? 'border-emerald-500 bg-emerald-950/20'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-950'
                      }`}
                    >
                      <input
                        type="file"
                        id="campaignFileInput"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="campaignFileInput" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-md">
                          <FileUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">
                            Click or drag and drop your audience file here
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Columns like <strong>Phone/Mobile</strong>, <strong>Customer Name</strong>, and <strong>Variables</strong> will be automatically detected.
                          </p>
                        </div>
                        <div className="inline-flex items-center space-x-2 bg-slate-900 px-3 py-1 rounded-full text-[10px] text-slate-400 border border-slate-800">
                          <span>Excel .xlsx, .xls</span>
                          <span>•</span>
                          <span>CSV .csv</span>
                          <span>•</span>
                          <span>Max 50,000 rows</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    /* Uploaded File Details & Interactive Table Preview */
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white font-mono text-sm">
                                {uploadedFileName}
                              </span>
                              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-500/30">
                                {fileRows.length} rows loaded
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {fileHeaders.length} columns detected: {fileHeaders.slice(0, 5).join(', ')}
                              {fileHeaders.length > 5 ? '...' : ''}
                            </p>
                          </div>
                        </div>

                        <label
                          htmlFor="reuploadFileInput"
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700 transition-colors shrink-0 text-center"
                        >
                          <input
                            type="file"
                            id="reuploadFileInput"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          Change File
                        </label>
                      </div>

                      {/* Primary Column Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                            <span>📞 WhatsApp Phone Number Column *</span>
                          </label>
                          <select
                            value={detectedPhoneHeader}
                            onChange={(e) => setDetectedPhoneHeader(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-emerald-500"
                          >
                            {fileHeaders.map((col) => (
                              <option key={col} value={col}>
                                Column: {col}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                            <span>👤 Customer Name Column (Optional)</span>
                          </label>
                          <select
                            value={detectedNameHeader}
                            onChange={(e) => setDetectedNameHeader(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-emerald-500"
                          >
                            <option value="">-- Auto / None --</option>
                            {fileHeaders.map((col) => (
                              <option key={col} value={col}>
                                Column: {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* First Rows Preview Table */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1">
                            <Table className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Preview Uploaded File Rows (First {Math.min(fileRows.length, 3)} rows):</span>
                          </span>
                        </div>

                        <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-sm max-h-48 bg-slate-950">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0">
                              <tr>
                                <th className="py-2 px-3 font-semibold text-slate-500">#</th>
                                {fileHeaders.map((h) => (
                                  <th
                                    key={h}
                                    className={`py-2 px-3 whitespace-nowrap font-mono ${
                                      h === detectedPhoneHeader
                                        ? 'text-emerald-400 font-bold bg-emerald-950/20'
                                        : h === detectedNameHeader
                                        ? 'text-blue-400 font-bold bg-blue-950/20'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {h}
                                    {h === detectedPhoneHeader && ' (Phone)'}
                                    {h === detectedNameHeader && ' (Name)'}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 font-mono">
                              {fileRows.slice(0, 3).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-900/40">
                                  <td className="py-1.5 px-3 text-slate-600">{rIdx + 1}</td>
                                  {fileHeaders.map((h) => (
                                    <td
                                      key={h}
                                      className="py-1.5 px-3 text-slate-300 whitespace-nowrap max-w-[150px] truncate"
                                    >
                                      {String(row[h] !== undefined ? row[h] : '')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {campaignType === 'individual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Recipient Phone Number (E.164) *</label>
                    <input
                      type="text"
                      placeholder="+919876543210"
                      value={singlePhone}
                      onChange={(e) => setSinglePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Recipient Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Singhania"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Variable Mapping & Custom Typing for Campaign Shoot */}
          {step === 4 && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Configure Template Variables</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {getTemplateVariables(selectedTemplate).length > 0 ? (
                      <>
                        Detected <strong>{getTemplateVariables(selectedTemplate).length} variable(s)</strong> in this template.
                        You can map each variable to a data column OR type a custom static value.
                      </>
                    ) : (
                      'This template has no dynamic variables.'
                    )}
                  </p>
                </div>

                {getTemplateVariables(selectedTemplate).length > 0 && (
                  <div className="flex items-center space-x-1.5 shrink-0 flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (campaignType === 'file' && fileHeaders.length > 0) {
                          autoMapHeadersToVariables(fileHeaders);
                        } else if (selectedTemplate) {
                          const tplVars = getTemplateVariables(selectedTemplate);
                          const autoMap: Record<string, string> = {};
                          const autoTypes: Record<string, 'column' | 'custom'> = {};
                          tplVars.forEach((v, idx) => {
                            autoTypes[v] = 'column';
                            autoMap[v] = idx === 0 ? 'name' : `var${v}`;
                          });
                          setVariableMapping(autoMap);
                          setVariableSourceType(autoTypes);
                        }
                      }}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      ✨ Auto-Map File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tplVars = getTemplateVariables(selectedTemplate);
                        const allCustom: Record<string, 'column' | 'custom'> = {};
                        tplVars.forEach((v) => {
                          allCustom[v] = 'custom';
                        });
                        setVariableSourceType(allCustom);
                      }}
                      className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      ✍️ Type Custom All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tplVars = getTemplateVariables(selectedTemplate);
                        const allColumn: Record<string, 'column' | 'custom'> = {};
                        tplVars.forEach((v) => {
                          allColumn[v] = 'column';
                        });
                        setVariableSourceType(allColumn);
                      }}
                      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      📂 Choose Column All
                    </button>
                  </div>
                )}
              </div>

              {getTemplateVariables(selectedTemplate).length === 0 ? (
                /* Zero Variables Banner */
                <div className="p-6 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-sm">No Variables Required</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    This template does not contain dynamic placeholders. The exact approved template message will be broadcast to all recipients.
                  </p>
                </div>
              ) : (
                /* Dynamic Variable Mapping & Custom Typing List */
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[460px] overflow-y-auto">
                  {getTemplateVariables(selectedTemplate).map((slotKey, idx) => {
                    const currentMode = variableSourceType[slotKey] || 'column';
                    const customVal = customVariableValues[slotKey] || '';
                    const colVal = variableMapping[slotKey] || (idx === 0 ? 'name' : `var${slotKey}`);
                    const location = getVariableContext(selectedTemplate, slotKey);

                    // Compute sample value for first recipient
                    const sampleFirst: any = recipients[0];
                    let sampleVal = '';
                    if (currentMode === 'custom') {
                      sampleVal = customVal || '(blank)';
                    } else if (campaignType === 'file') {
                      sampleVal = sampleFirst && sampleFirst.variables && sampleFirst.variables[slotKey] !== undefined
                        ? String(sampleFirst.variables[slotKey])
                        : `[${colVal}]`;
                    } else {
                      sampleVal = sampleFirst && sampleFirst.variables && sampleFirst.variables[slotKey]
                        ? sampleFirst.variables[slotKey]
                        : colVal === 'name' ? (sampleFirst?.name || 'Customer')
                        : colVal === 'phone' ? (sampleFirst?.phone || 'Phone')
                        : `[${colVal}]`;
                    }

                    return (
                      <div
                        key={slotKey}
                        className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-xs">
                              {`{{${slotKey}}}`}
                            </span>
                            <span className="text-[11px] text-slate-300 font-medium">
                              Slot #{idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {location}
                            </span>
                          </div>

                          {/* Segmented Mode Selector: Column vs Custom Typed */}
                          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                            <button
                              type="button"
                              onClick={() =>
                                setVariableSourceType({
                                  ...variableSourceType,
                                  [slotKey]: 'column'
                                })
                              }
                              className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                                currentMode === 'column'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              📂 Choose Column
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVariableSourceType({
                                  ...variableSourceType,
                                  [slotKey]: 'custom'
                                })
                              }
                              className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                                currentMode === 'custom'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              ✍️ Type Custom
                            </button>
                          </div>
                        </div>

                        {/* Mode 1: Map from Column */}
                        {currentMode === 'column' ? (
                          <div className="space-y-1.5">
                            <select
                              value={colVal}
                              onChange={(e) => {
                                if (e.target.value === '__SWITCH_CUSTOM__') {
                                  setVariableSourceType({
                                    ...variableSourceType,
                                    [slotKey]: 'custom'
                                  });
                                } else {
                                  setVariableMapping({
                                    ...variableMapping,
                                    [slotKey]: e.target.value
                                  });
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-emerald-500"
                            >
                              {campaignType === 'file' ? (
                                <>
                                  <optgroup label="Uploaded Recipient File Columns">
                                    {fileHeaders.map((col) => (
                                      <option key={col} value={col}>
                                        Column: {col}
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Or Switch to Custom Fixed Text">
                                    <option value="__SWITCH_CUSTOM__">✍️ Switch to Type Custom Fixed Value...</option>
                                  </optgroup>
                                </>
                              ) : (
                                <>
                                  <optgroup label="Recipient Profile Attributes">
                                    <option value="name">👤 Customer Name</option>
                                    <option value="phone">📞 Phone Number</option>
                                    <option value={`var${slotKey}`}>✨ Contact Variable {slotKey}</option>
                                  </optgroup>
                                  <optgroup label="Or Switch to Custom Fixed Text">
                                    <option value="__SWITCH_CUSTOM__">✍️ Switch to Type Custom Fixed Value...</option>
                                  </optgroup>
                                </>
                              )}
                            </select>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                              <span>Recipient 1 Preview:</span>
                              <strong className="text-emerald-400 font-mono truncate max-w-[220px]">
                                {sampleVal || '(empty in row)'}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          /* Mode 2: Type Custom Text Value */
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={customVal}
                              onChange={(e) =>
                                setCustomVariableValues({
                                  ...customVariableValues,
                                  [slotKey]: e.target.value
                                })
                              }
                              placeholder={`Type custom text for {{${slotKey}}} (e.g. FESTIVE2026, 20% OFF)`}
                              className="w-full bg-slate-950 border border-purple-500/50 rounded-lg px-3 py-2 text-white text-xs focus:border-purple-400 focus:outline-none"
                            />
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                              <span className="text-slate-500">Quick fill:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomVariableValues({
                                    ...customVariableValues,
                                    [slotKey]: '20% OFF'
                                  })
                                }
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                "20% OFF"
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomVariableValues({
                                    ...customVariableValues,
                                    [slotKey]: 'PROMO50'
                                  })
                                }
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                "PROMO50"
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomVariableValues({
                                    ...customVariableValues,
                                    [slotKey]: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                  })
                                }
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                📅 Today's Date
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomVariableValues({
                                    ...customVariableValues,
                                    [slotKey]: 'ORDER-2026'
                                  })
                                }
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                "ORDER-2026"
                              </button>
                              {customVal && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCustomVariableValues({
                                      ...customVariableValues,
                                      [slotKey]: ''
                                    })
                                  }
                                  className="text-rose-400 hover:text-rose-300 ml-auto cursor-pointer"
                                >
                                  ✕ Clear
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-purple-300 bg-purple-950/20 px-2.5 py-1 rounded-lg border border-purple-900/40">
                              <span>Applied to all recipients:</span>
                              <strong className="font-mono text-white truncate max-w-[220px]">
                                {customVal ? `"${customVal}"` : '(Type text above)'}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
