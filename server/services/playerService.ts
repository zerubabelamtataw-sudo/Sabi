import { db } from '../db/database.js';
import { Player, MainBalance, BonusBalance } from '../db/schema.js';

export class PlayerService {
  public getOrCreatePlayer(telegramId: string, info: { username?: string; firstName: string; lastName?: string }): Player {
    // Check if player exists by telegramId
    for (const player of db.players.values()) {
      if (player.telegramId === telegramId) {
        player.lastActiveAt = Date.now();
        if (info.username) player.username = info.username;
        if (info.firstName) player.firstName = info.firstName;
        if (info.lastName) player.lastName = info.lastName;
        return player;
      }
    }

    // Create new player
    const now = Date.now();
    const newId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPlayer: Player = {
      id: newId,
      telegramId,
      username: info.username || `User${telegramId.slice(-4)}`,
      firstName: info.firstName,
      lastName: info.lastName,
      status: 'active',
      vipLevel: 1,
      createdAt: now,
      lastActiveAt: now,
    };

    db.players.set(newId, newPlayer);

    // Initialize main balance with 0
    const mainBal: MainBalance = {
      playerId: newId,
      amount: 100.0, // Welcome demo balance for playing right away
      currency: 'USD',
      updatedAt: now,
    };
    db.mainBalances.set(newId, mainBal);

    // Initialize bonus balance
    const bonusBal: BonusBalance = {
      playerId: newId,
      amount: db.settings.defaultBonusAmount,
      wageringRequirement: db.settings.defaultBonusAmount * 4,
      wageringProgress: 0,
      updatedAt: now,
    };
    db.bonusBalances.set(newId, bonusBal);

    db.saveToDisk();
    return newPlayer;
  }

  public getPlayerById(playerId: string): Player | undefined {
    return db.players.get(playerId);
  }

  public getPlayerByTelegramId(telegramId: string): Player | undefined {
    for (const player of db.players.values()) {
      if (player.telegramId === telegramId) {
        return player;
      }
    }
    return undefined;
  }

  public getAllPlayers(): Player[] {
    return Array.from(db.players.values());
  }

  public updatePlayerStatus(playerId: string, status: 'active' | 'suspended' | 'banned'): boolean {
    const player = db.players.get(playerId);
    if (!player) return false;
    player.status = status;
    db.saveToDisk();
    return true;
  }

  public getPlayerProfile(playerId: string) {
    const player = db.players.get(playerId);
    if (!player) return null;

    const mainBal = db.mainBalances.get(playerId)?.amount || 0;
    const bonusBal = db.bonusBalances.get(playerId)?.amount || 0;

    // Aggregate player stats from game history
    let totalBets = 0;
    let totalWins = 0;
    let roundsPlayed = 0;
    for (const history of db.gameHistory.values()) {
      if (history.playerId === playerId) {
        roundsPlayed++;
        totalBets += history.betAmount;
        totalWins += history.payoutAmount;
      }
    }

    return {
      ...player,
      mainBalance: mainBal,
      bonusBalance: bonusBal,
      totalBalance: mainBal + bonusBal,
      stats: {
        roundsPlayed,
        totalBets: Number(totalBets.toFixed(2)),
        totalWins: Number(totalWins.toFixed(2)),
        netProfit: Number((totalWins - totalBets).toFixed(2)),
      },
    };
  }
}

export const playerService = new PlayerService();
