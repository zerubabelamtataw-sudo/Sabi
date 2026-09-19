import { db } from '../db/database.js';
import { systemSettingsService } from './systemSettingsService.js';

export class SecurityService {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  public checkAccess(telegramId?: string): { allowed: boolean; reason?: string } {
    if (systemSettingsService.isMaintenanceActive()) {
      // Check if this is an admin Telegram ID
      const adminPlayer = db.players.get('usr_admin_1');
      if (telegramId && adminPlayer && adminPlayer.telegramId === telegramId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: db.settings.maintenanceMessage || 'Platform is under scheduled maintenance.',
      };
    }

    if (telegramId) {
      for (const player of db.players.values()) {
        if (player.telegramId === telegramId) {
          if (player.status === 'banned') {
            return { allowed: false, reason: 'Your account has been permanently suspended by administration.' };
          }
          if (player.status === 'suspended') {
            return { allowed: false, reason: 'Your account is temporarily suspended. Please contact support.' };
          }
          break;
        }
      }
    }

    return { allowed: true };
  }

  public checkRateLimit(key: string, limit = 40, windowMs = 60000): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }
}

export const securityService = new SecurityService();
