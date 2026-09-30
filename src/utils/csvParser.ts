/**
 * Advanced RFC-4180 compliant CSV & Delimited Text Parser
 * Features:
 * - Automatic delimiter detection (comma, semicolon, tab, pipe)
 * - BOM (\uFEFF) stripping & quote escaping ("")
 * - Smart header role auto-detection (Phone, Name, Email, Group, Custom 1-5, Dynamic Metadata)
 * - Intelligent phone number normalization with country dial code support
 * - In-file duplicate detection
 */

import Papa from 'papaparse';

export type ColumnRole =
  | 'phone'
  | 'name'
  | 'email'
  | 'group'
  | 'custom1'
  | 'custom2'
  | 'custom3'
  | 'custom4'
  | 'custom5'
  | 'custom6'
  | 'custom7'
  | 'custom8'
  | 'custom9'
  | 'custom10'
  | 'var1'
  | 'var2'
  | 'var3'
  | 'var4'
  | 'var5'
  | 'var6'
  | 'var7'
  | 'var8'
  | 'var9'
  | 'var10'
  | 'var11'
  | 'var12'
  | 'var13'
  | 'var14'
  | 'var15'
  | 'var16'
  | 'var17'
  | 'var18'
  | 'var19'
  | 'var20'
  | 'var21'
  | 'var22'
  | 'var23'
  | 'var24'
  | 'var25'
  | 'metadata'
  | 'ignore';

export interface ColumnMappingItem {
  columnName: string;
  role: ColumnRole;
  metadataKey?: string; // used when role === 'metadata'
  sampleValues: string[];
}

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  delimiter: string;
  previewRows: Record<string, string>[];
  suggestedMappings: Record<string, ColumnMappingItem>;
}

export interface NormalizedContactRecord {
  rowIndex: number;
  rawPhone: string;
  phone: string;
  name: string;
  email?: string;
  group_name?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  custom6?: string;
  custom7?: string;
  custom8?: string;
  custom9?: string;
  custom10?: string;
  variables?: Record<string, string>;
  metadata: Record<string, string>;
  isValid: boolean;
  validationStatus: 'valid' | 'duplicate_in_file' | 'invalid_phone';
  errorMessage?: string;
}

/**
 * Detect delimiter by evaluating candidate frequency on first lines
 */
