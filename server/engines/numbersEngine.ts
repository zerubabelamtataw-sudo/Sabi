import { db } from '../db/database.js';
import {
  NumbersRound,
  NumbersTicket,
  NumbersBetType,
} from '../db/schema.js';
import { balanceService } from '../services/balanceService.js';
import { gameHistoryService } from '../services/gameHistoryService.js';
import { notificationService } from '../services/notificationService.js';
import { BaseGameEngine } from './types.js';

export interface PlaceNumbersBetResult {
  success: boolean;
  message: string;
  ticket?: NumbersTicket;
  round?: NumbersRound;
}

export class NumbersEngine implements BaseGameEngine {
  public readonly id = 'numbers';
  public readonly name = 'Lucky Numbers Engine';
  private timerHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly bettingDurationSec = 30;
  private readonly countdownDurationSec = 10;
  private readonly drawingDurationSec = 10;

  constructor() {
    this.ensureActiveRound();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ensureActiveRound();
    this.timerHandle = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.isRunning = false;
  }

  public getStatus(): Record<string, any> {
    const activeRound = this.getActiveRound();
    const tickets = activeRound ? this.getTicketsForRound(activeRound.id) : [];
    return {
      engine: this.name,
      isRunning: this.isRunning,
      activeRound,
      ticketCount: tickets.length,
      totalPool: activeRound ? activeRound.totalPool : 0,
    };
  }

  public ensureActiveRound(): NumbersRound {
    let active = this.getActiveRound();
    if (!active) {
      active = this.createNewRound();
    }
    return active;
  }

  private createNewRound(): NumbersRound {
    let maxRound = 0;
    for (const r of db.numbersRounds.values()) {
      if (r.roundNumber > maxRound) maxRound = r.roundNumber;
    }

    const now = Date.now();
    const roundId = `nround_${Date.now()}`;
    const round: NumbersRound = {
      id: roundId,
      roundNumber: maxRound + 1,
      status: 'betting',
      totalPool: 0,
      winningNumbers: [],
      totalPayout: 0,
      startTime: now,
      drawTime: now + (this.bettingDurationSec + this.countdownDurationSec) * 1000,
    };

    db.numbersRounds.set(roundId, round);
    db.saveToDisk();
    return round;
  }

  public getActiveRound(): NumbersRound | undefined {
    for (const round of db.numbersRounds.values()) {
      if (round.status !== 'settled') {
        return round;
      }
    }
    return undefined;
  }

  public getRoundById(roundId: string): NumbersRound | undefined {
    return db.numbersRounds.get(roundId);
  }

  public getTicketsForRound(roundId: string): NumbersTicket[] {
    const list: NumbersTicket[] = [];
    for (const t of db.numbersTickets.values()) {
      if (t.roundId === roundId) list.push(t);
    }
    return list;
  }

  public getPlayerTicketsInRound(roundId: string, playerId: string): NumbersTicket[] {
    const list: NumbersTicket[] = [];
    for (const t of db.numbersTickets.values()) {
      if (t.roundId === roundId && t.playerId === playerId) list.push(t);
    }
    return list;
  }

  public getBetMultiplier(betType: NumbersBetType): number {
    switch (betType) {
      case 'pick1': return 6.0;
      case 'pick2': return 35.0;
      case 'pick3': return 180.0;
      case 'parity_even':
      case 'parity_odd': return 1.95;
      case 'range_low':
      case 'range_high': return 1.95;
      default: return 1.0;
    }
  }

