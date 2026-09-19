import { db } from '../db/database.js';
import { Transaction, TransactionType } from '../db/schema.js';

export class TransactionService {
  public recordTransaction(params: {
    playerId: string;
    type: TransactionType;
    amount: number;
    balanceType: 'main' | 'bonus';
    beforeBalance: number;
    afterBalance: number;
    referenceId?: string;
    description: string;
  }): Transaction {
    const id = `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const transaction: Transaction = {
      id,
      playerId: params.playerId,
      type: params.type,
      amount: Number(params.amount.toFixed(2)),
      balanceType: params.balanceType,
      beforeBalance: Number(params.beforeBalance.toFixed(2)),
      afterBalance: Number(params.afterBalance.toFixed(2)),
      referenceId: params.referenceId,
      description: params.description,
      createdAt: Date.now(),
    };

    db.transactions.set(id, transaction);
    db.saveToDisk();
    return transaction;
  }

  public getPlayerTransactions(playerId: string, limit = 50): Transaction[] {
    const list: Transaction[] = [];
    for (const tx of db.transactions.values()) {
      if (tx.playerId === playerId) {
        list.push(tx);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  public getAllTransactions(limit = 100): Transaction[] {
    return Array.from(db.transactions.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

export const transactionService = new TransactionService();
