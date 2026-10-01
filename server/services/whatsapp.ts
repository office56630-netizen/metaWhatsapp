import { db, WhatsAppAccount, CampaignMessage, WhatsAppTemplate, ChatMessage } from '../db';
import { CreditService } from './credit';
import crypto from 'crypto';

export interface MetaMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export class WhatsAppCloudApiService {
  /**
   * Generates appsecret_proof for Meta Graph API calls when App Secret Proof is enabled in Meta App Settings.
   * As a Tech Provider, if tenant doesn't provide a custom secret, the platform's global Tech Provider App Secret is used.
   * appsecret_proof = hash_hmac('sha256', access_token, app_secret)
   */
  public static getAppSecretProof(accessToken: string, appSecret?: string, clientId?: string): string | null {
    const cleanSecret = (appSecret && appSecret.trim() ? appSecret : db.getEffectiveAppSecret(clientId)).trim();
    const cleanToken = (accessToken || '').trim();
    if (!cleanSecret || !cleanToken) return null;
    return crypto.createHmac('sha256', cleanSecret).update(cleanToken).digest('hex');
  }

  /**
   * Constructs secure Meta Graph API URL with query params and appsecret_proof if available
   */
  public static buildGraphUrl(
    endpoint: string,
    accessToken: string,
    appSecret?: string,
    extraParams?: Record<string, string>,
    clientId?: string
  ): string {
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = new URL(`https://graph.facebook.com/v21.0/${cleanEndpoint}`);
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const proof = this.getAppSecretProof(accessToken, appSecret, clientId);
    if (proof) {
      url.searchParams.set('appsecret_proof', proof);
    }
    return url.toString();
  }

