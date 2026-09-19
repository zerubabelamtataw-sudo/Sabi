import { db } from '../db/database.js';
import { SystemNotification } from '../db/schema.js';

export interface SendNotificationParams {
  playerId: string;
  title: string;
  message: string;
  type?: 'info' | 'win' | 'deposit' | 'withdrawal' | 'system';
}

export class NotificationService {
  private botMessageQueue: Array<{ telegramId: string; text: string; timestamp: number }> = [];

  public sendNotification(params: SendNotificationParams): SystemNotification {
    const id = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const notification: SystemNotification = {
      id,
      playerId: params.playerId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      isRead: false,
      createdAt: Date.now(),
    };

    db.notifications.set(id, notification);

    // If player has a telegram ID, queue for Telegram push
    const player = db.players.get(params.playerId);
    if (player && player.telegramId) {
      this.botMessageQueue.push({
        telegramId: player.telegramId,
        text: `🔔 *${params.title}*\n${params.message}`,
        timestamp: Date.now(),
      });
    }

    db.saveToDisk();
    return notification;
  }

  public getPlayerNotifications(playerId: string): SystemNotification[] {
    const list: SystemNotification[] = [];
    for (const notif of db.notifications.values()) {
      if (notif.playerId === playerId) list.push(notif);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public markAsRead(notificationId: string): boolean {
    const notif = db.notifications.get(notificationId);
    if (notif) {
      notif.isRead = true;
      db.saveToDisk();
      return true;
    }
    return false;
  }

  public getBotMessageQueue() {
    return [...this.botMessageQueue];
  }

  public popBotMessagesForUser(telegramId: string) {
    const messages = this.botMessageQueue.filter((m) => m.telegramId === telegramId);
    this.botMessageQueue = this.botMessageQueue.filter((m) => m.telegramId !== telegramId);
    return messages;
  }
}

export const notificationService = new NotificationService();