  public placeBet(params: {
    playerId: string;
    betType: NumbersBetType;
    selectedNumbers: number[];
    betAmount: number;
  }): PlaceNumbersBetResult {
    const round = this.ensureActiveRound();

    if (round.status !== 'betting') {
      return { success: false, message: 'Betting is closed for this draw. Next round starts shortly.' };
    }

    if (params.betAmount <= 0) {
      return { success: false, message: 'Bet amount must be greater than $0.' };
    }

    // Validate numbers
    for (const num of params.selectedNumbers) {
      if (num < 1 || num > 36) {
        return { success: false, message: `Invalid number: ${num}. Numbers must be between 1 and 36.` };
      }
    }

    if (params.betType === 'pick1' && params.selectedNumbers.length !== 1) {
      return { success: false, message: 'Pick 1 requires exactly 1 number.' };
    }
    if (params.betType === 'pick2' && params.selectedNumbers.length !== 2) {
      return { success: false, message: 'Pick 2 requires exactly 2 distinct numbers.' };
    }
    if (params.betType === 'pick3' && params.selectedNumbers.length !== 3) {
      return { success: false, message: 'Pick 3 requires exactly 3 distinct numbers.' };
    }

    // Deduct bet amount using shared balanceService
    const deduction = balanceService.deductFunds(
      params.playerId,
      params.betAmount,
      'numbers_bet',
      round.id,
      `Placed ${params.betType} bet of $${params.betAmount.toFixed(2)} on Lucky Numbers #${round.roundNumber}`,
    );

    if (!deduction.success) {
      return { success: false, message: deduction.message || 'Payment deduction failed.' };
    }

    const multiplier = this.getBetMultiplier(params.betType);
    const potentialWin = Number((params.betAmount * multiplier).toFixed(2));
    const ticketId = `ntick_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const ticket: NumbersTicket = {
      id: ticketId,
      roundId: round.id,
      playerId: params.playerId,
      betType: params.betType,
      selectedNumbers: params.selectedNumbers,
      betAmount: params.betAmount,
      multiplier,
      potentialWin,
      status: 'pending',
      payoutAmount: 0,
      createdAt: Date.now(),
    };

    db.numbersTickets.set(ticketId, ticket);
    round.totalPool = Number((round.totalPool + params.betAmount).toFixed(2));
    db.saveToDisk();

    return {
      success: true,
      message: `Bet placed on ${params.betType}! Potential win: $${potentialWin.toFixed(2)} (${multiplier}x)`,
      ticket,
      round,
    };
  }

  private tick(): void {
    const now = Date.now();
    const round = this.getActiveRound();
    if (!round) {
      this.createNewRound();
      return;
    }

    const timeUntilDraw = round.drawTime - now;

    // 1. Check if betting phase finished -> transition to countdown
    if (round.status === 'betting' && timeUntilDraw <= this.countdownDurationSec * 1000) {
      round.status = 'countdown';
      db.saveToDisk();
    }

    // 2. Check if countdown finished -> transition to drawing
    if (round.status === 'countdown' && timeUntilDraw <= 0) {
      round.status = 'drawing';
      // Draw 5 winning balls from 1 to 36
      const pool = Array.from({ length: 36 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      round.winningNumbers = pool.slice(0, 5).sort((a, b) => a - b);
      db.saveToDisk();
    }

    // 3. Drawing phase ends after drawing duration -> settle tickets
    if (round.status === 'drawing' && timeUntilDraw <= -this.drawingDurationSec * 1000) {
      this.settleRound(round);
    }
  }

  private settleRound(round: NumbersRound): void {
    round.status = 'settled';
    round.settledAt = Date.now();

    const tickets = this.getTicketsForRound(round.id);
    let roundTotalPayout = 0;

    for (const ticket of tickets) {
      const isWon = this.evaluateTicket(ticket, round.winningNumbers);

      if (isWon) {
        ticket.status = 'won';
        ticket.payoutAmount = ticket.potentialWin;
        roundTotalPayout += ticket.potentialWin;

        // Disburse payout using shared balanceService
        balanceService.creditFunds(
          ticket.playerId,
          ticket.potentialWin,
          'numbers_win',
          'main',
          round.id,
          `Won Numbers Draw #${round.roundNumber} (${ticket.betType}): $${ticket.potentialWin.toFixed(2)}`,
        );

        // Record winner & payout in shared services
        gameHistoryService.recordWinnerAndPayout({
          gameType: 'numbers',
          roundId: round.id,
          playerId: ticket.playerId,
          prizeType: `${ticket.betType.toUpperCase()} Match`,
          prizeAmount: ticket.potentialWin,
          transactionId: `tx_nwin_${Date.now()}`,
        });

        // Send alert
        notificationService.sendNotification({
          playerId: ticket.playerId,
          title: '🎉 NUMBERS DRAW WINNER!',
          message: `Your ${ticket.betType} bet won $${ticket.potentialWin.toFixed(2)} in Draw #${round.roundNumber}! Winning numbers: ${round.winningNumbers.join(', ')}`,
          type: 'win',
        });
      } else {
        ticket.status = 'lost';
        ticket.payoutAmount = 0;
      }

      // Record in game history
      gameHistoryService.recordHistory({
        gameType: 'numbers',
        roundId: round.id,
        playerId: ticket.playerId,
        betAmount: ticket.betAmount,
        payoutAmount: ticket.payoutAmount,
        outcome: ticket.status === 'won' ? 'win' : 'loss',
        details: {
          roundNumber: round.roundNumber,
          betType: ticket.betType,
          selectedNumbers: ticket.selectedNumbers,
          winningNumbers: round.winningNumbers,
        },
      });
    }

    round.totalPayout = Number(roundTotalPayout.toFixed(2));
    db.saveToDisk();

    // Start next round in 4 seconds
    setTimeout(() => {
      this.createNewRound();
    }, 4000);
  }

  private evaluateTicket(ticket: NumbersTicket, winningNumbers: number[]): boolean {
    const winSet = new Set(winningNumbers);

    switch (ticket.betType) {
      case 'pick1':
        return ticket.selectedNumbers.some((n) => winSet.has(n));

      case 'pick2':
        return ticket.selectedNumbers.every((n) => winSet.has(n));

      case 'pick3':
        return ticket.selectedNumbers.every((n) => winSet.has(n));

      case 'parity_even': {
        const evens = winningNumbers.filter((n) => n % 2 === 0).length;
        return evens >= 3;
      }

      case 'parity_odd': {
        const odds = winningNumbers.filter((n) => n % 2 !== 0).length;
        return odds >= 3;
      }

      case 'range_low':
        return winningNumbers[0] <= 18;

      case 'range_high':
        return winningNumbers[0] >= 19;

      default:
        return false;
    }
  }
}

export const numbersEngine = new NumbersEngine();
