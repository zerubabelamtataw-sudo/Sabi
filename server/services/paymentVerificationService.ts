import { depositService } from './depositService.js';
import { db } from '../db/database.js';

export interface VerificationResult {
  verified: boolean;
  message: string;
  depositId?: string;
  amount?: number;
}

export class PaymentVerificationService {
  /**
   * Verifies a payment reference or receipt proof submitted by a player or automated webhook.
   */
  public verifyProof(depositId: string, proofText: string): VerificationResult {
    const deposit = db.deposits.get(depositId);
    if (!deposit) {
      return { verified: false, message: 'Deposit reference not found.' };
    }

    if (deposit.status !== 'pending') {
      return { verified: false, message: `Deposit is already in status: ${deposit.status}` };
    }

    // Check proof format (simulated gateway check or manual voucher check)
    if (!proofText || proofText.trim().length < 4) {
      return { verified: false, message: 'Invalid proof reference. Minimum 4 characters required.' };
    }

    deposit.proofRef = proofText.trim();
    depositService.verifyAndCreditDeposit(depositId, `Verified with proof: ${proofText}`);

    return {
      verified: true,
      message: 'Deposit verified and credited successfully!',
      depositId: deposit.id,
      amount: deposit.amount,
    };
  }

  /**
   * Instant mock payment generator for demo & testing in Telegram bot
   */
  public simulateInstantPayment(depositId: string): VerificationResult {
    return this.verifyProof(depositId, `SIMULATED_SUCCESS_${Date.now()}`);
  }
}

export const paymentVerificationService = new PaymentVerificationService();
