import { db } from '../db/database.js';
import { transactionService } from './transactionService.js';
import { TransactionType } from '../db/schema.js';

export interface BalanceDeductionResult {
  success: boolean;
  message?: string;
  deductedMain: number;
  deductedBonus: number;
  newMainBalance: number;
  newBonusBalance: number;
}

export class BalanceService {
  public getBalance(playerId: string) {
    const mainBal = db.mainBalances.get(playerId)?.amount || 0;
    const bonusBal = db.bonusBalances.get(playerId)?.amount || 0;
    return {
      playerId,
      mainBalance: Number(mainBal.toFixed(2)),
      bonusBalance: Number(bonusBal.toFixed(2)),
      totalBalance: Number((mainBal + bonusBal).toFixed(2)),
    };
  }

  public deductFunds(
    playerId: string,
    amount: number,
    type: TransactionType,
    referenceId?: string,
    description?: string,
  ): BalanceDeductionResult {
    if (amount <= 0) {
      return { success: false, message: 'Invalid deduction amount', deductedMain: 0, deductedBonus: 0, newMainBalance: 0, newBonusBalance: 0 };
    }

    const mainRecord = db.mainBalances.get(playerId);
    const bonusRecord = db.bonusBalances.get(playerId);

    const currentMain = mainRecord?.amount || 0;
    const currentBonus = bonusRecord?.amount || 0;
    const totalAvailable = currentMain + currentBonus;

    if (totalAvailable < amount) {
      return {
        success: false,
        message: `Insufficient balance. Required: $${amount.toFixed(2)}, Available: $${totalAvailable.toFixed(2)}`,
        deductedMain: 0,
        deductedBonus: 0,
        newMainBalance: currentMain,
        newBonusBalance: currentBonus,
      };
    }

    // Spend main balance first; if insufficient, take remaining from bonus
    let deductMain = 0;
    let deductBonus = 0;

    if (currentMain >= amount) {
      deductMain = amount;
    } else {
      deductMain = currentMain;
      deductBonus = amount - currentMain;
    }

    const newMain = currentMain - deductMain;
    const newBonus = currentBonus - deductBonus;

    if (mainRecord) {
      mainRecord.amount = newMain;
      mainRecord.updatedAt = Date.now();
    }
    if (bonusRecord) {
      bonusRecord.amount = newBonus;
      // Increment wagering progress when wagering
      bonusRecord.wageringProgress += amount;
      bonusRecord.updatedAt = Date.now();
    }

    // Record transactions
    if (deductMain > 0) {
      transactionService.recordTransaction({
        playerId,
        type,
        amount: -deductMain,
        balanceType: 'main',
        beforeBalance: currentMain,
        afterBalance: newMain,
        referenceId,
        description: description || `${type} deduction`,
      });
    }

    if (deductBonus > 0) {
      transactionService.recordTransaction({
        playerId,
        type,
        amount: -deductBonus,
        balanceType: 'bonus',
        beforeBalance: currentBonus,
        afterBalance: newBonus,
        referenceId,
        description: description ? `${description} (Bonus funds)` : `${type} bonus deduction`,
      });
    }

    db.saveToDisk();

    return {
      success: true,
      deductedMain: deductMain,
      deductedBonus: deductBonus,
      newMainBalance: newMain,
      newBonusBalance: newBonus,
    };
  }

  public creditFunds(
    playerId: string,
    amount: number,
    type: TransactionType,
    balanceType: 'main' | 'bonus' = 'main',
    referenceId?: string,
    description?: string,
  ): number {
    if (amount <= 0) return 0;

    const now = Date.now();
    let before = 0;
    let after = 0;

    if (balanceType === 'main') {
      let record = db.mainBalances.get(playerId);
      if (!record) {
        record = { playerId, amount: 0, currency: 'USD', updatedAt: now };
        db.mainBalances.set(playerId, record);
      }
      before = record.amount;
      after = before + amount;
      record.amount = after;
      record.updatedAt = now;
    } else {
      let record = db.bonusBalances.get(playerId);
      if (!record) {
        record = { playerId, amount: 0, wageringRequirement: 0, wageringProgress: 0, updatedAt: now };
        db.bonusBalances.set(playerId, record);
      }
      before = record.amount;
      after = before + amount;
      record.amount = after;
      record.updatedAt = now;
    }

    transactionService.recordTransaction({
      playerId,
      type,
      amount,
      balanceType,
      beforeBalance: before,
      afterBalance: after,
      referenceId,
      description: description || `${type} payout`,
    });

    db.saveToDisk();
    return after;
  }
}

export const balanceService = new BalanceService();