export function detectDelimiter(text: string): string {
  const candidates = [',', ';', '\t', '|'];
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === delim && !inQuotes) count++;
      }
      return count;
    });

    // Check if count > 0 and consistent across lines
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    if (minCount > 0 && maxCount === minCount) {
      const score = minCount * 100;
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delim;
      }
    } else if (counts[0] > 0 && counts[0] * 10 > bestScore) {
      bestScore = counts[0] * 10;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Parse CSV text into headers and structured row records
 */
export function parseCsvText(rawText: string, forcedDelimiter?: string): ParsedCsvData {
  // Strip BOM if present
  let cleanText = rawText.replace(/^\uFEFF/, '').trim();
  const delimiter = forcedDelimiter || detectDelimiter(cleanText);

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    delimiter: delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim().replace(/^["']|["']$/g, '')
  });

  const rawHeaders = parsed.meta.fields || (parsed.data.length > 0 ? Object.keys(parsed.data[0]) : []);
  const headers = rawHeaders.map((h) => h.trim()).filter((h) => h.length > 0 && !h.startsWith('__EMPTY'));
  const rows = (parsed.data as Record<string, string>[]).filter((r) => {
    // Check if at least one cell has content
    return Object.values(r).some((val) => typeof val === 'string' && val.trim().length > 0);
  });

  // Build sample values for each column
  const suggestedMappings: Record<string, ColumnMappingItem> = {};
  headers.forEach(header => {
    const samples = rows
      .map(r => r[header]?.trim())
      .filter((v): v is string => Boolean(v))
      .slice(0, 3);

    const role = autoDetectColumnRole(header, samples);
    suggestedMappings[header] = {
      columnName: header,
      role: role.role,
      metadataKey: role.metadataKey || sanitizeMetadataKey(header),
      sampleValues: samples
    };
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
    delimiter,
    previewRows: rows.slice(0, 5),
    suggestedMappings
  };
}

/**
 * Create structured ParsedCsvData directly from parsed rows (e.g. from Excel sheet_to_json)
 */
export function buildParsedDataFromRows(
  rows: Record<string, any>[],
  forcedDelimiter = ','
): ParsedCsvData {
  if (!rows || rows.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      delimiter: forcedDelimiter,
      previewRows: [],
      suggestedMappings: {}
    };
  }

  // Extract and clean headers
  const rawHeaders = Object.keys(rows[0])
    .map((h) => h.trim())
    .filter((h) => h && !h.startsWith('__EMPTY'));

  const cleanRows = rows
    .map((r) => {
      const clean: Record<string, string> = {};
      rawHeaders.forEach((h) => {
        clean[h] = r[h] !== undefined && r[h] !== null ? String(r[h]).trim() : '';
      });
      return clean;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));

  const suggestedMappings: Record<string, ColumnMappingItem> = {};
  rawHeaders.forEach((header) => {
    const samples = cleanRows
      .map((r) => r[header])
      .filter((v): v is string => Boolean(v && v.trim()))
      .slice(0, 3);

    const role = autoDetectColumnRole(header, samples);
    suggestedMappings[header] = {
      columnName: header,
      role: role.role,
      metadataKey: role.metadataKey || sanitizeMetadataKey(header),
      sampleValues: samples
    };
  });

  return {
    headers: rawHeaders,
    rows: cleanRows,
    totalRows: cleanRows.length,
    delimiter: forcedDelimiter,
    previewRows: cleanRows.slice(0, 5),
    suggestedMappings
  };
}

/**
 * Intelligent role detection based on header name and sample values
 */
function autoDetectColumnRole(header: string, sampleValues: string[]): { role: ColumnRole; metadataKey?: string } {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Phone number detection (matches number, mobile, whatsapp, phone, etc.)
  if (/^(phone|mobile|cell|tel|whatsapp|contact|contactno|contactnumber|number|phonenumber|msisdn|customermobile|mobilenumber|phoneno|ph)$/i.test(norm)) {
    return { role: 'phone' };
  }
  // Check if sample values look like phone numbers
  if (sampleValues.length > 0 && sampleValues.every(s => /^\+?[\d\s\-().]{8,20}$/.test(s.trim()))) {
    return { role: 'phone' };
  }

  // 2. Customer Name detection
  if (/^(name|fullname|full_name|customername|clientname|contactname|firstname|recipientname|username|custname)$/i.test(norm)) {
    return { role: 'name' };
  }

  // 3. Email
  if (/^(email|mail|emailaddress|emailid)$/i.test(norm)) {
    return { role: 'email' };
  }
  if (sampleValues.length > 0 && sampleValues.some(s => s.includes('@') && s.includes('.'))) {
    return { role: 'email' };
  }

  // 4. Group / Segment
  if (/^(group|groupname|segment|category|tag|list)$/i.test(norm)) {
    return { role: 'group' };
  }

  // 5. Template Variables (var1 to var25, variable1 to variable25, v1 to v25)
  const varMatch = norm.match(/^(?:var|variable|v|param)([1-9]|1[0-9]|2[0-5])$/);
  if (varMatch) {
    const num = varMatch[1];
    return { role: `var${num}` as ColumnRole };
  }

  // 6. Custom Fields 1 - 10
  const customMatch = norm.match(/^custom(?:field)?([1-9]|10)$/);
  if (customMatch) {
    const num = customMatch[1];
    return { role: `custom${num}` as ColumnRole };
  }

  // Everything else becomes dynamic metadata!
  return { role: 'metadata', metadataKey: sanitizeMetadataKey(header) };
}

/**
 * Sanitize string into clean metadata key (e.g. "Order ID #" -> "order_id")
 */
export function sanitizeMetadataKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'metadata';
}

/**
 * Normalize phone number with country dial code assistance
 */
