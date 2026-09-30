import { db, Campaign, CampaignMessage, WhatsAppTemplate } from '../db';
import { CreditService } from './credit';
import { WhatsAppCloudApiService } from './whatsapp';
import { ContactService } from './contact';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface RecipientData {
  phone: string;
  name?: string;
  contact_id?: string | null;
  variables: Record<string, string> | string[]; // e.g. { "1": "Rahul", "2": "20%" } or ["Rahul", "20%"]
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
}

export class CampaignService {
  private static activeWorkers = new Map<string, boolean>();

  /**
   * Render template body with provided variable mapping
   */
  public static renderTemplateBody(template: WhatsAppTemplate, varValues: Record<string, string>): string {
    let text = template.body_text;
    // Replace {{1}}, {{2}}, etc. or named variables like {{name}}
    Object.entries(varValues).forEach(([key, val]) => {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escaped}\\}\\}`, 'g');
      text = text.replace(regex, val || '');
    });
    return text;
  }

  /**
   * Create and launch a campaign
   */
  public static async createCampaign(params: {
    clientId: string;
    name: string;
    type: 'group' | 'file' | 'individual' | 'api';
    templateId: string;
    language?: string;
    groupId?: string | null;
    recipients: RecipientData[];
    variableMapping?: Record<string, string>; // e.g. { "1": "name", "2": "custom1" }
    scheduleAt?: string | null;
  }): Promise<{ campaign: Campaign; error?: string }> {
    const { clientId, name, type, templateId, language = 'en', groupId, recipients, variableMapping = {}, scheduleAt } = params;

    const template = db.getTemplateById(templateId);
    if (!template) {
      return { campaign: null as any, error: `Template ${templateId} not found or not approved.` };
    }

    if (recipients.length === 0) {
      return { campaign: null as any, error: 'Recipient list cannot be empty.' };
    }

    const creditType = template.category === 'UTILITY' ? 'utility' : 'marketing';
    const requiredCredits = recipients.length;

    // Check credits
    const creditCheck = CreditService.checkCredits(clientId, creditType, requiredCredits);
    if (!creditCheck.ok) {
      return {
        campaign: null as any,
        error: `Insufficient ${creditType} credits. Required: ${requiredCredits}, Available: ${creditCheck.available}.`
      };
    }

    // Check plan message limit
    const limitCheck = CreditService.checkCampaignLimit(clientId, recipients.length);
    if (!limitCheck.ok) {
      return {
        campaign: null as any,
        error: `Campaign message limit exceeded. Quota remaining: ${limitCheck.remaining}, Requested: ${limitCheck.required}.`
      };
    }

    const campaignId = `CMP-${Math.floor(10000 + Math.random() * 90000)}`;

    // Deduct credits and update quota
    CreditService.deductCredits(
      clientId,
      creditType,
      requiredCredits,
      `Campaign launched: ${name} (${recipients.length} messages)`,
      campaignId
    );

    const isScheduled = !!scheduleAt && new Date(scheduleAt).getTime() > Date.now();

    let groupName: string | null = null;
    if (groupId) {
      const g = db.getGroupById(clientId, groupId);
      if (g) groupName = g.name;
    }

    const campaign: Campaign = {
      id: campaignId,
      client_id: clientId,
      name,
      type,
      template_id: template.id,
      template_name: template.name,
      language,
      credit_type: creditType,
      group_id: groupId || null,
      group_name: groupName,
      variable_mapping: variableMapping,
      total_recipients: recipients.length,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
      status: isScheduled ? 'Scheduled' : 'Processing',
      scheduled_at: scheduleAt || null,
      started_at: isScheduled ? null : new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.insertCampaign(campaign);

    // Create queued campaign messages
    for (const r of recipients) {
      const normPhone = ContactService.normalizePhone(r.phone);
      // Map variables
      const varMap: Record<string, string> = {};

      if (Array.isArray(r.variables)) {
        r.variables.forEach((v, idx) => {
          varMap[String(idx + 1)] = String(v);
        });
      } else if (typeof r.variables === 'object') {
        Object.assign(varMap, r.variables);
      }

      // Fill in mapped contact variables or custom static values
      Object.entries(variableMapping).forEach(([varKey, fieldKey]) => {
        if (!varMap[varKey]) {
          if (fieldKey.startsWith('custom:')) varMap[varKey] = fieldKey.slice(7);
          else if (fieldKey === 'name') varMap[varKey] = r.name || '';
          else if (fieldKey === 'phone') varMap[varKey] = normPhone;
          else if (fieldKey === 'custom1') varMap[varKey] = r.custom1 || '';
          else if (fieldKey === 'custom2') varMap[varKey] = r.custom2 || '';
          else if (fieldKey === 'custom3') varMap[varKey] = r.custom3 || '';
          else if (fieldKey === 'custom4') varMap[varKey] = r.custom4 || '';
          else if (fieldKey === 'custom5') varMap[varKey] = r.custom5 || '';
        }
      });

      // Default fallback for {{1}} if name exists
      if (!varMap['1'] && r.name) varMap['1'] = r.name;
      if (!varMap['name'] && r.name) varMap['name'] = r.name;

      const rendered = this.renderTemplateBody(template, varMap);

      // Extract variable values according to template.variables
      const bodyVarList: string[] = [];
      if (template.variables && template.variables.length > 0) {
        template.variables.forEach((slot) => {
          bodyVarList.push(varMap[slot] || '');
        });
      }

      const msg: CampaignMessage = {
        id: `MSG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        client_id: clientId,
        campaign_id: campaignId,
        contact_id: r.contact_id || null,
        recipient_name: r.name || 'Recipient',
        phone: normPhone,
        template_name: template.name,
        credit_type: creditType,
        rendered_body: rendered,
        template_variables: varMap,
        variable_values: bodyVarList,
        message_id: null,
        status: 'Queued',
        created_at: new Date().toISOString()
      };

      db.insertCampaignMessage(msg);
    }

    // Start background processing if not scheduled in future
    if (!isScheduled) {
      setTimeout(() => {
        this.processCampaignQueue(campaignId, clientId);
      }, 100);
    }

    return { campaign };
  }

  /**
   * Queue Worker: Dispatches queued messages via WhatsApp Cloud API
   */
  public static async processCampaignQueue(campaignId: string, clientId: string) {
    if (this.activeWorkers.get(campaignId)) return;
    this.activeWorkers.set(campaignId, true);

    try {
      const camp = db.getCampaignById(clientId, campaignId);
      if (!camp || camp.status === 'Cancelled' || camp.status === 'Paused') {
        this.activeWorkers.delete(campaignId);
        return;
      }

      db.updateCampaign(clientId, campaignId, { status: 'Running', started_at: camp.started_at || new Date().toISOString() });

      const template = db.getTemplateById(camp.template_id);
      const messages = db.getCampaignMessages(clientId, { campaignId, status: 'Queued', limit: 500 }).messages;

      for (const msg of messages) {
        // Re-check campaign state to support immediate pause/cancel
        const currentCamp = db.getCampaignById(clientId, campaignId);
        if (currentCamp?.status === 'Paused' || currentCamp?.status === 'Cancelled') {
          break;
        }

        // Send via WhatsApp Cloud API
        try {
          // Prepare exact variable array expected by Meta template
          let varsToSend: string[] = msg.variable_values || [];
          if ((!varsToSend || varsToSend.length === 0) && template?.variables && template.variables.length > 0) {
            varsToSend = template.variables.map(
              (v) => msg.template_variables?.[v] || (v === '1' ? msg.recipient_name : '')
            );
          }

          const res = await WhatsAppCloudApiService.sendTemplateMessage({
            clientId,
            to: msg.phone,
            templateName: camp.template_name,
            languageCode: camp.language || 'en',
            bodyVariables: varsToSend
          });

          if (!res.success) {
            throw new Error(res.error || 'Meta WhatsApp Cloud API template dispatch failed');
          }

          msg.message_id = res.messageId;
          msg.status = 'Sent';
          msg.sent_at = new Date().toISOString();

          db.updateCampaignMessageStatus(res.messageId, 'Sent', {
            timestamp: msg.sent_at
          });

          // Simulate realistic webhook delivery progression in sandbox environment
          const waAccount = db.getWhatsAppAccount(clientId);
          const isMock = !waAccount?.meta_access_token || waAccount.meta_access_token.includes('sampleToken') || waAccount.status === 'SANDBOX';
          if (isMock) {
            setTimeout(() => {
              db.updateCampaignMessageStatus(res.messageId, 'Delivered');
            }, 500 + Math.random() * 500);

            setTimeout(() => {
              // 85% read rate
              if (Math.random() < 0.85) {
                db.updateCampaignMessageStatus(res.messageId, 'Read');
              }
            }, 1500 + Math.random() * 1500);
          }

        } catch (err: any) {
          msg.status = 'Failed';
          msg.error_code = 'DISPATCH_ERROR';
          msg.error_message = err.message || 'WhatsApp Cloud API send failed';
          msg.failed_at = new Date().toISOString();
          db.updateCampaignMessageStatus(msg.id, 'Failed', {
            errorCode: msg.error_code || undefined,
            errorMessage: msg.error_message || undefined,
            timestamp: msg.failed_at || undefined
          });
        }

        // Rate limiting throttle between sends
        await new Promise(r => setTimeout(r, 60));
      }

      // Check final status
      const updatedCamp = db.getCampaignById(clientId, campaignId);
      if (updatedCamp && updatedCamp.status === 'Running') {
        const remainingQueued = db.getCampaignMessages(clientId, { campaignId, status: 'Queued' }).total;
        if (remainingQueued === 0) {
          db.updateCampaign(clientId, campaignId, {
            status: 'Completed',
            completed_at: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.error(`Error in campaign worker for ${campaignId}:`, e);
      db.updateCampaign(clientId, campaignId, { status: 'Failed' });
    } finally {
      this.activeWorkers.delete(campaignId);
    }
  }

  /**
   * Pause campaign
   */
  public static pauseCampaign(clientId: string, campaignId: string): boolean {
    const camp = db.getCampaignById(clientId, campaignId);
    if (!camp || camp.status !== 'Running') return false;
    db.updateCampaign(clientId, campaignId, { status: 'Paused' });
    return true;
  }

  /**
   * Resume campaign
   */
  public static resumeCampaign(clientId: string, campaignId: string): boolean {
    const camp = db.getCampaignById(clientId, campaignId);
    if (!camp || camp.status !== 'Paused') return false;
    db.updateCampaign(clientId, campaignId, { status: 'Running' });
    setTimeout(() => {
      this.processCampaignQueue(campaignId, clientId);
    }, 100);
    return true;
  }

  /**
   * Cancel campaign
   */
  public static cancelCampaign(clientId: string, campaignId: string): boolean {
    const camp = db.getCampaignById(clientId, campaignId);
    if (!camp || (camp.status !== 'Running' && camp.status !== 'Scheduled' && camp.status !== 'Paused')) return false;

    db.updateCampaign(clientId, campaignId, { status: 'Cancelled' });

    // Refund credits for un-sent messages
    const unsentCount = db.getCampaignMessages(clientId, { campaignId, status: 'Queued' }).total;
    if (unsentCount > 0) {
      CreditService.addCredits(
        clientId,
        camp.credit_type,
        unsentCount,
        `Credit refund for cancelled campaign ${campaignId} (${unsentCount} unsent messages)`,
        'Credit Refund'
      );
    }

    return true;
  }

  /**
   * Generate export rows for campaign messages (CSV or XLSX)
   */
  public static generateExportData(clientId: string, campaignId?: string, filterStatus?: string) {
    const messages = db.getCampaignMessages(clientId, {
      campaignId,
      status: filterStatus,
      limit: 10000
    }).messages;

    return messages.map(m => ({
      'Message ID': m.message_id || m.id,
      'Campaign ID': m.campaign_id,
      'Recipient Name': m.recipient_name,
      'Phone': m.phone,
      'Template': m.template_name,
      'Credit Type': m.credit_type,
      'Status': m.status,
      'Error': m.error_message || '',
      'Sent Time': m.sent_at || '',
      'Delivered Time': m.delivered_at || '',
      'Read Time': m.read_at || '',
      'Created At': m.created_at
    }));
  }

  /**
   * Generate CSV string
   */
  public static exportToCsv(data: any[]): string {
    return Papa.unparse(data);
  }

  /**
   * Generate XLSX buffer
   */
  public static exportToXlsx(data: any[], sheetName = 'Records'): Buffer {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
