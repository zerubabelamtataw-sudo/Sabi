import { db } from '../db/database.js';
import { Deposit, DepositMethod } from '../db/schema.js';
import { balanceService } from './balanceService.js';
import { notificationService } from './notificationService.js';

export interface CreateDepositParams {
  playerId: string;
  amount: number;
  method: DepositMethod;
  proofRef?: string;
  notes?: string;
}

export class DepositService {
  public createDepositRequest(params: CreateDepositParams): Deposit {
    const minDep = db.settings.minDeposit;
    if (params.amount < minDep) {
      throw new Error(`Minimum deposit amount is $${minDep.toFixed(2)}`);
    }

    const id = `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const deposit: Deposit = {
      id,
      playerId: params.playerId,
      amount: Number(params.amount.toFixed(2)),
      method: params.method,
      status: 'pending',
      proofRef: params.proofRef || `ref_${Date.now()}`,
      notes: params.notes,
      createdAt: Date.now(),
    };

    db.deposits.set(id, deposit);
    db.saveToDisk();

    notificationService.sendNotification({
      playerId: params.playerId,
      title: 'Deposit Request Submitted',
      message: `Your deposit request #${id} for $${deposit.amount.toFixed(2)} (${params.method}) has been created and is pending verification.`,
      type: 'deposit',
    });

    return deposit;
  }

  public verifyAndCreditDeposit(depositId: string, notes?: string): Deposit {
    const deposit = db.deposits.get(depositId);
    if (!deposit) {
      throw new Error('Deposit record not found');
    }
    if (deposit.status !== 'pending') {
      throw new Error(`Deposit cannot be verified, current status is ${deposit.status}`);
    }

    deposit.status = 'verified';
    deposit.processedAt = Date.now();
    if (notes) deposit.notes = notes;

    // Credit balance
    balanceService.creditFunds(
      deposit.playerId,
      deposit.amount,
      'deposit',
      'main',
      deposit.id,
      `Deposit via ${deposit.method} (#${deposit.id})`,
    );

    notificationService.sendNotification({
      playerId: deposit.playerId,
      title: 'Deposit Confirmed! 🎉',
      message: `Your deposit of $${deposit.amount.toFixed(2)} via ${deposit.method} has been verified and added to your main balance.`,
      type: 'deposit',
    });

    db.saveToDisk();
    return deposit;
  }

  public rejectDeposit(depositId: string, reason?: string): Deposit {
    const deposit = db.deposits.get(depositId);
    if (!deposit) {
      throw new Error('Deposit record not found');
    }
    deposit.status = 'rejected';
    deposit.processedAt = Date.now();
    if (reason) deposit.notes = reason;

    notificationService.sendNotification({
      playerId: deposit.playerId,
      title: 'Deposit Rejected',
      message: `Your deposit #${deposit.id} could not be verified.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'deposit',
    });

    db.saveToDisk();
    return deposit;
  }

  public getPlayerDeposits(playerId: string): Deposit[] {
    const list: Deposit[] = [];
    for (const dep of db.deposits.values()) {
      if (dep.playerId === playerId) list.push(dep);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPendingDeposits(): Deposit[] {
    const list: Deposit[] = [];
    for (const dep of db.deposits.values()) {
      if (dep.status === 'pending') list.push(dep);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAllDeposits(): Deposit[] {
    return Array.from(db.deposits.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const depositService = new DepositService();
