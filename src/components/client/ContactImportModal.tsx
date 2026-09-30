import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FolderGit2,
  Plus,
  HelpCircle,
  Sparkles,
  Download,
  SlidersHorizontal,
  Table,
  Check,
  Tag,
  FileText
} from 'lucide-react';
import { api } from '../../api';
import { ContactGroup } from '../../types';
import {
  parseCsvText,
  buildParsedDataFromRows,
  processMappedRows,
  generateSampleCsv,
  ColumnMappingItem,
  ColumnRole,
  sanitizeMetadataKey
} from '../../utils/csvParser';
import * as XLSX from 'xlsx';

interface ContactImportModalProps {
  groups: ContactGroup[];
  onClose: () => void;
  onSuccess: (targetGroupId?: string) => void;
}

type GroupMode = 'existing' | 'new' | 'from_csv';
type Step = 'upload' | 'mapping' | 'preview' | 'completed';

export const ContactImportModal: React.FC<ContactImportModalProps> = ({ groups, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState<Step>('upload');
  const [uploadTab, setUploadTab] = useState<'file' | 'paste'>('file');

  // File & Content
  const [fileName, setFileName] = useState<string>('');
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Group Settings
  const [groupMode, setGroupMode] = useState<GroupMode>('existing');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDescription, setNewGroupDescription] = useState<string>('');

  // Country Code & Duplicate Handling
  const [defaultCountryCode, setDefaultCountryCode] = useState<string>('+91');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

  // Parsed CSV State
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMappingItem>>({});
  const [detectedDelimiter, setDetectedDelimiter] = useState<string>(',');

  // Validation & Import State
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'duplicates' | 'invalid'>('all');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [finalGroupId, setFinalGroupId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop or selection
  const handleFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '', raw: false });
          if (!rawJson || rawJson.length === 0) {
            alert('The Excel file is empty.');
            setIsParsing(false);
            return;
          }

          const parsed = buildParsedDataFromRows(rawJson);
          if (parsed.headers.length === 0 || parsed.rows.length === 0) {
            alert('The uploaded Excel file contains no valid rows or columns.');
            setIsParsing(false);
            return;
          }

          setParsedHeaders(parsed.headers);
          setParsedRows(parsed.rows);
          setDetectedDelimiter('Excel Spreadsheet');
          setColumnMappings(parsed.suggestedMappings);

          setFileName(file.name);
          setIsParsing(false);
          setActiveStep('mapping');
        } catch (err: any) {
          alert('Failed to parse Excel file: ' + err.message);
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processRawCsv(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const processRawCsv = (csvText: string, name?: string) => {
    try {
      setRawTextContent(csvText);
      const parsed = parseCsvText(csvText);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        alert('The uploaded file appears to be empty or contains no valid rows.');
        setIsParsing(false);
        return;
      }

      setParsedHeaders(parsed.headers);
      setParsedRows(parsed.rows);
      setDetectedDelimiter(parsed.delimiter);
      setColumnMappings(parsed.suggestedMappings);

      if (name) setFileName(name);
      setIsParsing(false);
      setActiveStep('mapping');
    } catch (err: any) {
      alert('Error parsing CSV: ' + err.message);
      setIsParsing(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!rawTextContent.trim()) {
      alert('Please paste CSV text into the field.');
      return;
    }
    processRawCsv(rawTextContent, 'pasted_contacts.csv');
  };

  const loadSampleDataset = () => {
    const sample = generateSampleCsv();
    setFileName('sample_whatsapp_contacts_with_metadata.csv');
    setRawTextContent(sample);
    processRawCsv(sample, 'sample_whatsapp_contacts_with_metadata.csv');
  };

  const downloadSampleCsv = () => {
    const sample = generateSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_whatsapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleXlsx = () => {
    const headers = [
      'Phone',
      'Customer Name',
      'Email',
      'Group Name',
      'City',
      'Loyalty Tier',
      'Order ID',
      'Discount Code',
      'Reward Points'
    ];
    const sampleRows = [
      ['+919876543220', 'Vikram Singhania', 'vikram@example.com', 'VIP Club', 'Mumbai', 'Gold Tier', 'ORD-9021', 'FESTIVE25', '1450'],
      ['+919876543221', 'Natasha Verma', 'natasha@example.com', 'VIP Club', 'Pune', 'Silver Tier', 'ORD-9022', 'FESTIVE15', '620'],
      ['+919876543222', 'Aarav Patel', 'aarav@example.com', 'Diwali Promos', 'Delhi', 'Platinum Tier', 'ORD-9023', 'FESTIVE30', '3200'],
      ['+919876543223', 'Meera Nambiar', 'meera@example.com', 'Weekend Leads', 'Bengaluru', 'Diamond Tier', 'ORD-9024', 'FREE_SPA', '2100']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'sample_whatsapp_contacts_template.xlsx');
  };

  // Modify column mapping role
  const updateColumnRole = (columnName: string, role: ColumnRole) => {
    setColumnMappings((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        role,
        metadataKey:
          role === 'metadata'
            ? prev[columnName]?.metadataKey || sanitizeMetadataKey(columnName)
            : undefined
      }
    }));
  };

  const updateMetadataKey = (columnName: string, key: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        metadataKey: sanitizeMetadataKey(key)
      }
    }));
  };

  // Move from Mapping to Diagnostics / Preview
  const handleProceedToValidation = async () => {
    // Check if at least one column is mapped to 'phone'
    const hasPhone = Object.values(columnMappings).some((m) => m.role === 'phone');
    if (!hasPhone) {
      alert('Please assign at least one column as "Phone Number". Phone is required for WhatsApp messaging.');
      return;
    }

    // Determine target group info
    let targetGroupId: string | undefined = undefined;
    let targetGroupName: string | undefined = undefined;

    if (groupMode === 'existing') {
      targetGroupId = selectedGroupId || undefined;
      const g = groups.find((grp) => grp.id === selectedGroupId);
      if (g) targetGroupName = g.name;
    } else if (groupMode === 'new') {
      if (!newGroupName.trim()) {
        alert('Please enter a name for the new group.');
        return;
      }
      targetGroupName = newGroupName.trim();
    }

    setIsValidating(true);
    try {
      // 1. If user chose "new group", create it now via API
      let effectiveGroupId = targetGroupId;
      if (groupMode === 'new' && newGroupName.trim()) {
        const createRes = await api.createGroup(newGroupName.trim(), newGroupDescription.trim());
        if (createRes.success && createRes.group) {
          effectiveGroupId = createRes.group.id;
          setFinalGroupId(createRes.group.id);
        }
      } else if (effectiveGroupId) {
        setFinalGroupId(effectiveGroupId);
      } else {
        setFinalGroupId('');
      }

      // 2. Client-side mapping & normalization
      const clientProcess = processMappedRows(parsedRows, columnMappings, {
        defaultCountryCode: defaultCountryCode === 'none' ? undefined : defaultCountryCode,
        targetGroupId: effectiveGroupId,
        targetGroupName
      });

      // 3. Server-side validation against database contacts & duplicates
      const serverRes = await api.validateContactImport({
        rows: parsedRows,
        defaultGroupId: effectiveGroupId,
        defaultCountryCode: defaultCountryCode === 'none' ? undefined : defaultCountryCode,
        updateExisting: duplicateStrategy === 'update',
        columnMappings: Object.entries(columnMappings).reduce((acc, [col, m]) => {
          acc[col] = { role: m.role, metadataKey: m.metadataKey };
          return acc;
        }, {} as Record<string, { role: string; metadataKey?: string }>)
      });

      if (serverRes.success) {
        setValidationResult(serverRes.validation);
        setActiveStep('preview');
      } else {
        alert(serverRes.error || 'Failed to validate contacts import with server');
      }
    } catch (err: any) {
      alert('Validation error: ' + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Confirm and commit import
  const handleCommitImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setIsImporting(true);
    try {
      const res = await api.confirmContactImport(validationResult.validRows, {
        defaultGroupId: finalGroupId || selectedGroupId || undefined,
        createMissingGroups: true,
        updateExisting: duplicateStrategy === 'update'
      });

      if (res.success) {
        setImportSummary(res);
        setActiveStep('completed');
        onSuccess(finalGroupId || selectedGroupId || undefined);
      } else {
        alert(res.error || 'Failed to commit contacts to database');
      }
    } catch (err: any) {
      alert('Import error: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Preview rows filter
  const getFilteredPreviewRows = () => {
    if (!validationResult) return [];
    switch (previewFilter) {
      case 'valid':
        return validationResult.previewRows.filter((r: any) => r.isValid);
      case 'duplicates':
        return validationResult.previewRows.filter(
          (r: any) => r.status === 'duplicate_in_file' || r.status === 'duplicate_in_db'
        );
      case 'invalid':
        return validationResult.previewRows.filter((r: any) => r.status === 'invalid_phone');
      default:
        return validationResult.previewRows;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Bulk Contact & Metadata CSV Parser</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  E.164 Engine
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Upload CSV/XLSX, auto-detect columns, map metadata attributes, and bulk assign to contact groups.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <div
              className={`flex items-center space-x-2 ${
                activeStep === 'upload' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  activeStep === 'upload'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                1
              </span>
              <span>Upload & Target</span>
            </div>

            <span className="text-slate-600">/</span>

            <div
              className={`flex items-center space-x-2 ${
                activeStep === 'mapping' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  activeStep === 'mapping'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                2
              </span>
              <span>Column & Metadata Mapping</span>
            </div>

            <span className="text-slate-600">/</span>

            <div
              className={`flex items-center space-x-2 ${
                activeStep === 'preview' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  activeStep === 'preview'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                3
              </span>
              <span>Verification & Preview</span>
            </div>

            <span className="text-slate-600">/</span>

            <div
              className={`flex items-center space-x-2 ${
                activeStep === 'completed' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  activeStep === 'completed'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                4
              </span>
              <span>Completed</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-400">
            <button
              onClick={downloadSampleCsv}
              className="flex items-center space-x-1 text-slate-300 hover:text-blue-400 transition-colors cursor-pointer"
              title="Download sample CSV format"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Sample CSV</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={downloadSampleXlsx}
              className="flex items-center space-x-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Download sample Excel XLSX format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sample Excel</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-300">
          {/* STEP 1: UPLOAD & CONFIGURATION */}
          {activeStep === 'upload' && (
            <div className="space-y-6">
              {/* Target Group Assignment Card */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white flex items-center space-x-2">
                    <FolderGit2 className="w-4 h-4 text-emerald-400" />
                    <span>Assign Uploaded Contacts to Group</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Categorize contacts for targeted campaigns</span>
                </div>

                {/* Group Mode Radios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupMode('existing')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      groupMode === 'existing'
                        ? 'border-emerald-500/80 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-xs text-emerald-400">Existing Group</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select from {groups.length} available groups</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupMode('new')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      groupMode === 'new'
                        ? 'border-emerald-500/80 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-xs text-emerald-400">+ Create New Group</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Create a dedicated group on-the-fly</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupMode('from_csv')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      groupMode === 'from_csv'
                        ? 'border-emerald-500/80 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-xs text-emerald-400">Per-Row from CSV</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Route by "Group" column in file</p>
                  </button>
                </div>

                {/* Sub-inputs based on mode */}
                {groupMode === 'existing' && (
                  <div className="pt-2">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- No Group / Keep Unassigned --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.contact_count || 0} existing contacts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {groupMode === 'new' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="New Group Name (e.g. Diwali VIP Blitz)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Description (Optional)"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {groupMode === 'from_csv' && (
                  <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                    💡 The parser will look for a <strong>Group</strong> or <strong>Segment</strong> column in your CSV.
                    If the group exists, contacts are appended; if not, new groups are created automatically!
                  </p>
                )}
              </div>

              {/* Phone Formatting & Duplicate Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <label className="block text-slate-300 font-semibold">Default Country Dial Code</label>
                  <p className="text-[11px] text-slate-400">
                    Auto-prefixes local 10-digit numbers (e.g. <code className="text-emerald-400">9876543210</code>) if
                    country code is missing.
                  </p>
                  <select
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="+91">+91 (India)</option>
                    <option value="+1">+1 (USA / Canada)</option>
                    <option value="+44">+44 (United Kingdom)</option>
                    <option value="+971">+971 (United Arab Emirates)</option>
                    <option value="+65">+65 (Singapore)</option>
                    <option value="+61">+61 (Australia)</option>
                    <option value="+966">+966 (Saudi Arabia)</option>
                    <option value="none">None (Strict E.164 already in CSV)</option>
                  </select>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <label className="block text-slate-300 font-semibold">Duplicate Numbers Strategy</label>
                  <p className="text-[11px] text-slate-400">
                    Action to take when a phone number already exists in your client database.
                  </p>
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="skip"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-xs">Skip (Safe, No Overwrite)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="update"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-xs">Update Metadata</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone / Paste Switch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setUploadTab('file')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        uploadTab === 'file'
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Upload File (.csv, .xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab('paste')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        uploadTab === 'paste'
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Paste CSV Raw Text
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadSampleDataset}
                    className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Rich Metadata Sample</span>
                  </button>
                </div>

                {uploadTab === 'file' ? (
                  <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 rounded-2xl p-8 text-center transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="bulkContactFileInput"
                      accept=".csv, .xlsx, .xls, .tsv, .txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="bulkContactFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        {isParsing ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-400 hover:underline">
                          Click to select a CSV or Excel (.xlsx) file
                        </span>{' '}
                        or drag & drop here
                        <p className="text-[11px] text-slate-500 mt-1">
                          RFC-4180 auto-detects commas, tabs, semicolons, customer phone numbers, and custom metadata
                          attributes.
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={6}
                      value={rawTextContent}
                      onChange={(e) => setRawTextContent(e.target.value)}
                      placeholder="Paste comma or tab-separated text here...&#10;Phone,Name,Email,City,Tier,Points&#10;+919876543220,Vikram,vikram@example.com,Mumbai,Gold,1200"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handlePasteSubmit}
                        disabled={!rawTextContent.trim() || isParsing}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5"
                      >
                        <span>Parse Pasted Content</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN & METADATA MAPPING */}
          {activeStep === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    <span>CSV Header & Metadata Mapper</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Found <strong>{parsedHeaders.length} columns</strong> and <strong>{parsedRows.length} rows</strong>{' '}
                    (Delimiter: <code className="text-emerald-400">"{detectedDelimiter}"</code>). Verify or adjust
                    field mappings below.
                  </p>
                </div>
                <button
                  onClick={() => setActiveStep('upload')}
                  className="text-slate-400 hover:text-white text-xs underline cursor-pointer self-start sm:self-auto"
                >
                  Change File
                </button>
              </div>

              {/* Quick Auto-Detected Notice */}
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Phone numbers, customer names, and template variables (up to 25) have been auto-matched.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const phoneRole = Object.values(columnMappings).some(m => m.role === 'phone');
                    if (!phoneRole && parsedHeaders.length > 0) {
                      updateColumnRole(parsedHeaders[0], 'phone');
                    }
                    handleProceedToValidation();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer shrink-0 text-[11px]"
                >
                  Quick Import to Preview →
                </button>
              </div>

              {/* Column Mapping Table */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">CSV Column Header</th>
                      <th className="py-2.5 px-4">Sample Values</th>
                      <th className="py-2.5 px-4 w-64">Map To Field / Role</th>
                      <th className="py-2.5 px-4 w-44">Attribute Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {parsedHeaders.map((header) => {
                      const mapping = columnMappings[header] || {
                        columnName: header,
                        role: 'metadata',
                        metadataKey: sanitizeMetadataKey(header),
                        sampleValues: []
                      };

                      return (
                        <tr key={header} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-medium text-white">
                            <div className="flex items-center space-x-2">
                              <span>{header}</span>
                              {mapping.role === 'phone' && (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                  REQUIRED
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-400">
                            <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                              {mapping.sampleValues && mapping.sampleValues.length > 0 ? (
                                mapping.sampleValues.slice(0, 2).map((s, idx) => (
                                  <span key={idx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-600 italic">empty</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={mapping.role}
                              onChange={(e) => updateColumnRole(header, e.target.value as ColumnRole)}
                              className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                                mapping.role === 'phone'
                                  ? 'border-emerald-500 text-emerald-300 font-semibold'
                                  : mapping.role === 'ignore'
                                  ? 'border-slate-800 text-slate-500'
                                  : 'border-slate-700 text-slate-200'
                              }`}
                            >
                              <optgroup label="Core Contact Attributes">
                                <option value="phone">📞 Phone Number (Required)</option>
                                <option value="name">👤 Customer Name</option>
                                <option value="email">✉️ Email Address</option>
                                <option value="group">📁 Contact Group</option>
                              </optgroup>
                              {mapping.role.startsWith('var') && (
                                <optgroup label="Matched Template Variable">
                                  <option value={mapping.role}>
                                    ✨ Variable {mapping.role.replace('var', '')} ({`{{${mapping.role.replace('var', '')}}}`})
                                  </option>
                                </optgroup>
                              )}
                              <optgroup label="Dynamic Attributes & Actions">
                                <option value="metadata">📦 Custom Column Attribute</option>
                                <option value="ignore">🚫 Do Not Import (Ignore)</option>
                              </optgroup>
                            </select>
                          </td>

                          <td className="py-3 px-4">
                            {mapping.role === 'metadata' ? (
                              <input
                                type="text"
                                value={mapping.metadataKey || ''}
                                onChange={(e) => updateMetadataKey(header, e.target.value)}
                                placeholder="attribute_name"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                              />
                            ) : (
                              <span className="text-slate-600 text-[11px] italic">
                                {mapping.role === 'ignore' ? 'Skipped' : 'Standard field'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VERIFICATION */}
          {activeStep === 'preview' && validationResult && (
            <div className="space-y-4">
              {/* Metric KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-[11px] text-slate-400">Total in File</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">{validationResult.totalRows}</p>
                </div>
                <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40">
                  <p className="text-[11px] text-emerald-400 font-medium">Valid for Import</p>
                  <p className="text-xl font-bold font-mono text-emerald-300 mt-1">{validationResult.validCount}</p>
                </div>
                <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-800/40">
                  <p className="text-[11px] text-amber-400 font-medium">Duplicates</p>
                  <p className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {validationResult.duplicateInFileCount + validationResult.duplicateInDbCount}
                  </p>
                </div>
                <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-800/40">
                  <p className="text-[11px] text-rose-400 font-medium">Invalid Format</p>
                  <p className="text-xl font-bold font-mono text-rose-300 mt-1">{validationResult.invalidPhoneCount}</p>
                </div>
              </div>

              {/* Preview table filter tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      previewFilter === 'all'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({validationResult.previewRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ready ({validationResult.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('duplicates')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      previewFilter === 'duplicates'
                        ? 'bg-amber-950/50 text-amber-300 border border-amber-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Duplicates ({validationResult.duplicateInFileCount + validationResult.duplicateInDbCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('invalid')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      previewFilter === 'invalid'
                        ? 'bg-rose-950/50 text-rose-300 border border-rose-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Invalid ({validationResult.invalidPhoneCount})
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  Target Group:{' '}
                  <strong className="text-emerald-400">
                    {finalGroupId
                      ? groups.find((g) => g.id === finalGroupId)?.name || newGroupName || 'Selected Group'
                      : newGroupName || 'Unassigned'}
                  </strong>
                </span>
              </div>

              {/* Records preview table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Phone (E.164)</th>
                      <th className="py-2 px-3">Group</th>
                      <th className="py-2 px-3">Metadata & Custom Fields</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/50">
                    {getFilteredPreviewRows().map((r: any) => (
                      <tr key={r.rowIndex} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-mono text-slate-500">{r.rowIndex}</td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-white">{r.name}</div>
                          {r.email && <div className="text-[10px] text-slate-400">{r.email}</div>}
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-400 font-medium">{r.phone}</td>
                        <td className="py-2 px-3">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                            {r.group_name || groups.find((g) => g.id === r.group_id)?.name || 'Default Group'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {r.custom1 && (
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                                c1: {r.custom1}
                              </span>
                            )}
                            {r.custom2 && (
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                                c2: {r.custom2}
                              </span>
                            )}
                            {r.metadata &&
                              Object.entries(r.metadata).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]"
                                >
                                  {k}: {String(v)}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {r.status === 'valid' && (
                            <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          )}
                          {r.status === 'duplicate_in_db' && (
                            <span
                              className="inline-flex items-center space-x-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]"
                              title={r.error}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Exists</span>
                            </span>
                          )}
                          {r.status === 'duplicate_in_file' && (
                            <span
                              className="inline-flex items-center space-x-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]"
                              title={r.error}
                            >
                              <Copy className="w-3 h-3" />
                              <span>File Dup</span>
                            </span>
                          )}
                          {r.status === 'invalid_phone' && (
                            <span
                              className="inline-flex items-center space-x-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px]"
                              title={r.error}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Invalid</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <div>
                  <strong>Strategy:</strong>{' '}
                  {duplicateStrategy === 'skip'
                    ? 'Duplicate contacts will be skipped without overriding existing data.'
                    : 'Existing contact profiles will have their metadata merged & updated with this CSV.'}
                </div>
                <span className="text-emerald-400 font-semibold">{validationResult.validCount} will be committed</span>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETED */}
          {activeStep === 'completed' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Contacts & Metadata Imported!</h3>
                <p className="text-slate-400 mt-1 max-w-md mx-auto">
                  Successfully imported <strong>{importSummary?.imported_count || 0}</strong> new contacts
                  {importSummary?.updated_count > 0 && (
                    <span>
                      {' '}
                      and updated <strong>{importSummary.updated_count}</strong> existing contacts
                    </span>
                  )}{' '}
                  into your customer database.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  View Contacts in Database
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {activeStep === 'upload' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              {rawTextContent.trim() && (
                <button
                  type="button"
                  onClick={() => processRawCsv(rawTextContent)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Parse CSV Data</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {activeStep === 'mapping' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={() => setActiveStep('upload')}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={isValidating}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Format...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Records ({parsedRows.length} Rows)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {activeStep === 'preview' && (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={() => setActiveStep('mapping')}
                className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust Mappings</span>
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isImporting || validationResult.validCount === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Bulk Import ({validationResult.validCount} Contacts)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
