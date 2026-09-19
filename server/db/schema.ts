export interface Player {
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
}

export interface MainBalance {
  playerId: string;
  amount: number;
  currency: string;
  updatedAt: number;
}

export interface BonusBalance {
  playerId: string;
  amount: number;
  wageringRequirement: number;
  wageringProgress: number;
  updatedAt: number;
}

export type DepositMethod = 'crypto_usdt' | 'card' | 'pix' | 'voucher';
export type DepositStatus = 'pending' | 'verified' | 'rejected';

export interface Deposit {
  id: string;
  playerId: string;
  amount: number;
  method: DepositMethod;
  status: DepositStatus;
  proofRef?: string;
  notes?: string;
  createdAt: number;
  processedAt?: number;
}

export type WithdrawalMethod = 'crypto_usdt' | 'bank_transfer' | 'pix';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Withdrawal {
  id: string;
  playerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  destination: string;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  rejectionReason?: string;
  createdAt: number;
  processedAt?: number;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bingo_buyin'
  | 'bingo_win'
  | 'numbers_bet'
  | 'numbers_win'
  | 'bonus_grant'
  | 'admin_adjustment'
  | 'refund';

export interface Transaction {
  id: string;
  playerId: string;
  type: TransactionType;
  amount: number;
  balanceType: 'main' | 'bonus';
  beforeBalance: number;
  afterBalance: number;
  referenceId?: string;
  description: string;
  createdAt: number;
}

export interface BingoRoom {
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

export type BingoRoundStatus = 'waiting' | 'countdown' | 'drawing' | 'ended';

export interface BingoRound {
  id: string;
  roomId: string;
  roundNumber: number;
  status: BingoRoundStatus;
  prizePool: number;
  linePrize: number;
  bingoPrize: number;
  drawnNumbers: number[];
  currentDrawnIndex: number;
  lineWinnerPlayerId?: string;
  lineWinnerTicketId?: string;
  bingoWinnerPlayerId?: string;
  bingoWinnerTicketId?: string;
  startTime: number;
  countdownEndTime?: number;
  endTime?: number;
}

export interface BingoTicket {
  id: string;
  roundId: string;
  playerId: string;
  cardMatrix: number[][]; // 5x5 grid (numbers 1-75, 0 in center for Free space)
  markedMatrix: boolean[][]; // 5x5 grid
  purchasedAt: number;
  hasLine: boolean;
  hasBingo: boolean;
}

export type NumbersRoundStatus = 'betting' | 'countdown' | 'drawing' | 'settled';

export interface NumbersRound {
  id: string;
  roundNumber: number;
  status: NumbersRoundStatus;
  totalPool: number;
  winningNumbers: number[]; // Drawn 5 numbers from 1-36
  totalPayout: number;
  startTime: number;
  drawTime: number;
  settledAt?: number;
}

export type NumbersBetType = 'pick1' | 'pick2' | 'pick3' | 'parity_even' | 'parity_odd' | 'range_low' | 'range_high';

export interface NumbersTicket {
  id: string;
  roundId: string;
  playerId: string;
  betType: NumbersBetType;
  selectedNumbers: number[];
  betAmount: number;
  multiplier: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
  payoutAmount: number;
  createdAt: number;
}

export interface Winner {
  id: string;
  gameType: 'bingo' | 'numbers';
  roundId: string;
  playerId: string;
  prizeType: string;
  prizeAmount: number;
  createdAt: number;
}

export interface Payout {
  id: string;
  winnerId: string;
  playerId: string;
  transactionId: string;
  amount: number;
  status: 'completed' | 'failed';
  processedAt: number;
}

export interface GameHistory {
  id: string;
  gameType: 'bingo' | 'numbers';
  roundId: string;
  playerId: string;
  betAmount: number;
  payoutAmount: number;
  outcome: 'win' | 'loss';
  details: Record<string, any>;
  createdAt: number;
}

export interface SystemNotification {
  id: string;
  playerId: string;
  title: string;
  message: string;
  type: 'info' | 'win' | 'deposit' | 'withdrawal' | 'system';
  isRead: boolean;
  createdAt: number;
}

export interface SystemSettings {
  id: 'config';
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minDeposit: number;
  minWithdrawal: number;
  bingoHouseFeePct: number;
  numbersHouseFeePct: number;
  defaultBonusAmount: number;
  updatedAt: number;
}
