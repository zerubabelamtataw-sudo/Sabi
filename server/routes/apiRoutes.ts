import { Router } from 'express';
import { telegramBotService } from '../bot/telegramBotService.js';
import { adminBotService } from '../bot/adminBotService.js';
import { playerService } from '../services/playerService.js';
import { balanceService } from '../services/balanceService.js';
import { depositService } from '../services/depositService.js';
import { withdrawalService } from '../services/withdrawalService.js';
import { paymentVerificationService } from '../services/paymentVerificationService.js';
import { notificationService } from '../services/notificationService.js';
import { gameHistoryService } from '../services/gameHistoryService.js';
import { systemSettingsService } from '../services/systemSettingsService.js';
import { bingoEngine } from '../engines/bingoEngine.js';
import { numbersEngine } from '../engines/numbersEngine.js';
import { db } from '../db/database.js';

export const apiRouter = Router();

// --- Telegram Bot Endpoints ---

apiRouter.post('/telegram/message', (req, res) => {
  try {
    const { telegramId, text, username, firstName, lastName } = req.body;
    if (!telegramId || !text) {
      return res.status(400).json({ error: 'telegramId and text are required' });
    }

    const response = telegramBotService.handleMessage({
      telegramId,
      text,
      username,
      firstName: firstName || 'Player',
      lastName,
    });

    res.json({ success: true, response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/telegram/callback', (req, res) => {
  try {
    const { telegramId, callbackData, username, firstName } = req.body;
    if (!telegramId || !callbackData) {
      return res.status(400).json({ error: 'telegramId and callbackData are required' });
    }

    const response = telegramBotService.handleCallbackQuery({
      telegramId,
      callbackData,
      username,
      firstName: firstName || 'Player',
    });

    res.json({ success: true, response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Current Player Context ---

apiRouter.get('/player/:telegramId', (req, res) => {
  try {
    const { telegramId } = req.params;
    const player = playerService.getPlayerByTelegramId(telegramId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const profile = playerService.getPlayerProfile(player.id);
    const notifications = notificationService.getPlayerNotifications(player.id);
    res.json({ profile, notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bingo Engine Endpoints ---

apiRouter.get('/games/bingo/status', (req, res) => {
  try {
    const status = bingoEngine.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/games/bingo/buy', (req, res) => {
  try {
    const { roomId, playerId, count } = req.body;
    const result = bingoEngine.buyTickets(roomId, playerId, count || 1);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/games/bingo/my-tickets/:roundId/:playerId', (req, res) => {
  try {
    const { roundId, playerId } = req.params;
    const tickets = bingoEngine.getPlayerTicketsInRound(roundId, playerId);
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Numbers Engine Endpoints ---

apiRouter.get('/games/numbers/status', (req, res) => {
  try {
    const status = numbersEngine.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/games/numbers/bet', (req, res) => {
  try {
    const { playerId, betType, selectedNumbers, betAmount } = req.body;
    const result = numbersEngine.placeBet({
      playerId,
      betType,
      selectedNumbers: selectedNumbers || [7],
      betAmount: Number(betAmount),
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Wallet & Shared Services ---

apiRouter.post('/wallet/deposit', (req, res) => {
  try {
    const { playerId, amount, method } = req.body;
    const deposit = depositService.createDepositRequest({
      playerId,
      amount: Number(amount),
      method,
    });
    res.json({ success: true, deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/wallet/deposit/verify', (req, res) => {
  try {
    const { depositId, proof } = req.body;
    const result = proof
      ? paymentVerificationService.verifyProof(depositId, proof)
      : paymentVerificationService.simulateInstantPayment(depositId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/wallet/withdraw', (req, res) => {
  try {
    const { playerId, amount, destination, method } = req.body;
    const withdrawal = withdrawalService.createWithdrawalRequest({
      playerId,
      amount: Number(amount),
      destination: destination || 'TRC20-Wallet-Address',
      method: method || 'crypto_usdt',
    });
    res.json({ success: true, withdrawal });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/wallet/history/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const deposits = depositService.getPlayerDeposits(playerId);
    const withdrawals = withdrawalService.getPlayerWithdrawals(playerId);
    const gameHistory = gameHistoryService.getPlayerGameHistory(playerId);
    res.json({ deposits, withdrawals, gameHistory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Endpoints ---

apiRouter.get('/admin/stats', (_req, res) => {
  try {
    const stats = adminBotService.getStatistics();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/players', (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const players = adminBotService.searchPlayers(q);
    res.json({ players });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/balance-adjust', (req, res) => {
  try {
    const { playerId, amount, balanceType, reason } = req.body;
    const updated = adminBotService.adjustBalance({
      playerId,
      amount: Number(amount),
      balanceType: balanceType || 'main',
      reason: reason || 'Admin manual balance correction',
    });
    res.json({ success: true, player: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/deposits', (_req, res) => {
  try {
    const pending = depositService.getPendingDeposits();
    const all = depositService.getAllDeposits();
    res.json({ pending, all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/deposits/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const dep = adminBotService.approveDeposit(id);
    res.json({ success: true, deposit: dep });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/deposits/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const dep = adminBotService.rejectDeposit(id, reason);
    res.json({ success: true, deposit: dep });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/withdrawals', (_req, res) => {
  try {
    const pending = withdrawalService.getPendingWithdrawals();
    const all = withdrawalService.getAllWithdrawals();
    res.json({ pending, all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/withdrawals/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const wth = adminBotService.approveWithdrawal(id);
    res.json({ success: true, withdrawal: wth });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/withdrawals/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const wth = adminBotService.rejectWithdrawal(id, reason);
    res.json({ success: true, withdrawal: wth });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/maintenance', (req, res) => {
  try {
    const { enabled, message } = req.body;
    const settings = adminBotService.toggleMaintenance(Boolean(enabled), message);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/settings', (req, res) => {
  try {
    const settings = adminBotService.updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/command', (req, res) => {
  try {
    const { text } = req.body;
    const result = adminBotService.handleAdminCommand(text);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full state inspector for Architecture & DB explorer view
apiRouter.get('/system/database-dump', (_req, res) => {
  try {
    res.json({
      players: Array.from(db.players.values()),
      mainBalances: Array.from(db.mainBalances.values()),
      bonusBalances: Array.from(db.bonusBalances.values()),
      deposits: Array.from(db.deposits.values()),
      withdrawals: Array.from(db.withdrawals.values()),
      transactions: Array.from(db.transactions.values()).slice(-50),
      bingoRooms: Array.from(db.bingoRooms.values()),
      bingoRounds: Array.from(db.bingoRounds.values()).slice(-20),
      bingoTickets: Array.from(db.bingoTickets.values()).slice(-50),
      numbersRounds: Array.from(db.numbersRounds.values()).slice(-20),
      numbersTickets: Array.from(db.numbersTickets.values()).slice(-50),
      winners: Array.from(db.winners.values()).slice(-30),
      payouts: Array.from(db.payouts.values()).slice(-30),
      gameHistory: Array.from(db.gameHistory.values()).slice(-50),
      settings: db.settings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
