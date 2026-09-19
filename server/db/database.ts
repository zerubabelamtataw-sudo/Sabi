import fs from 'fs';
import path from 'path';
import {
  Player,
  MainBalance,
  BonusBalance,
  Deposit,
  Withdrawal,
  Transaction,
  BingoRoom,
  BingoRound,
  BingoTicket,
  NumbersRound,
  NumbersTicket,
  Winner,
  Payout,
  GameHistory,
  SystemNotification,
  SystemSettings,
} from './schema.js';

export interface DatabaseState {
  players: Map<string, Player>;
  mainBalances: Map<string, MainBalance>;
  bonusBalances: Map<string, BonusBalance>;
  deposits: Map<string, Deposit>;
  withdrawals: Map<string, Withdrawal>;
  transactions: Map<string, Transaction>;
  bingoRooms: Map<string, BingoRoom>;
  bingoRounds: Map<string, BingoRound>;
  bingoTickets: Map<string, BingoTicket>;
  numbersRounds: Map<string, NumbersRound>;
  numbersTickets: Map<string, NumbersTicket>;
  winners: Map<string, Winner>;
  payouts: Map<string, Payout>;
  gameHistory: Map<string, GameHistory>;
  notifications: Map<string, SystemNotification>;
  settings: SystemSettings;
}

class Database {
  private state: DatabaseState;
  private readonly storageFile: string;

  constructor() {
    this.storageFile = path.resolve(process.cwd(), 'data', 'platform_db.json');
    this.state = this.initializeDefaultState();
    this.loadFromDisk();
  }

