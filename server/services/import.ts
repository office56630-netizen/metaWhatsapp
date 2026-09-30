import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, Contact, ContactGroup } from '../db';
import { ContactService } from './contact';
import crypto from 'crypto';

export interface ValidatedContactRow {
  rowIndex: number;
  phone: string;
  name: string;
  email?: string;
  group_id?: string | null;
  group_name?: string;
  metadata?: Record<string, string>;
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
  isValid: boolean;
  status: 'valid' | 'duplicate_in_file' | 'duplicate_in_db' | 'invalid_phone';
  error?: string;
  existingContactId?: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validCount: number;
  duplicateInFileCount: number;
  duplicateInDbCount: number;
  invalidPhoneCount: number;
  previewRows: ValidatedContactRow[];
  validRows: ValidatedContactRow[];
}

export class ImportService {
  /**
   * Parse either raw CSV string or Buffer (CSV or XLSX)
   */
  public static parseFile(fileContent: string | Buffer, fileType: 'csv' | 'xlsx' = 'csv'): any[] {
    if (fileType === 'xlsx' || Buffer.isBuffer(fileContent)) {
      try {
        const workbook = XLSX.read(fileContent, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } catch (e) {
        if (Buffer.isBuffer(fileContent)) {
          const csvText = fileContent.toString('utf-8');
          const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
          return parsed.data;
        }
        throw e;
      }
    } else {
      const parsed = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true });
      return parsed.data;
    }
  }

  /**
   * Validate contacts before committing import
   */
  public static validateContactImport(
    clientId: string,
    rows: any[],
    options?: {
      defaultGroupId?: string;
      defaultCountryCode?: string;
      updateExisting?: boolean;
      columnMappings?: Record<string, { role: string; metadataKey?: string }>;
    }
  ): ImportValidationResult {
    const { defaultGroupId, defaultCountryCode, updateExisting, columnMappings } = options || {};

    const existingContacts = db.getContacts(clientId).contacts;
    const existingPhoneMap = new Map<string, Contact>();
    existingContacts.forEach(c => {
      existingPhoneMap.set(c.phone.replace(/[\s\-\(\)\.\[\]]/g, ''), c);
    });

    const groups = db.getGroups(clientId);
    const groupNameMap = new Map<string, string>();
    groups.forEach(g => groupNameMap.set(g.name.toLowerCase().trim(), g.id));

    const seenInFilePhones = new Set<string>();
    const validatedRows: ValidatedContactRow[] = [];

    let validCount = 0;
    let duplicateInFileCount = 0;
    let duplicateInDbCount = 0;
    let invalidPhoneCount = 0;

    rows.forEach((row, idx) => {
      // Find roles either through provided mappings or heuristic auto-detection
      let rawPhone = '';
      let rawName = '';
      let rawEmail = '';
      let rawGroupName = '';
      let c1: string | undefined;
      let c2: string | undefined;
      let c3: string | undefined;
      let c4: string | undefined;
      let c5: string | undefined;
      const metadata: Record<string, string> = {};

      if (columnMappings && Object.keys(columnMappings).length > 0) {
        Object.entries(columnMappings).forEach(([colHeader, mapping]) => {
          const val = row[colHeader] !== undefined ? String(row[colHeader]).trim() : '';
          switch (mapping.role) {
            case 'phone':
              rawPhone = val;
              break;
            case 'name':
              rawName = val;
              break;
            case 'email':
              rawEmail = val;
              break;
            case 'group':
              rawGroupName = val;
              break;
            case 'custom1':
            case 'custom2':
            case 'custom3':
            case 'custom4':
            case 'custom5':
            case 'custom6':
            case 'custom7':
            case 'custom8':
            case 'custom9':
            case 'custom10':
              if (mapping.role === 'custom1') c1 = val || undefined;
              if (mapping.role === 'custom2') c2 = val || undefined;
              if (mapping.role === 'custom3') c3 = val || undefined;
              if (mapping.role === 'custom4') c4 = val || undefined;
              if (mapping.role === 'custom5') c5 = val || undefined;
              break;
            case 'metadata':
              if (val) {
                const k = mapping.metadataKey || colHeader.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                metadata[k] = val;
              }
              break;
            default:
              if (mapping.role && mapping.role.startsWith('var')) {
                const num = mapping.role.replace('var', '');
                if (val) metadata[`var_${num}`] = val;
              }
              break;
          }
        });
      } else {
        // Fallback auto-detection
        const keys = Object.keys(row);
        const phoneKey = keys.find(k => /^(phone|mobile|number|cell|tel|whatsapp|contact|ph)/i.test(k.trim())) || keys[0];
        const nameKey = keys.find(k => /^(name|fullname|full_name|customer|client|recipient)/i.test(k.trim())) || keys[1];
        const emailKey = keys.find(k => /^(email|mail)/i.test(k.trim()));
        const groupKey = keys.find(k => /^(group|segment|category|tag)/i.test(k.trim()));
        const c1Key = keys.find(k => /^(custom1|custom_1|c1|id|order|order_id)/i.test(k.trim()));
        const c2Key = keys.find(k => /^(custom2|custom_2|c2|location|city|branch)/i.test(k.trim()));
        const c3Key = keys.find(k => /^(custom3|custom_3|c3|tier|membership)/i.test(k.trim()));
        const c4Key = keys.find(k => /^(custom4|custom_4|c4|amount|discount|offer)/i.test(k.trim()));
        const c5Key = keys.find(k => /^(custom5|custom_5|c5|date|expiry|slot)/i.test(k.trim()));

        rawPhone = String(row[phoneKey] || '').trim();
        rawName = nameKey ? String(row[nameKey] || '').trim() : '';
        rawEmail = emailKey ? String(row[emailKey] || '').trim() : '';
        rawGroupName = groupKey ? String(row[groupKey] || '').trim() : '';
        c1 = c1Key ? String(row[c1Key] || '').trim() || undefined : undefined;
        c2 = c2Key ? String(row[c2Key] || '').trim() || undefined : undefined;
        c3 = c3Key ? String(row[c3Key] || '').trim() || undefined : undefined;
        c4 = c4Key ? String(row[c4Key] || '').trim() || undefined : undefined;
        c5 = c5Key ? String(row[c5Key] || '').trim() || undefined : undefined;

        // Any remaining column becomes metadata and variable
        const mappedKeys = new Set([phoneKey, nameKey, emailKey, groupKey, c1Key, c2Key, c3Key, c4Key, c5Key].filter(Boolean));
        keys.forEach(k => {
          if (!mappedKeys.has(k) && row[k] !== undefined && String(row[k]).trim() !== '') {
            const cleanKey = k.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
            metadata[cleanKey] = String(row[k]).trim();
          }
        });
      }

      // Extract variables 1 to 25 from metadata if present
      const variablesMap: Record<string, string> = {};
      Object.entries(metadata).forEach(([k, val]) => {
        const numMatch = k.match(/^(?:var_?|v)?([1-9]|1[0-9]|2[0-5])$/);
        if (numMatch) {
          variablesMap[numMatch[1]] = val;
        }
      });

      const normPhone = ContactService.normalizePhone(rawPhone, defaultCountryCode);
      const cleanComparablePhone = normPhone.replace(/[\s\-\(\)\.\[\]]/g, '');

      // Resolve group
      let assignedGroupId = defaultGroupId || null;
      if (rawGroupName && groupNameMap.has(rawGroupName.toLowerCase())) {
        assignedGroupId = groupNameMap.get(rawGroupName.toLowerCase()) || null;
      }

      const item: ValidatedContactRow = {
        rowIndex: idx + 1,
        phone: normPhone,
        name: rawName || (ContactService.isValidPhone(normPhone) ? `Customer ${normPhone.slice(-4)}` : 'Unknown'),
        email: rawEmail || undefined,
        group_id: assignedGroupId,
        group_name: rawGroupName || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        variables: Object.keys(variablesMap).length > 0 ? variablesMap : undefined,
        custom1: c1,
        custom2: c2,
        custom3: c3,
        custom4: c4,
        custom5: c5,
        isValid: false,
        status: 'valid'
      };

      if (!rawPhone || !ContactService.isValidPhone(normPhone)) {
        item.status = 'invalid_phone';
        item.error = 'Invalid phone number format. Must be international E.164 format (+[country code][digits]).';
        invalidPhoneCount++;
      } else if (seenInFilePhones.has(cleanComparablePhone)) {
        item.status = 'duplicate_in_file';
        item.error = 'Duplicate phone number found in uploaded file.';
        duplicateInFileCount++;
      } else if (existingPhoneMap.has(cleanComparablePhone)) {
        const existing = existingPhoneMap.get(cleanComparablePhone)!;
        item.existingContactId = existing.id;
        if (updateExisting) {
          item.isValid = true;
          item.status = 'valid';
          validCount++;
          seenInFilePhones.add(cleanComparablePhone);
        } else {
          item.status = 'duplicate_in_db';
          item.error = `Already exists in client contacts (Existing: ${existing.name}).`;
          duplicateInDbCount++;
        }
      } else {
        item.isValid = true;
        item.status = 'valid';
        validCount++;
        seenInFilePhones.add(cleanComparablePhone);
      }

      validatedRows.push(item);
    });

    const validRows = validatedRows.filter(r => r.isValid);
    const previewRows = validatedRows.slice(0, 20);

    return {
      totalRows: rows.length,
      validCount,
      duplicateInFileCount,
      duplicateInDbCount,
      invalidPhoneCount,
      previewRows,
      validRows
    };
  }

  /**
   * Commit verified contacts to database
   */
  public static commitContactImport(
    clientId: string,
    validRows: ValidatedContactRow[],
    options?: {
      defaultGroupId?: string;
      createMissingGroups?: boolean;
      updateExisting?: boolean;
    }
  ): { importedCount: number; updatedCount: number; contacts: Contact[] } {
    const { defaultGroupId, createMissingGroups = true, updateExisting = false } = options || {};

    const existingGroups = db.getGroups(clientId);
    const groupNameMap = new Map<string, ContactGroup>();
    existingGroups.forEach(g => groupNameMap.set(g.name.toLowerCase().trim(), g));

    const inserted: Contact[] = [];
    let updatedCount = 0;

    for (const r of validRows) {
      // Group resolution / auto-creation
      let targetGroupId = r.group_id || defaultGroupId || null;

      if (!targetGroupId && r.group_name && r.group_name.trim()) {
        const groupNorm = r.group_name.toLowerCase().trim();
        if (groupNameMap.has(groupNorm)) {
          targetGroupId = groupNameMap.get(groupNorm)!.id;
        } else if (createMissingGroups) {
          const newGroup = ContactService.createGroup(
            clientId,
            r.group_name.trim(),
            `Auto-created during bulk contact import on ${new Date().toLocaleDateString()}`
          );
          groupNameMap.set(groupNorm, newGroup);
          targetGroupId = newGroup.id;
        }
      }

      // Check if updating existing
      if (updateExisting && r.existingContactId) {
        const existing = db.getContactById(clientId, r.existingContactId);
        if (existing) {
          const mergedMetadata = {
            ...(existing.metadata || {}),
            ...(r.metadata || {})
          };

          const patch: Partial<Contact> = {
            name: r.name || existing.name,
            email: r.email || existing.email,
            group_id: targetGroupId || existing.group_id,
            metadata: mergedMetadata,
            custom1: r.custom1 || existing.custom1,
            custom2: r.custom2 || existing.custom2,
            custom3: r.custom3 || existing.custom3,
            custom4: r.custom4 || existing.custom4,
            custom5: r.custom5 || existing.custom5,
            custom6: r.custom6 || existing.custom6,
            custom7: r.custom7 || existing.custom7,
            custom8: r.custom8 || existing.custom8,
            custom9: r.custom9 || existing.custom9,
            custom10: r.custom10 || existing.custom10,
            variables: { ...(existing.variables || {}), ...(r.variables || {}) },
            updated_at: new Date().toISOString()
          };

          db.updateContact(clientId, existing.id, patch);
          updatedCount++;
          continue;
        }
      }

      const contact: Contact = {
        id: `CNT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        client_id: clientId,
        name: r.name,
        phone: r.phone,
        email: r.email,
        group_id: targetGroupId,
        metadata: r.metadata || {},
        variables: r.variables || {},
        custom1: r.custom1,
        custom2: r.custom2,
        custom3: r.custom3,
        custom4: r.custom4,
        custom5: r.custom5,
        custom6: r.custom6,
        custom7: r.custom7,
        custom8: r.custom8,
        custom9: r.custom9,
        custom10: r.custom10,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.insertContact(contact);
      inserted.push(contact);
    }

    return {
      importedCount: inserted.length,
      updatedCount,
      contacts: inserted
    };
  }
}