export function normalizePhone(rawPhone: string, defaultCountryCode?: string): { phone: string; isValid: boolean; error?: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { phone: '', isValid: false, error: 'Empty phone number' };
  }

  // Strip spaces, dashes, dots, parentheses, brackets
  let clean = rawPhone.trim().replace(/[\s\-\(\)\.\[\]]/g, '');

  // If starts with 00, convert to +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  // If already starts with +
  if (clean.startsWith('+')) {
    const digitsOnly = clean.slice(1).replace(/\D/g, '');
    const formatted = '+' + digitsOnly;
    // E.164 standard: + followed by 7 to 15 digits
    const isValid = /^\+[1-9]\d{6,14}$/.test(formatted);
    return {
      phone: formatted,
      isValid,
      error: isValid ? undefined : 'Must be valid E.164 format (+[country code][digits], 7-15 digits total)'
    };
  }

  // Number lacks leading +
  const digitsOnly = clean.replace(/\D/g, '');

  if (defaultCountryCode && defaultCountryCode.trim()) {
    const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : '+' + defaultCountryCode;
    const cleanPrefixDigits = prefix.replace(/\D/g, '');

    // Check if the number already has the country code digits without the '+'
    if (digitsOnly.startsWith(cleanPrefixDigits) && digitsOnly.length > cleanPrefixDigits.length + 6) {
      const formatted = '+' + digitsOnly;
      const isValid = /^\+[1-9]\d{6,14}$/.test(formatted);
      return {
        phone: formatted,
        isValid,
        error: isValid ? undefined : 'Invalid number length'
      };
    }

    // If starts with leading 0 (common local format e.g. 09876543210), strip the leading 0
    let localDigits = digitsOnly;
    if (localDigits.startsWith('0')) {
      localDigits = localDigits.replace(/^0+/, '');
    }

    const formatted = `${prefix}${localDigits}`;
    const isValid = /^\+[1-9]\d{6,14}$/.test(formatted);
    return {
      phone: formatted,
      isValid,
      error: isValid ? undefined : `Failed to format with default code ${prefix} (result: ${formatted})`
    };
  }

  // No country code provided and no '+': try prepend '+'
  const formatted = '+' + digitsOnly;
  const isValid = /^\+[1-9]\d{6,14}$/.test(formatted);
  return {
    phone: formatted,
    isValid,
    error: isValid ? undefined : 'Missing country dial code (e.g. +91 or +1)'
  };
}

/**
 * Process parsed CSV rows with column mappings and produce normalized contacts
 */