  private initializeDefaultState(): DatabaseState {
    const now = Date.now();

    const defaultPlayer: Player = {
      id: 'usr_demo_1',
      telegramId: '7829104',
      username: 'LuckyAlex',
      firstName: 'Alex',
      lastName: 'Vance',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      vipLevel: 2,
      createdAt: now - 86400000 * 5,
      lastActiveAt: now,
    };

    const adminPlayer: Player = {
      id: 'usr_admin_1',
      telegramId: '9900112',
      username: 'BossOperator',
      firstName: 'Admin',
      lastName: 'Master',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      vipLevel: 5,
      createdAt: now - 86400000 * 30,
      lastActiveAt: now,
    };

    const players = new Map<string, Player>([
      [defaultPlayer.id, defaultPlayer],
      [adminPlayer.id, adminPlayer],
    ]);

    const mainBalances = new Map<string, MainBalance>([
      [defaultPlayer.id, { playerId: defaultPlayer.id, amount: 250.0, currency: 'USD', updatedAt: now }],
      [adminPlayer.id, { playerId: adminPlayer.id, amount: 9999.0, currency: 'USD', updatedAt: now }],
    ]);

    const bonusBalances = new Map<string, BonusBalance>([
      [defaultPlayer.id, { playerId: defaultPlayer.id, amount: 25.0, wageringRequirement: 100.0, wageringProgress: 40.0, updatedAt: now }],
      [adminPlayer.id, { playerId: adminPlayer.id, amount: 0.0, wageringRequirement: 0.0, wageringProgress: 0.0, updatedAt: now }],
    ]);

    const deposits = new Map<string, Deposit>([
      [
        'dep_sample_1',
        {
          id: 'dep_sample_1',
          playerId: defaultPlayer.id,
          amount: 250.0,
          method: 'crypto_usdt',
          status: 'verified',
          proofRef: 'tx_0x98f4b1239cba88210',
          notes: 'USDT TRC20 Deposit auto-credited',
          createdAt: now - 86400000 * 2,
          processedAt: now - 86400000 * 2 + 15000,
        },
      ],
      [
        'dep_pending_1',
        {
          id: 'dep_pending_1',
          playerId: defaultPlayer.id,
          amount: 100.0,
          method: 'pix',
          status: 'pending',
          proofRef: 'pix_key_918231920',
          notes: 'Pending bank receipt confirmation',
          createdAt: now - 3600000,
        },
      ],
    ]);

    const withdrawals = new Map<string, Withdrawal>([
      [
        'wth_sample_1',
        {
          id: 'wth_sample_1',
          playerId: defaultPlayer.id,
          amount: 50.0,
          fee: 1.0,
          netAmount: 49.0,
          destination: 'TQ1r8v7x9L4K...4pQ9',
          method: 'crypto_usdt',
          status: 'pending',
          createdAt: now - 1800000,
        },
      ],
    ]);

    const transactions = new Map<string, Transaction>([
      [
        'tx_init_1',
        {
          id: 'tx_init_1',
          playerId: defaultPlayer.id,
          type: 'deposit',
          amount: 250.0,
          balanceType: 'main',
          beforeBalance: 0,
          afterBalance: 250.0,
          referenceId: 'dep_sample_1',
          description: 'Deposit via USDT TRC20',
          createdAt: now - 86400000 * 2,
        },
      ],
      [
        'tx_init_2',
        {
          id: 'tx_init_2',
          playerId: defaultPlayer.id,
          type: 'bonus_grant',
          amount: 25.0,
          balanceType: 'bonus',
          beforeBalance: 0,
          afterBalance: 25.0,
          referenceId: 'welcome_promo',
          description: 'Welcome Telegram Registration Bonus',
          createdAt: now - 86400000 * 2,
        },
      ],
    ]);

    const bingoRooms = new Map<string, BingoRoom>([
      [
        'room_classic',
        {
          id: 'room_classic',
          name: 'Classic 75 Lounge',
          theme: 'emerald',
          ticketPrice: 2.0,
          maxTicketsPerPlayer: 6,
          minPlayersToStart: 1,
          prizePoolPct: 85.0,
          houseFeePct: 15.0,
          countdownDurationSec: 15,
          drawIntervalSec: 3,
          status: 'active',
        },
      ],
      [
        'room_silver',
        {
          id: 'room_silver',
          name: 'Silver Jackpot Hall',
          theme: 'amber',
          ticketPrice: 5.0,
          maxTicketsPerPlayer: 8,
          minPlayersToStart: 1,
          prizePoolPct: 88.0,
          houseFeePct: 12.0,
          countdownDurationSec: 20,
          drawIntervalSec: 3,
          status: 'active',
        },
      ],
      [
        'room_highroller',
        {
          id: 'room_highroller',
          name: 'VIP High Roller Club',
          theme: 'purple',
          ticketPrice: 25.0,
          maxTicketsPerPlayer: 10,
          minPlayersToStart: 1,
          prizePoolPct: 90.0,
          houseFeePct: 10.0,
          countdownDurationSec: 30,
          drawIntervalSec: 2,
          status: 'active',
        },
      ],
    ]);

    const bingoRounds = new Map<string, BingoRound>();
    const bingoTickets = new Map<string, BingoTicket>();
    const numbersRounds = new Map<string, NumbersRound>();
    const numbersTickets = new Map<string, NumbersTicket>();
    const winners = new Map<string, Winner>();
    const payouts = new Map<string, Payout>();
    const gameHistory = new Map<string, GameHistory>();

    const notifications = new Map<string, SystemNotification>([
      [
        'notif_welcome',
        {
          id: 'notif_welcome',
          playerId: defaultPlayer.id,
          title: 'Welcome to Telegram Games!',
          message: 'Your account is ready with $25.00 Welcome Bonus! Use /games to explore Bingo and Numbers.',
          type: 'info',
          isRead: false,
          createdAt: now - 3600000,
        },
      ],
    ]);

    const settings: SystemSettings = {
      id: 'config',
      maintenanceMode: false,
      maintenanceMessage: 'System is undergoing scheduled engine optimization. Please check back in a few minutes.',
      minDeposit: 5.0,
      minWithdrawal: 10.0,
      bingoHouseFeePct: 15.0,
      numbersHouseFeePct: 10.0,
      defaultBonusAmount: 25.0,
      updatedAt: now,
    };

    return {
      players,
      mainBalances,
      bonusBalances,
      deposits,
      withdrawals,
      transactions,
      bingoRooms,
      bingoRounds,
      bingoTickets,
      numbersRounds,
      numbersTickets,
      winners,
      payouts,
      gameHistory,
      notifications,
      settings,
    };
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.settings) this.state.settings = parsed.settings;
          // Hydrate players and balances if available
          if (Array.isArray(parsed.players)) {
            parsed.players.forEach((p: Player) => this.state.players.set(p.id, p));
          }
          if (Array.isArray(parsed.mainBalances)) {
            parsed.mainBalances.forEach((b: MainBalance) => this.state.mainBalances.set(b.playerId, b));
          }
          if (Array.isArray(parsed.bonusBalances)) {
            parsed.bonusBalances.forEach((b: BonusBalance) => this.state.bonusBalances.set(b.playerId, b));
          }
        }
      }
    } catch {
      // If error or file corrupt, proceed with default memory state
    }
  }

  public saveToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable = {
        settings: this.state.settings,
        players: Array.from(this.state.players.values()),
        mainBalances: Array.from(this.state.mainBalances.values()),
        bonusBalances: Array.from(this.state.bonusBalances.values()),
        deposits: Array.from(this.state.deposits.values()),
        withdrawals: Array.from(this.state.withdrawals.values()),
        transactions: Array.from(this.state.transactions.values()).slice(-500),
        gameHistory: Array.from(this.state.gameHistory.values()).slice(-500),
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch {
      // Ignored for non-fatal transient disk saves
    }
  }

  // --- Collection Accessors ---
  get players() { return this.state.players; }
  get mainBalances() { return this.state.mainBalances; }
  get bonusBalances() { return this.state.bonusBalances; }
  get deposits() { return this.state.deposits; }
  get withdrawals() { return this.state.withdrawals; }
  get transactions() { return this.state.transactions; }
  get bingoRooms() { return this.state.bingoRooms; }
  get bingoRounds() { return this.state.bingoRounds; }
  get bingoTickets() { return this.state.bingoTickets; }
  get numbersRounds() { return this.state.numbersRounds; }
  get numbersTickets() { return this.state.numbersTickets; }
  get winners() { return this.state.winners; }
  get payouts() { return this.state.payouts; }
  get gameHistory() { return this.state.gameHistory; }
  get notifications() { return this.state.notifications; }
  get settings() { return this.state.settings; }
  set settings(s: SystemSettings) { this.state.settings = s; this.saveToDisk(); }
}

export const db = new Database();