  /**
   * Fetch real approved message templates directly from Meta Graph API
   */
  public static async fetchRealMetaTemplates(params: {
    clientId: string;
    wabaId?: string;
    metaAccessToken?: string;
    appSecret?: string;
  }): Promise<{
    success: boolean;
    count: number;
    templates: WhatsAppTemplate[];
    error?: string;
    warning?: string;
  }> {
    const { clientId, wabaId, metaAccessToken, appSecret } = params;

    // Retrieve client's configured WhatsApp credentials
    const waAccount = db.getWhatsAppAccount(clientId);

    const effectiveWabaId = (wabaId || waAccount?.waba_id || '').trim();
    const effectiveToken = (metaAccessToken || waAccount?.meta_access_token || '').trim();
    const effectiveAppSecret = (appSecret && appSecret.trim() ? appSecret : db.getEffectiveAppSecret(clientId)).trim();

    if (!effectiveWabaId || !effectiveToken) {
      return {
        success: false,
        count: 0,
        templates: [],
        error:
          'Meta WABA ID and Access Token are required. Please configure your WhatsApp Business Account credentials in Settings or enter them in the sync form.'
      };
    }

    // If caller provided updated credentials, save them to the account
    if (waAccount) {
      let needsUpdate = false;
      const updatedWa = { ...waAccount };
      if (wabaId && wabaId.trim() !== waAccount.waba_id) {
        updatedWa.waba_id = effectiveWabaId;
        needsUpdate = true;
      }
      if (metaAccessToken && metaAccessToken.trim() !== waAccount.meta_access_token) {
        updatedWa.meta_access_token = effectiveToken;
        needsUpdate = true;
      }
      if (appSecret !== undefined && appSecret.trim() !== (waAccount.app_secret || '')) {
        updatedWa.app_secret = effectiveAppSecret;
        needsUpdate = true;
      }
      if (needsUpdate) {
        updatedWa.updated_at = new Date().toISOString();
        db.upsertWhatsAppAccount(updatedWa);
      }
    }

    try {
      const url = this.buildGraphUrl(
        `${effectiveWabaId}/message_templates`,
        effectiveToken,
        effectiveAppSecret,
        {
          fields: 'name,status,category,language,components,id',
          limit: '100'
        }
      );

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || `Meta API error ${res.status}: ${res.statusText}`;
        console.warn('Meta Graph API template fetch error:', data);

        // Check if error is due to missing appsecret_proof
        if (data.error?.message?.toLowerCase().includes('appsecret_proof') || data.error?.code === 100) {
          return {
            success: false,
            count: 0,
            templates: [],
            error:
              'Meta Graph API Error (Code: 100): "API calls from the server require an appsecret_proof argument". Your Meta App has App Secret Proof enabled. Please enter your Meta App Secret in the sync dialog or WhatsApp Settings (Meta App Dashboard > App settings > Basic > App Secret) so the server can compute the cryptographic proof.'
          };
        }

        return {
          success: false,
          count: 0,
          templates: [],
          error: `Meta Graph API: ${errorMsg} (Code: ${data.error?.code || res.status})`
        };
      }

      const metaTemplates = data.data || [];
      const savedTemplates: WhatsAppTemplate[] = [];

      for (const item of metaTemplates) {
        let headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | null = null;
        let headerContent: string | undefined = undefined;
        let bodyText = '';
        let footerText: string | undefined = undefined;
        const buttons: Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone_number?: string }> = [];

        if (Array.isArray(item.components)) {
          for (const comp of item.components) {
            const compType = (comp.type || '').toUpperCase();
            if (compType === 'HEADER') {
              headerType = comp.format ? (comp.format.toUpperCase() as any) : 'TEXT';
              headerContent = comp.text || (comp.example?.header_handle ? comp.example.header_handle[0] : undefined);
            } else if (compType === 'BODY') {
              bodyText = comp.text || '';
            } else if (compType === 'FOOTER') {
              footerText = comp.text || undefined;
            } else if (compType === 'BUTTONS' && Array.isArray(comp.buttons)) {
              for (const btn of comp.buttons) {
                buttons.push({
                  type: btn.type === 'PHONE_NUMBER' ? 'PHONE_NUMBER' : btn.type === 'URL' ? 'URL' : 'QUICK_REPLY',
                  text: btn.text || 'Button',
                  url: btn.url,
                  phone_number: btn.phone_number
                });
              }
            }
          }
        }

        // Extract variables from body text (e.g. {{1}}, {{2}} or {{name}})
        const variableMatches = bodyText.match(/\{\{([^}]+)\}\}/g) || [];
        const variables = Array.from(new Set(variableMatches.map((m: string) => m.replace(/[{}]/g, '').trim())));