export function processMappedRows(
  rows: Record<string, string>[],
  mappings: Record<string, ColumnMappingItem>,
  options: {
    defaultCountryCode?: string;
    targetGroupId?: string;
    targetGroupName?: string;
  }
): {
  records: NormalizedContactRecord[];
  validCount: number;
  duplicateInFileCount: number;
  invalidPhoneCount: number;
} {
  const seenPhones = new Set<string>();
  const records: NormalizedContactRecord[] = [];

  let validCount = 0;
  let duplicateInFileCount = 0;
  let invalidPhoneCount = 0;

  // Find which column maps to which role
  let phoneCol = '';
  let nameCol = '';
  let emailCol = '';
  let groupCol = '';
  const customCols: Record<string, string> = {}; // 'custom1'..'custom10' -> colName
  const varCols: Record<string, string> = {}; // '1'..'25' -> colName
  const metadataCols: Array<{ colName: string; key: string }> = [];

  Object.entries(mappings).forEach(([colName, mapping]) => {
    if (mapping.role === 'phone') {
      phoneCol = colName;
    } else if (mapping.role === 'name') {
      nameCol = colName;
    } else if (mapping.role === 'email') {
      emailCol = colName;
    } else if (mapping.role === 'group') {
      groupCol = colName;
    } else if (mapping.role.startsWith('custom')) {
      customCols[mapping.role] = colName;
    } else if (mapping.role.startsWith('var')) {
      const varNum = mapping.role.replace('var', '');
      varCols[varNum] = colName;
    } else if (mapping.role === 'metadata') {
      metadataCols.push({
        colName,
        key: mapping.metadataKey || sanitizeMetadataKey(colName)
      });
    }
  });

  // If no phone column mapped, fall back to first column
  if (!phoneCol && Object.keys(mappings).length > 0) {
    phoneCol = Object.keys(mappings)[0];
  }

  rows.forEach((row, idx) => {
    const rawPhone = (row[phoneCol] || '').trim();
    const rawName = nameCol ? (row[nameCol] || '').trim() : '';
    const rawEmail = emailCol ? (row[emailCol] || '').trim() : undefined;
    const rawGroup = groupCol ? (row[groupCol] || '').trim() : options.targetGroupName || undefined;

    const norm = normalizePhone(rawPhone, options.defaultCountryCode);
    const cleanComparable = norm.phone.replace(/\D/g, '');

    // Extract metadata
    const metadata: Record<string, string> = {};
    metadataCols.forEach(m => {
      const val = row[m.colName]?.trim();
      if (val !== undefined && val !== '') {
        metadata[m.key] = val;
      }
    });

    // Extract variables 1 to 25
    const variables: Record<string, string> = {};
    Object.entries(varCols).forEach(([slot, colName]) => {
      const val = row[colName]?.trim();
      if (val !== undefined && val !== '') {
        variables[slot] = val;
      }
    });
    // Also check if any metadata column is named numeric (e.g. 1..25)
    Object.entries(metadata).forEach(([k, val]) => {
      if (/^[1-9]$|^1[0-9]$|^2[0-5]$/.test(k) && !variables[k]) {
        variables[k] = val;
      }
    });

    const record: NormalizedContactRecord = {
      rowIndex: idx + 1,
      rawPhone,
      phone: norm.phone,
      name: rawName || (norm.isValid ? `Customer ${norm.phone.slice(-4)}` : 'Unknown'),
      email: rawEmail || undefined,
      group_name: rawGroup,
      custom1: customCols['custom1'] ? row[customCols['custom1']]?.trim() || undefined : undefined,
      custom2: customCols['custom2'] ? row[customCols['custom2']]?.trim() || undefined : undefined,
      custom3: customCols['custom3'] ? row[customCols['custom3']]?.trim() || undefined : undefined,
      custom4: customCols['custom4'] ? row[customCols['custom4']]?.trim() || undefined : undefined,
      custom5: customCols['custom5'] ? row[customCols['custom5']]?.trim() || undefined : undefined,
      custom6: customCols['custom6'] ? row[customCols['custom6']]?.trim() || undefined : undefined,
      custom7: customCols['custom7'] ? row[customCols['custom7']]?.trim() || undefined : undefined,
      custom8: customCols['custom8'] ? row[customCols['custom8']]?.trim() || undefined : undefined,
      custom9: customCols['custom9'] ? row[customCols['custom9']]?.trim() || undefined : undefined,
      custom10: customCols['custom10'] ? row[customCols['custom10']]?.trim() || undefined : undefined,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      metadata,
      isValid: false,
      validationStatus: 'valid'
    };

    if (!norm.isValid) {
      record.isValid = false;
      record.validationStatus = 'invalid_phone';
      record.errorMessage = norm.error || 'Invalid phone number format';
      invalidPhoneCount++;
    } else if (seenPhones.has(cleanComparable)) {
      record.isValid = false;
      record.validationStatus = 'duplicate_in_file';
      record.errorMessage = 'Duplicate phone number in uploaded file';
      duplicateInFileCount++;
    } else {
      record.isValid = true;
      record.validationStatus = 'valid';
      validCount++;
      seenPhones.add(cleanComparable);
    }

    records.push(record);
  });

  return {
    records,
    validCount,
    duplicateInFileCount,
    invalidPhoneCount
  };
}

/**
 * Generate a comprehensive sample CSV template with rich metadata
 */
export function generateSampleCsv(): string {
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
    ['+919876543223', 'Meera Nambiar', 'meera@example.com', 'Weekend Leads', 'Bengaluru', 'Diamond Tier', 'ORD-9024', 'FREE_SPA', '2100'],
    ['+919876543224', 'Kabir Sen', 'kabir@example.com', 'Diwali Promos', 'Kolkata', 'Gold Tier', 'ORD-9025', 'FESTIVE20', '980'],
    ['9876543225', 'Rhea Kapoor', 'rhea@example.com', 'VIP Club', 'Mumbai', 'Silver Tier', 'ORD-9026', 'FESTIVE10', '450'],
    ['+919876543220', 'Duplicate Vikram', 'dup@example.com', 'VIP Club', 'Mumbai', 'Gold Tier', 'ORD-DUP', 'NONE', '0'],
    ['12345', 'Invalid Contact', 'bad@example.com', 'Test Group', 'Unknown', 'None', 'ORD-BAD', 'NONE', '0']
  ];

  return [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}
