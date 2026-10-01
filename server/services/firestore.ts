import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

interface CloudStorageStatus {
  connected: boolean;
  provider: string;
  projectId: string;
  databaseId: string;
  lastSyncAt: string | null;
  syncedCounts: {
    campaigns: number;
    campaign_messages: number;
    contacts: number;
    whatsapp_accounts: number;
    templates: number;
    chat_messages: number;
    credit_transactions: number;
  };
  error?: string;
}

class GoogleCloudFirestoreService {
  private app: any = null;
  private db: any = null;
  private initialized = false;
  private lastSyncAt: string | null = null;
  private config: any = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(raw);

        this.app =
          getApps().length === 0
            ? initializeApp(this.config)
            : getApp();

        this.db = getFirestore(
          this.app,
          this.config.firestoreDatabaseId
        );

        this.initialized = true;
        console.log(`[Google Cloud] Firebase Firestore initialized successfully for project ${this.config.projectId} (${this.config.firestoreDatabaseId})`);
      } else {
        console.warn('[Google Cloud] firebase-applet-config.json not found');
      }
    } catch (err: any) {
      console.error('[Google Cloud] Failed to initialize Firebase Firestore:', err.message);
    }
  }

  public isAvailable(): boolean {
    return this.initialized && !!this.db;
  }

  public getConfig() {
    return this.config;
  }

  /**
   * Save a single record to Google Cloud Firestore
   */
  public async saveDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const ref = doc(this.db, collectionName, docId);
      // Clean undefined values before writing to Firestore
      const cleanData = JSON.parse(JSON.stringify(data));
      await setDoc(ref, cleanData, { merge: true });
      return true;
    } catch (err: any) {
      console.warn(`[Google Cloud Firestore] Error saving ${collectionName}/${docId}:`, err.message);
      return false;
    }
  }

  /**
   * Sync all application records to Google Cloud Firestore
   */
  public async syncAllRecords(fullDbData: any): Promise<{
    success: boolean;
    synced: {
      campaigns: number;
      campaign_messages: number;
      contacts: number;
      whatsapp_accounts: number;
      templates: number;
      chat_messages: number;
      credit_transactions: number;
      clients: number;
    };
    error?: string;
  }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        synced: {
          campaigns: 0,
          campaign_messages: 0,
          contacts: 0,
          whatsapp_accounts: 0,
          templates: 0,
          chat_messages: 0,
          credit_transactions: 0,
          clients: 0
        },
        error: 'Google Cloud Firestore is not initialized'
      };
    }

    try {
      const counts = {
        campaigns: 0,
        campaign_messages: 0,
        contacts: 0,
        whatsapp_accounts: 0,
        templates: 0,
        chat_messages: 0,
        credit_transactions: 0,
        clients: 0
      };

      // 1. Sync Clients
      for (const client of fullDbData.clients || []) {
        if (client.id) {
          await this.saveDocument('clients', client.id, client);
          counts.clients++;
        }
      }

      // 2. Sync WhatsApp Accounts
      for (const wa of fullDbData.whatsapp_accounts || []) {
        if (wa.id) {
          await this.saveDocument('whatsapp_accounts', wa.id, wa);
          counts.whatsapp_accounts++;
        }
      }

      // 3. Sync Campaigns
      for (const camp of fullDbData.campaigns || []) {
        if (camp.id) {
          await this.saveDocument('campaigns', camp.id, camp);
          counts.campaigns++;
        }
      }

      // 4. Sync Campaign Messages (Records)
      for (const msg of fullDbData.campaign_messages || []) {
        if (msg.id) {
          await this.saveDocument('campaign_messages', msg.id, msg);
          counts.campaign_messages++;
        }
      }

      // 5. Sync Contacts
      for (const contact of fullDbData.contacts || []) {
        if (contact.id) {
          await this.saveDocument('contacts', contact.id, contact);
          counts.contacts++;
        }
      }

      // 6. Sync Templates
      for (const tpl of fullDbData.templates || []) {
        if (tpl.id) {
          await this.saveDocument('templates', tpl.id, tpl);
          counts.templates++;
        }
      }

      // 7. Sync Chat Messages
      for (const chat of fullDbData.chat_messages || []) {
        if (chat.id) {
          await this.saveDocument('chat_messages', chat.id, chat);
          counts.chat_messages++;
        }
      }

      // 8. Sync Credit Transactions
      for (const txn of fullDbData.credit_transactions || []) {
        if (txn.id) {
          await this.saveDocument('credit_transactions', txn.id, txn);
          counts.credit_transactions++;
        }
      }

      this.lastSyncAt = new Date().toISOString();

      return {
        success: true,
        synced: counts
      };
    } catch (err: any) {
      console.error('[Google Cloud Firestore] syncAllRecords error:', err);
      return {
        success: false,
        synced: {
          campaigns: 0,
          campaign_messages: 0,
          contacts: 0,
          whatsapp_accounts: 0,
          templates: 0,
          chat_messages: 0,
          credit_transactions: 0,
          clients: 0
        },
        error: err.message
      };
    }
  }

  /**
   * Get connection and sync status
   */
  public getStatus(fullDbData?: any): CloudStorageStatus {
    const counts = {
      campaigns: fullDbData?.campaigns?.length || 0,
      campaign_messages: fullDbData?.campaign_messages?.length || 0,
      contacts: fullDbData?.contacts?.length || 0,
      whatsapp_accounts: fullDbData?.whatsapp_accounts?.length || 0,
      templates: fullDbData?.templates?.length || 0,
      chat_messages: fullDbData?.chat_messages?.length || 0,
      credit_transactions: fullDbData?.credit_transactions?.length || 0
    };

    return {
      connected: this.isAvailable(),
      provider: 'Google Cloud Firestore',
      projectId: this.config?.projectId || 'gleaming-dispatch-1kx2q',
      databaseId: this.config?.firestoreDatabaseId || '(default)',
      lastSyncAt: this.lastSyncAt,
      syncedCounts: counts
    };
  }
}

export const cloudFirestore = new GoogleCloudFirestoreService();