        const templateDoc: WhatsAppTemplate = {
          id: item.id ? `TPL-${item.id}` : `TPL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          client_id: clientId,
          name: item.name,
          category: item.category === 'UTILITY' ? 'UTILITY' : item.category === 'AUTHENTICATION' ? 'AUTHENTICATION' : 'MARKETING',
          language: item.language || 'en_US',
          status: item.status === 'APPROVED' ? 'APPROVED' : item.status === 'PENDING' ? 'PENDING' : 'REJECTED',
          header_type: headerType,
          header_content: headerContent,
          body_text: bodyText || `Template ${item.name}`,
          footer_text: footerText,
          buttons: buttons.length > 0 ? buttons : undefined,
          variables,
          created_at: new Date().toISOString()
        };

        const upserted = db.upsertTemplate(templateDoc);
        savedTemplates.push(upserted);
      }

      // Record audit log
      db.addAuditLog({
        id: `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user_id: 'SYSTEM',
        user_name: 'Meta Sync Engine',
        client_id: clientId,
        action: 'TEMPLATES_SYNCED',
        details: `Successfully fetched and synced ${savedTemplates.length} real templates from Meta WABA ID ${effectiveWabaId}`,
        ip: '127.0.0.1',
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        count: savedTemplates.length,
        templates: savedTemplates
      };
    } catch (err: any) {
      console.error('Exception fetching templates from Meta:', err);
      return {
        success: false,
        count: 0,
        templates: [],
        error: `Network error connecting to Meta Graph API: ${err.message}`
      };
    }
  }

  /**
   * Send regular text message via Meta WhatsApp Cloud API (Free-form chat within 24h window)
   */
  public static async sendTextMessage(params: {
    clientId: string;
    to: string;
    text: string;
    contactId?: string;
  }): Promise<{ success: boolean; message: ChatMessage; error?: string }> {
    const { clientId, to, text, contactId } = params;

    const waAccount = db.getWhatsAppAccount(clientId);
    if (!waAccount) {
      throw new Error(`No WhatsApp Account configured for client ${clientId}`);
    }

    const cleanTo = to.replace(/[\s\-\(\)\.\[\]]/g, '');
    const cleanPhone = cleanTo.startsWith('+') ? cleanTo : '+' + cleanTo;

    // Check contact
    const contact = db.findContactByPhone(clientId, cleanPhone);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo.replace(/\D/g, ''),
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    let wamid = `wamid.HBgL${waAccount.phone_number_id || 'LOCAL'}FQIAEhgg${crypto.randomBytes(16).toString('hex').toUpperCase()}QAQ==`;
    let status: ChatMessage['status'] = 'Sent';
    let errorMessage: string | undefined = undefined;

    const isRealToken =
      waAccount.meta_access_token &&
      !waAccount.meta_access_token.includes('sampleToken') &&
      waAccount.phone_number_id &&
      waAccount.status !== 'SANDBOX';

    if (isRealToken) {
      try {
        const url = this.buildGraphUrl(
          `${waAccount.phone_number_id}/messages`,
          waAccount.meta_access_token,
          waAccount.app_secret,
          undefined,
          clientId
        );
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waAccount.meta_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          wamid = data.messages?.[0]?.id || wamid;
          status = 'Sent';
        } else {
          console.warn('Meta API text message error:', data);
          let metaError = data.error?.message || 'Meta text dispatch failed';
          if (data.error?.message?.toLowerCase().includes('appsecret_proof') || data.error?.code === 100) {
            metaError =
              'Meta API Error (Code: 100): "API calls from the server require an appsecret_proof argument". Please configure your Meta App Secret in WhatsApp Settings (Meta App Dashboard > App settings > Basic > App Secret).';
          } else if (data.error?.code === 131047) {
            metaError = 'WhatsApp 24-hour service window has expired. A template message is required to re-engage this customer.';
          }
          errorMessage = metaError;
          status = 'Failed';
        }
      } catch (err: any) {
        console.warn('Meta API text call exception:', err.message);
        errorMessage = `Network exception calling Meta Graph API: ${err.message}`;
        status = 'Failed';
      }
    }

    const chatMsg: ChatMessage = {
      id: wamid,
      client_id: clientId,
      contact_id: contactId || contact?.id || null,
      customer_phone: cleanPhone,
      customer_name: contact?.name || `Customer (${cleanPhone.slice(-4)})`,
      sender: 'business',
      message_type: 'text',
      text,
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString()
    };

    db.addChatMessage(chatMsg);

    // Simulate status progression only in sandbox environment when send succeeded
    if (!isRealToken && status === 'Sent' && !errorMessage) {
      setTimeout(() => {
        chatMsg.status = 'Delivered';
        db.flush();
      }, 1000);
      setTimeout(() => {
        chatMsg.status = 'Read';
        db.flush();
      }, 2500);
    }

    return {
      success: !errorMessage && status !== 'Failed',
      message: chatMsg,
      error: errorMessage
    };
  }

  /**
   * Send template message via Meta WhatsApp Cloud API
   */
  public static async sendTemplateMessage(params: {
    clientId: string;
    to: string;
    templateName: string;
    languageCode: string;
    bodyVariables?: string[];
    headerVariables?: string[];
    buttonVariables?: Array<{ index: number; sub_type: string; parameters: any[] }>;
  }): Promise<{ success: boolean; messageId: string; status: string; rawResponse?: any; error?: string }> {
    const { clientId, to, templateName, languageCode, bodyVariables = [], headerVariables = [] } = params;

    const waAccount = db.getWhatsAppAccount(clientId);
    if (!waAccount) {
      throw new Error(`No WhatsApp Account configured for client ${clientId}`);
    }

    if (waAccount.status === 'DISCONNECTED') {
      throw new Error('WhatsApp Account is currently disconnected. Please re-authenticate.');
    }

    const components: any[] = [];

    if (headerVariables.length > 0) {
      components.push({
        type: 'header',
        parameters: headerVariables.map((v) => ({ type: 'text', text: String(v) }))
      });
    }

    if (bodyVariables.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyVariables.map((v) => ({ type: 'text', text: String(v) }))
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode || 'en'
        },
        components: components.length > 0 ? components : undefined
      }
    };

    const isRealToken =
      waAccount.meta_access_token &&
      !waAccount.meta_access_token.includes('sampleToken') &&
      waAccount.phone_number_id &&
      waAccount.status !== 'SANDBOX';

    if (isRealToken) {
      try {
        const url = this.buildGraphUrl(
          `${waAccount.phone_number_id}/messages`,
          waAccount.meta_access_token,
          waAccount.app_secret,
          undefined,
          clientId
        );
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waAccount.meta_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          console.warn('Meta API returned error on template send:', data);
          let errorMsg = data.error?.message || `Meta API error ${res.status}: ${res.statusText}`;
          if (data.error?.message?.toLowerCase().includes('appsecret_proof') || data.error?.code === 100) {
            errorMsg =
              'Meta API Error (Code: 100): "API calls from the server require an appsecret_proof argument". Please configure your Meta App Secret in WhatsApp Settings.';
          }
          return {
            success: false,
            messageId: '',
            status: 'failed',
            error: errorMsg,
            rawResponse: data
          };
        }

        const msgId = data.messages?.[0]?.id || `wamid.${crypto.randomBytes(16).toString('hex')}`;
        return {
          success: true,
          messageId: msgId,
          status: 'accepted',
          rawResponse: data
        };
      } catch (err: any) {
        console.warn('Meta API request failed:', err.message);
        return {
          success: false,
          messageId: '',
          status: 'failed',
          error: `Network exception connecting to Meta: ${err.message}`
        };
      }
    }

    return this.simulateMetaResponse(waAccount, payload);
  }

  /**
   * Send template message directly from the Chat desk
   */
  public static async sendTemplateChatMessage(params: {
    clientId: string;
    to: string;
    templateId: string;
    variables?: Record<string, string>;
  }): Promise<{ success: boolean; message: ChatMessage; error?: string }> {
    const { clientId, to, templateId, variables = {} } = params;

    const tpl = db.getTemplateById(templateId);
    if (!tpl) {
      return { success: false, message: null as any, error: 'Template not found' };
    }

    const creditType = tpl.category === 'UTILITY' ? 'utility' : 'marketing';
    const creditCheck = CreditService.checkCredits(clientId, creditType, 1);
    if (!creditCheck.ok) {
      return { success: false, message: null as any, error: `Insufficient ${creditType} credits to send template message.` };
    }

    // Deduct 1 credit
    CreditService.deductCredits(clientId, creditType, 1, `Live chat template message: ${tpl.name}`);

    // Render body text
    let renderedText = tpl.body_text;
    Object.entries(variables).forEach(([k, v]) => {
      renderedText = renderedText.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });

    const bodyVars: string[] = [];
    if (tpl.variables && tpl.variables.length > 0) {
      tpl.variables.forEach((v) => {
        bodyVars.push(variables[v] || '');
      });
    }

    const sendRes = await this.sendTemplateMessage({
      clientId,
      to,
      templateName: tpl.name,
      languageCode: tpl.language,
      bodyVariables: bodyVars
    });

    const cleanTo = to.replace(/[\s\-\(\)\.\[\]]/g, '');
    const cleanPhone = cleanTo.startsWith('+') ? cleanTo : '+' + cleanTo;
    const contact = db.findContactByPhone(clientId, cleanPhone);

    if (!sendRes.success) {
      // Refund the 1 credit
      CreditService.addCredits(clientId, creditType, 1, `Refund for failed chat template: ${tpl.name}`, 'Credit Refund');
      const failedMsg: ChatMessage = {
        id: `failed_${crypto.randomBytes(8).toString('hex')}`,
        client_id: clientId,
        contact_id: contact?.id || null,
        customer_phone: cleanPhone,
        customer_name: contact?.name || `Customer (${cleanPhone.slice(-4)})`,
        sender: 'business',
        message_type: 'template',
        text: renderedText,
        template_name: tpl.name,
        template_category: tpl.category,
        template_variables: variables,
        status: 'Failed',
        error_message: sendRes.error || 'Failed to dispatch Meta template',
        created_at: new Date().toISOString()
      };
      db.addChatMessage(failedMsg);

      return {
        success: false,
        message: failedMsg,
        error: sendRes.error || 'Failed to dispatch template message'
      };
    }

    const chatMsg: ChatMessage = {
      id: sendRes.messageId,
      client_id: clientId,
      contact_id: contact?.id || null,
      customer_phone: cleanPhone,
      customer_name: contact?.name || `Customer (${cleanPhone.slice(-4)})`,
      sender: 'business',
      message_type: 'template',
      text: renderedText,
      template_name: tpl.name,
      template_category: tpl.category,
      template_variables: variables,
      status: 'Sent',
      created_at: new Date().toISOString()
    };

    db.addChatMessage(chatMsg);

    // Simulate status progression for sandbox
    const waAccount = db.getWhatsAppAccount(clientId);
    const isMock = !waAccount?.meta_access_token || waAccount.meta_access_token.includes('sampleToken') || waAccount.status === 'SANDBOX';
    if (isMock) {
      setTimeout(() => {
        chatMsg.status = 'Delivered';
        db.flush();
      }, 1200);
      setTimeout(() => {
        chatMsg.status = 'Read';
        db.flush();
      }, 3000);
    }

    return {
      success: true,
      message: chatMsg
    };
  }

  private static simulateMetaResponse(waAccount: WhatsAppAccount, payload: any) {
    const randomHex = crypto.randomBytes(16).toString('hex').toUpperCase();
    const wamid = `wamid.HBgL${waAccount.phone_number_id || 'SANDBOX'}FQIAEhgg${randomHex}QAQ==`;

    const mockResponse: MetaMessageResponse = {
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: payload.to,
          wa_id: payload.to
        }
      ],
      messages: [
        {
          id: wamid,
          message_status: 'accepted'
        }
      ]
    };

    return {
      success: true,
      messageId: wamid,
      status: 'accepted',
      rawResponse: mockResponse
    };
  }

  /**
   * Process Meta Webhook payload (status updates AND incoming customer chats)
   */
  public static processWebhookPayload(payload: any, clientIdParam?: string) {
    const rawDb = db.getRawData();
    const results: any[] = [];

    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        const wabaId = entry.id;
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value || {};

          // Resolve clientId from phone_number_id or waba_id
          const phoneId = value.metadata?.phone_number_id;
          const matchedAccount = rawDb.whatsapp_accounts.find(
            (w) => (phoneId && w.phone_number_id === phoneId) || (wabaId && w.waba_id === wabaId)
          );
          const resolvedClientId = matchedAccount?.client_id || clientIdParam || 'CLT-00001';

          // 1. Process Message Status Updates (sent -> delivered -> read -> failed)
          const statuses = value.statuses || [];
          for (const statusObj of statuses) {
            const wamid = statusObj.id;
            const metaStatus = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
            const timestamp = statusObj.timestamp
              ? new Date(parseInt(statusObj.timestamp, 10) * 1000).toISOString()
              : new Date().toISOString();

            let targetStatus: CampaignMessage['status'] = 'Sent';
            if (metaStatus === 'delivered') targetStatus = 'Delivered';
            if (metaStatus === 'read') targetStatus = 'Read';
            if (metaStatus === 'failed') targetStatus = 'Failed';

            const errObj = statusObj.errors?.[0];
            const updated = db.updateCampaignMessageStatus(wamid, targetStatus, {
              errorCode: errObj?.code ? String(errObj.code) : undefined,
              errorMessage: errObj?.title || errObj?.message,
              timestamp
            });

            // Also update in chat_messages if present
            const chatMsg = rawDb.chat_messages?.find((m) => m.id === wamid);
            if (chatMsg) {
              chatMsg.status = targetStatus;
              if (errObj) chatMsg.error_message = errObj.title || errObj.message;
              db.flush();
            }

            results.push({
              message_id: wamid,
              status: targetStatus,
              updated: !!updated || !!chatMsg,
              client_id: resolvedClientId
            });

            db.addWebhookLog({
              id: `WH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
              client_id: resolvedClientId,
              event_type: `message.${metaStatus}`,
              message_id: wamid,
              payload: statusObj,
              status: updated || chatMsg ? 'PROCESSED' : 'IGNORED',
              created_at: new Date().toISOString()
            });
          }

          // 2. Process Inbound Messages from Customers (Live Chat Reception!)
          const incomingMessages = value.messages || [];
          const contactsInfo = value.contacts || [];

          for (const incMsg of incomingMessages) {
            const senderPhone = incMsg.from ? (incMsg.from.startsWith('+') ? incMsg.from : '+' + incMsg.from) : '';
            const msgBody = incMsg.text?.body || (incMsg.type === 'button' ? incMsg.button?.text : `[${incMsg.type || 'message'}]`);
            const msgId = incMsg.id || `wamid.inc_${crypto.randomBytes(8).toString('hex')}`;
            const msgTime = incMsg.timestamp
              ? new Date(parseInt(incMsg.timestamp, 10) * 1000).toISOString()
              : new Date().toISOString();

            const profileName = contactsInfo[0]?.profile?.name || undefined;
            const existingContact = senderPhone ? db.findContactByPhone(resolvedClientId, senderPhone) : null;

            const inboundChat: ChatMessage = {
              id: msgId,
              client_id: resolvedClientId,
              contact_id: existingContact?.id || null,
              customer_phone: senderPhone,
              customer_name: existingContact?.name || profileName || `Customer (${senderPhone.slice(-4)})`,
              sender: 'customer',
              message_type: 'text',
              text: msgBody,
              status: 'Read',
              created_at: msgTime
            };

            db.addChatMessage(inboundChat);

            db.addWebhookLog({
              id: `WH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
              client_id: resolvedClientId,
              event_type: 'messages.inbound',
              message_id: msgId,
              payload: incMsg,
              status: 'PROCESSED',
              created_at: new Date().toISOString()
            });

            results.push({
              message_id: msgId,
              type: 'inbound_chat',
              from: senderPhone,
              client_id: resolvedClientId
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Verify Webhook challenge for Meta
   */
  public static verifyWebhook(
    hubMode: string,
    hubVerifyToken: string,
    hubChallenge: string,
    clientVerifyToken?: string
  ) {
    if (hubMode === 'subscribe') {
      const accounts = db.getRawData().whatsapp_accounts;
      const matched =
        accounts.some((a) => a.webhook_verify_token === hubVerifyToken) ||
        hubVerifyToken === clientVerifyToken ||
        hubVerifyToken === 'meta_whatsapp_default_token';

      if (matched) {
        return { valid: true, challenge: hubChallenge };
      }
    }
    return { valid: false };
  }
}
