import { db } from '../db/database.js';
import { GameHistory, Winner, Payout } from '../db/schema.js';

export interface RecordGameHistoryParams {
  gameType: 'bingo' | 'numbers';
  roundId: string;
  playerId: string;
  betAmount: number;
  payoutAmount: number;
  outcome: 'win' | 'loss';
  details: Record<string, any>;
}

export class GameHistoryService {
  public recordHistory(params: RecordGameHistoryParams): GameHistory {
    const id = `gh_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const history: GameHistory = {
      id,
      gameType: params.gameType,
      roundId: params.roundId,
      playerId: params.playerId,
      betAmount: Number(params.betAmount.toFixed(2)),
      payoutAmount: Number(params.payoutAmount.toFixed(2)),
      outcome: params.outcome,
      details: params.details,
      createdAt: Date.now(),
    };

    db.gameHistory.set(id, history);
    db.saveToDisk();
    return history;
  }

  public recordWinnerAndPayout(params: {
    gameType: 'bingo' | 'numbers';
    roundId: string;
    playerId: string;
    prizeType: string;
    prizeAmount: number;
    transactionId: string;
  }): { winner: Winner; payout: Payout } {
    const winnerId = `win_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const winner: Winner = {
      id: winnerId,
      gameType: params.gameType,
      roundId: params.roundId,
      playerId: params.playerId,
      prizeType: params.prizeType,
      prizeAmount: Number(params.prizeAmount.toFixed(2)),
      createdAt: Date.now(),
    };
    db.winners.set(winnerId, winner);

    const payoutId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const payout: Payout = {
      id: payoutId,
      winnerId,
      playerId: params.playerId,
      transactionId: params.transactionId,
      amount: Number(params.prizeAmount.toFixed(2)),
      status: 'completed',
      processedAt: Date.now(),
    };
    db.payouts.set(payoutId, payout);

    db.saveToDisk();
    return { winner, payout };
  }

  public getPlayerGameHistory(playerId: string, limit = 30): GameHistory[] {
    const list: GameHistory[] = [];
    for (const item of db.gameHistory.values()) {
      if (item.playerId === playerId) {
        list.push(item);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  public getAllGameHistory(limit = 100): GameHistory[] {
    return Array.from(db.gameHistory.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  public getRecentWinners(limit = 20): Array<Winner & { username?: string }> {
    const winners = Array.from(db.winners.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return winners.map((w) => {
      const player = db.players.get(w.playerId);
      return {
        ...w,
        username: player?.username || 'Player',
      };
    });
  }
}

export const gameHistoryService = new GameHistoryService();
