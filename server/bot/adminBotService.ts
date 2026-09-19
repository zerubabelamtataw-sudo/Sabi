import { db } from '../db/database.js';
import { playerService } from '../services/playerService.js';
import { balanceService } from '../services/balanceService.js';
import { depositService } from '../services/depositService.js';
import { withdrawalService } from '../services/withdrawalService.js';
import { systemSettingsService } from '../services/systemSettingsService.js';
import { bingoEngine } from '../engines/bingoEngine.js';
import { numbersEngine } from '../engines/numbersEngine.js';

export interface AdminStats {
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

export class AdminBotService {
  /**
   * Returns comprehensive operations stats
   */
  public getStatistics(): AdminStats {
    let totalTurnover = 0;
    let totalPayouts = 0;

    for (const h of db.gameHistory.values()) {
      totalTurnover += h.betAmount;
      totalPayouts += h.payoutAmount;
    }

    const ggr = totalTurnover - totalPayouts;
    const margin = totalTurnover > 0 ? (ggr / totalTurnover) * 100 : 0;

    let pendingDeps = 0;
    for (const d of db.deposits.values()) {
      if (d.status === 'pending') pendingDeps++;
    }

    let pendingWths = 0;
    for (const w of db.withdrawals.values()) {
      if (w.status === 'pending') pendingWths++;
    }

    return {
      totalPlayers: db.players.size,
      activePlayersCount: Array.from(db.players.values()).filter((p) => p.status === 'active').length,
      totalTurnover: Number(totalTurnover.toFixed(2)),
      totalPayouts: Number(totalPayouts.toFixed(2)),
      grossGamingRevenue: Number(ggr.toFixed(2)),
      platformProfitMarginPct: Number(margin.toFixed(2)),
      pendingDepositsCount: pendingDeps,
      pendingWithdrawalsCount: pendingWths,
      maintenanceMode: db.settings.maintenanceMode,
    };
  }

  /**
   * Player search and lookup
   */
  public searchPlayers(query: string) {
    const q = query.toLowerCase().trim();
    return Array.from(db.players.values())
      .filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.telegramId.includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q),
      )
      .map((p) => playerService.getPlayerProfile(p.id));
  }

  /**
   * Adjusts a player's balance (Admin tool)
   */
  public adjustBalance(params: {
    playerId: string;
    amount: number;
    balanceType: 'main' | 'bonus';
    reason: string;
  }) {
    const player = db.players.get(params.playerId);
    if (!player) throw new Error('Player not found');

    if (params.amount >= 0) {
      balanceService.creditFunds(
        params.playerId,
        params.amount,
        params.balanceType === 'bonus' ? 'bonus_grant' : 'admin_adjustment',
        params.balanceType,
        `admin_${Date.now()}`,
        params.reason,
      );
    } else {
      balanceService.deductFunds(
        params.playerId,
        Math.abs(params.amount),
        'admin_adjustment',
        `admin_${Date.now()}`,
        params.reason,
      );
    }

    return playerService.getPlayerProfile(params.playerId);
  }

  /**
   * Approve deposit from Admin
   */
  public approveDeposit(depositId: string, notes = 'Approved by Operator') {
    return depositService.verifyAndCreditDeposit(depositId, notes);
  }

  /**
   * Reject deposit from Admin
   */
  public rejectDeposit(depositId: string, reason = 'Invalid proof') {
    return depositService.rejectDeposit(depositId, reason);
  }

  /**
   * Approve withdrawal from Admin
   */
  public approveWithdrawal(withdrawalId: string) {
    return withdrawalService.approveWithdrawal(withdrawalId);
  }

  /**
   * Reject withdrawal from Admin (refunds balance)
   */
  public rejectWithdrawal(withdrawalId: string, reason = 'Security verification failed') {
    return withdrawalService.rejectAndRefundWithdrawal(withdrawalId, reason);
  }

  /**
   * Toggle maintenance mode
   */
  public toggleMaintenance(enabled: boolean, message?: string) {
    return systemSettingsService.setMaintenanceMode(enabled, message);
  }

  /**
   * Update game settings
   */
  public updateSettings(partial: any) {
    return systemSettingsService.updateSettings(partial);
  }

  /**
   * Handles text command input from Admin Telegram Bot
   */
  public handleAdminCommand(text: string): { responseText: string } {
    const parts = text.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/admin':
      case '/status': {
        const stats = this.getStatistics();
        return {
          responseText:
            `🛡️ *ADMIN COMMAND CENTER*\n\n` +
            `• Status: *${stats.maintenanceMode ? '🔴 MAINTENANCE MODE' : '🟢 OPERATIONAL'}*\n` +
            `• Registered Players: *${stats.totalPlayers}*\n` +
            `• Total Gaming Turnover: *$${stats.totalTurnover.toFixed(2)}*\n` +
            `• Total Payouts: *$${stats.totalPayouts.toFixed(2)}*\n` +
            `• Gross Gaming Revenue (GGR): *$${stats.grossGamingRevenue.toFixed(2)}*\n` +
            `• House Profit Margin: *${stats.platformProfitMarginPct}%*\n\n` +
            `📋 *Action Queues:*\n` +
            `• Pending Deposits: *${stats.pendingDepositsCount}*\n` +
            `• Pending Withdrawals: *${stats.pendingWithdrawalsCount}*\n\n` +
            `Commands: /players, /deposits, /withdrawals, /maintenance [on|off]`,
        };
      }

      case '/maintenance': {
        const flag = parts[1]?.toLowerCase();
        if (flag === 'on' || flag === 'enable') {
          this.toggleMaintenance(true);
          return { responseText: '⚠️ *Maintenance Mode has been ACTIVATED.* Player access is paused.' };
        } else if (flag === 'off' || flag === 'disable') {
          this.toggleMaintenance(false);
          return { responseText: '✅ *Maintenance Mode has been DEACTIVATED.* Normal gaming resumed.' };
        }
        return { responseText: 'Usage: /maintenance on | /maintenance off' };
      }

      case '/deposits': {
        const pending = depositService.getPendingDeposits();
        if (pending.length === 0) {
          return { responseText: '✅ No pending deposits in queue.' };
        }
        let list = `📋 *PENDING DEPOSITS (${pending.length}):*\n\n`;
        pending.forEach((d) => {
          const p = db.players.get(d.playerId);
          list += `• #${d.id} | @${p?.username || 'user'} | $${d.amount.toFixed(2)} (${d.method})\n`;
        });
        return { responseText: list };
      }

      case '/withdrawals': {
        const pending = withdrawalService.getPendingWithdrawals();
        if (pending.length === 0) {
          return { responseText: '✅ No pending withdrawals in queue.' };
        }
        let list = `📋 *PENDING WITHDRAWALS (${pending.length}):*\n\n`;
        pending.forEach((w) => {
          const p = db.players.get(w.playerId);
          list += `• #${w.id} | @${p?.username || 'user'} | $${w.amount.toFixed(2)} (Net: $${w.netAmount.toFixed(2)}) → ${w.destination}\n`;
        });
        return { responseText: list };
      }

      default:
        return {
          responseText:
            `🛡️ *ADMIN COMMANDS:*\n` +
            `• /status - Overview metrics\n` +
            `• /deposits - Pending deposit approvals\n` +
            `• /withdrawals - Pending payouts\n` +
            `• /maintenance on|off - Toggle platform pause`,
        };
    }
  }
}

export const adminBotService = new AdminBotService();
