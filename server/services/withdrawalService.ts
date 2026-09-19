import { db } from '../db/database.js';
import { Withdrawal, WithdrawalMethod } from '../db/schema.js';
import { balanceService } from './balanceService.js';
import { notificationService } from './notificationService.js';

export interface CreateWithdrawalParams {
  playerId: string;
  amount: number;
  destination: string;
  method: WithdrawalMethod;
}

export class WithdrawalService {
  public createWithdrawalRequest(params: CreateWithdrawalParams): Withdrawal {
    const minWth = db.settings.minWithdrawal;
    if (params.amount < minWth) {
      throw new Error(`Minimum withdrawal amount is $${minWth.toFixed(2)}`);
    }

    const mainBal = db.mainBalances.get(params.playerId)?.amount || 0;
    if (mainBal < params.amount) {
      throw new Error(`Insufficient main balance. Available: $${mainBal.toFixed(2)}`);
    }

    // Standard fee calculation (e.g. 2% or flat $1, whichever is minimum $1)
    const fee = Number(Math.max(1.0, params.amount * 0.02).toFixed(2));
    const netAmount = Number((params.amount - fee).toFixed(2));

    const id = `wth_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Deduct funds immediately into escrow/lock
    const deduction = balanceService.deductFunds(
      params.playerId,
      params.amount,
      'withdrawal',
      id,
      `Withdrawal request #${id} to ${params.destination}`,
    );

    if (!deduction.success) {
      throw new Error(deduction.message || 'Failed to reserve withdrawal balance');
    }

    const withdrawal: Withdrawal = {
      id,
      playerId: params.playerId,
      amount: params.amount,
      fee,
      netAmount,
      destination: params.destination,
      method: params.method,
      status: 'pending',
      createdAt: Date.now(),
    };

    db.withdrawals.set(id, withdrawal);
    db.saveToDisk();

    notificationService.sendNotification({
      playerId: params.playerId,
      title: 'Withdrawal Pending Review',
      message: `Your withdrawal request #${id} for $${params.amount.toFixed(2)} ($${netAmount.toFixed(2)} net) is queued for processing.`,
      type: 'withdrawal',
    });

    return withdrawal;
  }

  public approveWithdrawal(withdrawalId: string): Withdrawal {
    const withdrawal = db.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal record not found');
    if (withdrawal.status !== 'pending') throw new Error(`Status is already ${withdrawal.status}`);

    withdrawal.status = 'approved';
    withdrawal.processedAt = Date.now();

    notificationService.sendNotification({
      playerId: withdrawal.playerId,
      title: 'Withdrawal Sent! 💸',
      message: `Your withdrawal #${withdrawal.id} of $${withdrawal.netAmount.toFixed(2)} has been sent to ${withdrawal.destination}.`,
      type: 'withdrawal',
    });

    db.saveToDisk();
    return withdrawal;
  }

  public rejectAndRefundWithdrawal(withdrawalId: string, reason?: string): Withdrawal {
    const withdrawal = db.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal record not found');
    if (withdrawal.status !== 'pending') throw new Error(`Status is already ${withdrawal.status}`);

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason || 'Rejected by administration';
    withdrawal.processedAt = Date.now();

    // Refund full requested amount back to player main balance
    balanceService.creditFunds(
      withdrawal.playerId,
      withdrawal.amount,
      'refund',
      'main',
      withdrawal.id,
      `Refund for rejected withdrawal #${withdrawal.id}: ${withdrawal.rejectionReason}`,
    );

    notificationService.sendNotification({
      playerId: withdrawal.playerId,
      title: 'Withdrawal Returned',
      message: `Your withdrawal #${withdrawal.id} for $${withdrawal.amount.toFixed(2)} was rejected and funds have been refunded to your balance.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'withdrawal',
    });

    db.saveToDisk();
    return withdrawal;
  }

  public getPlayerWithdrawals(playerId: string): Withdrawal[] {
    const list: Withdrawal[] = [];
    for (const w of db.withdrawals.values()) {
      if (w.playerId === playerId) list.push(w);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPendingWithdrawals(): Withdrawal[] {
    const list: Withdrawal[] = [];
    for (const w of db.withdrawals.values()) {
      if (w.status === 'pending') list.push(w);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAllWithdrawals(): Withdrawal[] {
    return Array.from(db.withdrawals.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const withdrawalService = new WithdrawalService();
