export interface PlayerProfile {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  status: 'active' | 'suspended' | 'banned';
  vipLevel: number;
  createdAt: number;
  lastActiveAt: number;
  mainBalance: number;
  bonusBalance: number;
  totalBalance: number;
  stats: {
    roundsPlayed: number;
    totalBets: number;
    totalWins: number;
    netProfit: number;
  };
}

export interface TelegramChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
  };
}

export interface BingoRoomData {
  id: string;
  name: string;
  theme: string;
  ticketPrice: number;
  maxTicketsPerPlayer: number;
  minPlayersToStart: number;
  prizePoolPct: number;
  houseFeePct: number;
  countdownDurationSec: number;
  drawIntervalSec: number;
  status: 'active' | 'inactive';
}

export interface BingoRoundData {
  id: string;
  roomId: string;
  roundNumber: number;
  status: 'waiting' | 'countdown' | 'drawing' | 'ended';
  prizePool: number;
  linePrize: number;
  bingoPrize: number;
  drawnNumbers: number[];
  currentDrawnIndex: number;
  lineWinnerPlayerId?: string;
  bingoWinnerPlayerId?: string;
  startTime: number;
  countdownEndTime?: number;
  endTime?: number;
}

export interface BingoTicketData {
  id: string;
  roundId: string;
  playerId: string;
  cardMatrix: number[][];
  markedMatrix: boolean[][];
  purchasedAt: number;
  hasLine: boolean;
  hasBingo: boolean;
}

export interface NumbersRoundData {
  id: string;
  roundNumber: number;
  status: 'betting' | 'countdown' | 'drawing' | 'settled';
  totalPool: number;
  winningNumbers: number[];
  totalPayout: number;
  startTime: number;
  drawTime: number;
  settledAt?: number;
}

export interface NumbersTicketData {
  id: string;
  roundId: string;
  playerId: string;
  betType: 'pick1' | 'pick2' | 'pick3' | 'parity_even' | 'parity_odd' | 'range_low' | 'range_high';
  selectedNumbers: number[];
  betAmount: number;
  multiplier: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
  payoutAmount: number;
  createdAt: number;
}

export interface AdminStatsData {
  totalPlayers: number;
  activePlayersCount: number;
  totalTurnover: number;
  totalPayouts: number;
  grossGamingRevenue: number;
  platformProfitMarginPct: number;
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  maintenanceMode: boolean;
}
