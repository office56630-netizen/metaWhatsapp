import { db, Contact, ContactGroup } from '../db';
import crypto from 'crypto';

export class ContactService {
  public static normalizePhone(phone: string, defaultCountryCode?: string): string {
    if (!phone) return '';
    // Strip spaces, dashes, dots, parentheses, brackets
    let clean = phone.trim().replace(/[\s\-\(\)\.\[\]]/g, '');
    if (clean.startsWith('00')) {
      clean = '+' + clean.slice(2);
    }
    if (clean.startsWith('+')) {
      return clean;
    }
    // Number without +
    const digitsOnly = clean.replace(/\D/g, '');
    if (defaultCountryCode && defaultCountryCode.trim()) {
      const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : '+' + defaultCountryCode;
      const prefixDigits = prefix.replace(/\D/g, '');
      if (digitsOnly.startsWith(prefixDigits) && digitsOnly.length > prefixDigits.length + 6) {
        return '+' + digitsOnly;
      }
      let localDigits = digitsOnly;
      if (localDigits.startsWith('0')) {
        localDigits = localDigits.replace(/^0+/, '');
      }
      return `${prefix}${localDigits}`;
    }
    return '+' + clean;
  }

  public static isValidPhone(phone: string): boolean {
    const clean = this.normalizePhone(phone);
    // E.164 pattern: + followed by 7 to 15 digits
    return /^\+[1-9]\d{6,14}$/.test(clean);
  }

  public static createContact(clientId: string, data: {
    name: string;
    phone: string;
    email?: string;
    group_id?: string | null;
    metadata?: Record<string, string>;
    custom1?: string;
    custom2?: string;
    custom3?: string;
    custom4?: string;
    custom5?: string;
  }): { contact?: Contact; error?: string } {
    const normalized = this.normalizePhone(data.phone);
    if (!this.isValidPhone(normalized)) {
      return { error: 'Invalid phone number format. Must be in E.164 international format (e.g. +919876543210).' };
    }

    // Check uniqueness within client account
    const existing = db.findContactByPhone(clientId, normalized);
    if (existing) {
      return { error: `Contact with phone number ${normalized} already exists in this account (Name: ${existing.name}).` };
    }

    const contact: Contact = {
      id: `CNT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_id: clientId,
      name: data.name?.trim() || 'Unknown',
      phone: normalized,
      email: data.email?.trim() || undefined,
      group_id: data.group_id || null,
      metadata: data.metadata || {},
      custom1: data.custom1?.trim() || undefined,
      custom2: data.custom2?.trim() || undefined,
      custom3: data.custom3?.trim() || undefined,
      custom4: data.custom4?.trim() || undefined,
      custom5: data.custom5?.trim() || undefined,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.insertContact(contact);
    return { contact };
  }

  public static updateContact(clientId: string, contactId: string, data: Partial<Contact>): { contact?: Contact; error?: string } {
    if (data.phone) {
      const normalized = this.normalizePhone(data.phone);
      if (!this.isValidPhone(normalized)) {
        return { error: 'Invalid phone number format.' };
      }
      const existing = db.findContactByPhone(clientId, normalized);
      if (existing && existing.id !== contactId) {
        return { error: `Phone number ${normalized} is already used by another contact.` };
      }
      data.phone = normalized;
    }

    const updated = db.updateContact(clientId, contactId, data);
    if (!updated) return { error: 'Contact not found' };
    return { contact: updated };
  }

  public static createGroup(clientId: string, name: string, description?: string): ContactGroup {
    const group: ContactGroup = {
      id: `GRP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      client_id: clientId,
      name: name.trim(),
      description: description?.trim() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return db.insertGroup(group);
  }
}
