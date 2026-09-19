import { db } from '../db/database.js';
import {
  BingoRoom,
  BingoRound,
  BingoTicket,
  BingoRoundStatus,
} from '../db/schema.js';
import { balanceService } from '../services/balanceService.js';
import { gameHistoryService } from '../services/gameHistoryService.js';
import { notificationService } from '../services/notificationService.js';
import { BaseGameEngine } from './types.js';

export interface BuyTicketResult {
  success: boolean;
  message: string;
  tickets?: BingoTicket[];
  round?: BingoRound;
}

export class BingoEngine implements BaseGameEngine {
  public readonly id = 'bingo';
  public readonly name = 'Bingo 75 Engine';
  private timerHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.ensureActiveRounds();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ensureActiveRounds();
    // Engine loop runs every 1 second to progress round states
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
    const rooms = Array.from(db.bingoRooms.values()).map((room) => {
      const activeRound = this.getActiveRoundForRoom(room.id);
      const tickets = activeRound ? this.getTicketsForRound(activeRound.id) : [];
      return {
        room,
        activeRound,
        ticketCount: tickets.length,
        playerCount: new Set(tickets.map((t) => t.playerId)).size,
      };
    });

    return {
      engine: this.name,
      isRunning: this.isRunning,
      rooms,
    };
  }

  /**
   * Initializes an active round for each active room if none exists.
   */
  public ensureActiveRounds(): void {
    for (const room of db.bingoRooms.values()) {
      if (room.status !== 'active') continue;
      const existing = this.getActiveRoundForRoom(room.id);
      if (!existing) {
        this.createNewRound(room.id);
      }
    }
  }

  private createNewRound(roomId: string): BingoRound {
    const room = db.bingoRooms.get(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);

    // Compute round number
    let maxRoundNumber = 0;
    for (const r of db.bingoRounds.values()) {
      if (r.roomId === roomId && r.roundNumber > maxRoundNumber) {
        maxRoundNumber = r.roundNumber;
      }
    }

    const roundId = `bround_${roomId}_${Date.now()}`;
    const newRound: BingoRound = {
      id: roundId,
      roomId,
      roundNumber: maxRoundNumber + 1,
      status: 'waiting',
      prizePool: 0,
      linePrize: 0,
      bingoPrize: 0,
      drawnNumbers: [],
      currentDrawnIndex: 0,
      startTime: Date.now(),
    };

    db.bingoRounds.set(roundId, newRound);
    return newRound;
  }

  public getActiveRoundForRoom(roomId: string): BingoRound | undefined {
    for (const round of db.bingoRounds.values()) {
      if (round.roomId === roomId && round.status !== 'ended') {
        return round;
      }
    }
    return undefined;
  }

  public getRoundById(roundId: string): BingoRound | undefined {
    return db.bingoRounds.get(roundId);
  }

  public getTicketsForRound(roundId: string): BingoTicket[] {
    const list: BingoTicket[] = [];
    for (const ticket of db.bingoTickets.values()) {
      if (ticket.roundId === roundId) list.push(ticket);
    }
    return list;
  }

  public getPlayerTicketsInRound(roundId: string, playerId: string): BingoTicket[] {
    const list: BingoTicket[] = [];
    for (const ticket of db.bingoTickets.values()) {
      if (ticket.roundId === roundId && ticket.playerId === playerId) {
        list.push(ticket);
      }
    }
    return list;
  }

  /**
   * Generates a standard 5x5 Bingo cartela.
   * Column 0 (B): 1-15
   * Column 1 (I): 16-30
   * Column 2 (N): 31-45 (Center [2][2] is FREE = 0)
   * Column 3 (G): 46-60
   * Column 4 (O): 61-75
   */
  public generateCartela(): { cardMatrix: number[][]; markedMatrix: boolean[][] } {
    const cardMatrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    const markedMatrix: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

    const columnRanges = [
      { min: 1, max: 15 },
      { min: 16, max: 30 },
      { min: 31, max: 45 },
      { min: 46, max: 60 },
      { min: 61, max: 75 },
    ];

    for (let col = 0; col < 5; col++) {
      const { min, max } = columnRanges[col];
      const pool: number[] = [];
      for (let n = min; n <= max; n++) pool.push(n);

      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          cardMatrix[row][col] = 0; // FREE space
          markedMatrix[row][col] = true;
        } else {
          cardMatrix[row][col] = pool.pop()!;
        }
      }
    }

    return { cardMatrix, markedMatrix };
  }

  /**
   * Purchases tickets for a player in a room using shared balanceService.
   */
  public buyTickets(roomId: string, playerId: string, count: number): BuyTicketResult {
    const room = db.bingoRooms.get(roomId);
    if (!room || room.status !== 'active') {
      return { success: false, message: 'Bingo room is not available.' };
    }

    let round = this.getActiveRoundForRoom(roomId);
    if (!round) {
      round = this.createNewRound(roomId);
    }

    if (round.status !== 'waiting' && round.status !== 'countdown') {
      return { success: false, message: 'Round has already begun drawing. Please wait for the next round.' };
    }

    const existingTickets = this.getPlayerTicketsInRound(round.id, playerId);
    if (existingTickets.length + count > room.maxTicketsPerPlayer) {
      return {
        success: false,
        message: `Max ${room.maxTicketsPerPlayer} tickets allowed per round. You already hold ${existingTickets.length}.`,
      };
    }

    const totalCost = room.ticketPrice * count;

    // Use shared balanceService to deduct funds
    const deduction = balanceService.deductFunds(
      playerId,
      totalCost,
      'bingo_buyin',
      round.id,
      `Bought ${count} Bingo ticket(s) in ${room.name} (Round #${round.roundNumber})`,
    );

    if (!deduction.success) {
      return { success: false, message: deduction.message || 'Payment deduction failed.' };
    }

    // Generate cartelas
    const newTickets: BingoTicket[] = [];
    for (let i = 0; i < count; i++) {
      const { cardMatrix, markedMatrix } = this.generateCartela();
      const ticketId = `btick_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const ticket: BingoTicket = {
        id: ticketId,
        roundId: round.id,
        playerId,
        cardMatrix,
        markedMatrix,
        purchasedAt: Date.now(),
        hasLine: false,
        hasBingo: false,
      };
      db.bingoTickets.set(ticketId, ticket);
      newTickets.push(ticket);
    }

    // Update Round Prize Pool
    const allRoundTickets = this.getTicketsForRound(round.id);
    const grossPot = allRoundTickets.length * room.ticketPrice;
    const houseFee = grossPot * (room.houseFeePct / 100);
    const netPool = grossPot - houseFee;

    round.prizePool = Number(netPool.toFixed(2));
    round.linePrize = Number((netPool * 0.3).toFixed(2));
    round.bingoPrize = Number((netPool * 0.7).toFixed(2));

    // If waiting and min players achieved, switch to countdown
    const uniquePlayers = new Set(allRoundTickets.map((t) => t.playerId)).size;
    if (round.status === 'waiting' && uniquePlayers >= room.minPlayersToStart) {
      round.status = 'countdown';
      round.countdownEndTime = Date.now() + room.countdownDurationSec * 1000;
    }

    db.saveToDisk();

    return {
      success: true,
      message: `Successfully purchased ${count} ticket(s) for $${totalCost.toFixed(2)}!`,
      tickets: newTickets,
      round,
    };
  }

  /**
   * Main state machine ticker.
   */
  private tick(): void {
    const now = Date.now();

    for (const room of db.bingoRooms.values()) {
      if (room.status !== 'active') continue;
      const round = this.getActiveRoundForRoom(room.id);
      if (!round) {
        this.createNewRound(room.id);
        continue;
      }

      // 1. COUNTDOWN PHASE
      if (round.status === 'countdown') {
        if (round.countdownEndTime && now >= round.countdownEndTime) {
          // Transition to DRAWING phase
          round.status = 'drawing';
          // Pre-generate shuffled sequence of balls 1 to 75
          const balls = Array.from({ length: 75 }, (_, i) => i + 1);
          for (let i = balls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [balls[i], balls[j]] = [balls[j], balls[i]];
          }
          round.drawnNumbers = balls;
          round.currentDrawnIndex = 0;
          db.saveToDisk();
        }
      }

      // 2. DRAWING PHASE
      else if (round.status === 'drawing') {
        // Draw one ball per tick or interval
        if (round.currentDrawnIndex < round.drawnNumbers.length) {
          round.currentDrawnIndex++;
          const drawnList = round.drawnNumbers.slice(0, round.currentDrawnIndex);
          const latestBall = drawnList[drawnList.length - 1];

          // Check tickets
          this.processDrawnBall(room, round, latestBall, drawnList);
        } else {
          // All balls drawn without a bingo? Settle round
          this.endRound(room, round);
        }
      }

      // 3. ENDED PHASE CLEANUP
      else if (round.status === 'ended') {
        // Wait 5 seconds before launching fresh round
        if (round.endTime && now >= round.endTime + 5000) {
          this.createNewRound(room.id);
        }
      }
    }
  }

  private processDrawnBall(room: BingoRoom, round: BingoRound, ball: number, drawnNumbers: number[]): void {
    const tickets = this.getTicketsForRound(round.id);

    // Mark ball on all tickets
    for (const ticket of tickets) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (ticket.cardMatrix[r][c] === ball) {
            ticket.markedMatrix[r][c] = true;
          }
        }
      }

      // 1. Line Check (if no line winner declared yet)
      if (!round.lineWinnerPlayerId && !ticket.hasLine) {
        if (this.checkLine(ticket.markedMatrix)) {
          ticket.hasLine = true;
          round.lineWinnerPlayerId = ticket.playerId;
          round.lineWinnerTicketId = ticket.id;

          // Award Line Prize
          if (round.linePrize > 0) {
            this.disbursePrize(
              ticket.playerId,
              round.linePrize,
              'Line Prize',
              round,
              room,
            );
          }
        }
      }

      // 2. Full House Bingo Check
      if (!ticket.hasBingo) {
        if (this.checkFullBingo(ticket.markedMatrix)) {
          ticket.hasBingo = true;
          round.bingoWinnerPlayerId = ticket.playerId;
          round.bingoWinnerTicketId = ticket.id;

          // Award Bingo Prize
          if (round.bingoPrize > 0) {
            this.disbursePrize(
              ticket.playerId,
              round.bingoPrize,
              'Full House BINGO',
              round,
              room,
            );
          }

          // Full House triggers immediate end of drawing phase!
          this.endRound(room, round);
          return;
        }
      }
    }
  }

  private checkLine(marked: boolean[][]): boolean {
    // Horizontal rows
    for (let r = 0; r < 5; r++) {
      if (marked[r].every(Boolean)) return true;
    }
    // Vertical columns
    for (let c = 0; c < 5; c++) {
      if (marked.every((row) => row[c])) return true;
    }
    // Diagonals
    if (marked[0][0] && marked[1][1] && marked[2][2] && marked[3][3] && marked[4][4]) return true;
    if (marked[0][4] && marked[1][3] && marked[2][2] && marked[3][1] && marked[4][0]) return true;

    return false;
  }

  private checkFullBingo(marked: boolean[][]): boolean {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!marked[r][c]) return false;
      }
    }
    return true;
  }

  private disbursePrize(
    playerId: string,
    amount: number,
    prizeType: string,
    round: BingoRound,
    room: BingoRoom,
  ): void {
    const afterBalance = balanceService.creditFunds(
      playerId,
      amount,
      'bingo_win',
      'main',
      round.id,
      `Won ${prizeType} ($${amount.toFixed(2)}) in ${room.name} (Round #${round.roundNumber})`,
    );

    // Record winner & payout in shared services
    gameHistoryService.recordWinnerAndPayout({
      gameType: 'bingo',
      roundId: round.id,
      playerId,
      prizeType,
      prizeAmount: amount,
      transactionId: `tx_bwin_${Date.now()}`,
    });

    // Notify player
    notificationService.sendNotification({
      playerId,
      title: `🎉 ${prizeType} WINNER!`,
      message: `You won $${amount.toFixed(2)} in ${room.name} Round #${round.roundNumber}! Credited to main balance.`,
      type: 'win',
    });
  }

  private endRound(room: BingoRoom, round: BingoRound): void {
    round.status = 'ended';
    round.endTime = Date.now();

    // Log game history for all participants
    const tickets = this.getTicketsForRound(round.id);
    const playerTicketsMap = new Map<string, BingoTicket[]>();
    for (const t of tickets) {
      const arr = playerTicketsMap.get(t.playerId) || [];
      arr.push(t);
      playerTicketsMap.set(t.playerId, arr);
    }

    for (const [playerId, playerTickets] of playerTicketsMap.entries()) {
      const betAmount = playerTickets.length * room.ticketPrice;
      let payout = 0;
      if (round.lineWinnerPlayerId === playerId) payout += round.linePrize;
      if (round.bingoWinnerPlayerId === playerId) payout += round.bingoPrize;

      gameHistoryService.recordHistory({
        gameType: 'bingo',
        roundId: round.id,
        playerId,
        betAmount,
        payoutAmount: payout,
        outcome: payout > 0 ? 'win' : 'loss',
        details: {
          roomName: room.name,
          ticketCount: playerTickets.length,
          roundNumber: round.roundNumber,
          isLineWinner: round.lineWinnerPlayerId === playerId,
          isBingoWinner: round.bingoWinnerPlayerId === playerId,
        },
      });
    }

    db.saveToDisk();
  }
}

export const bingoEngine = new BingoEngine();
