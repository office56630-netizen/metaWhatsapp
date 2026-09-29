import { db, CreditTransaction } from '../db';
import crypto from 'crypto';

export class CreditService {
  public static getBalances(clientId: string) {
    const client = db.getClientById(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    return {
      marketing_credits: client.marketing_credits,
      marketing_credits_used: client.marketing_credits_used,
      marketing_credits_remaining: client.marketing_credits,
      utility_credits: client.utility_credits,
      utility_credits_used: client.utility_credits_used,
      utility_credits_remaining: client.utility_credits,
      campaign_message_limit: client.campaign_message_limit,
      campaign_messages_sent: client.campaign_messages_sent,
      campaign_messages_remaining: Math.max(0, client.campaign_message_limit - client.campaign_messages_sent)
    };
  }

  public static checkCredits(clientId: string, type: 'marketing' | 'utility', amount: number): { ok: boolean; available: number; required: number } {
    const client = db.getClientById(clientId);
    if (!client) return { ok: false, available: 0, required: amount };

    const available = type === 'marketing' ? client.marketing_credits : client.utility_credits;
    return {
      ok: available >= amount,
      available,
      required: amount
    };
  }

  public static checkCampaignLimit(clientId: string, count: number): { ok: boolean; remaining: number; required: number } {
    const client = db.getClientById(clientId);
    if (!client) return { ok: false, remaining: 0, required: count };

    const remaining = Math.max(0, client.campaign_message_limit - client.campaign_messages_sent);
    return {
      ok: remaining >= count,
      remaining,
      required: count
    };
  }

  public static deductCredits(
    clientId: string,
    type: 'marketing' | 'utility',
    amount: number,
    description: string,
    campaignId?: string
  ): CreditTransaction {
    const client = db.getClientById(clientId);
    if (!client) throw new Error('Client not found');

    const balanceBefore = type === 'marketing' ? client.marketing_credits : client.utility_credits;
    if (balanceBefore < amount) {
      throw new Error(`Insufficient ${type} credits: available ${balanceBefore}, requested ${amount}`);
    }

    const balanceAfter = balanceBefore - amount;

    if (type === 'marketing') {
      client.marketing_credits = balanceAfter;
      client.marketing_credits_used = (client.marketing_credits_used || 0) + amount;
    } else {
      client.utility_credits = balanceAfter;
      client.utility_credits_used = (client.utility_credits_used || 0) + amount;
    }

    client.campaign_messages_sent = (client.campaign_messages_sent || 0) + amount;

    db.updateClient(clientId, {
      marketing_credits: client.marketing_credits,
      marketing_credits_used: client.marketing_credits_used,
      utility_credits: client.utility_credits,
      utility_credits_used: client.utility_credits_used,
      campaign_messages_sent: client.campaign_messages_sent
    });

    const txn: CreditTransaction = {
      id: `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_id: clientId,
      credit_type: type,
      transaction_type: 'Credit Used',
      amount: -amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      campaign_id: campaignId || null,
      created_at: new Date().toISOString()
    };

    return db.addCreditTransaction(txn);
  }

  public static addCredits(
    clientId: string,
    type: 'marketing' | 'utility',
    amount: number,
    description: string,
    transactionType: CreditTransaction['transaction_type'] = 'Credit Added'
  ): CreditTransaction {
    const client = db.getClientById(clientId);
    if (!client) throw new Error('Client not found');

    const balanceBefore = type === 'marketing' ? client.marketing_credits : client.utility_credits;
    const balanceAfter = balanceBefore + amount;

    if (type === 'marketing') {
      client.marketing_credits = balanceAfter;
    } else {
      client.utility_credits = balanceAfter;
    }

    db.updateClient(clientId, {
      marketing_credits: client.marketing_credits,
      utility_credits: client.utility_credits
    });

    const txn: CreditTransaction = {
      id: `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_id: clientId,
      credit_type: type,
      transaction_type: transactionType,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      created_at: new Date().toISOString()
    };

    return db.addCreditTransaction(txn);
  }
}
