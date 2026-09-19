import { db } from '../db/database.js';
import { SystemSettings } from '../db/schema.js';

export class SystemSettingsService {
  public getSettings(): SystemSettings {
    return db.settings;
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    db.settings = {
      ...db.settings,
      ...partial,
      updatedAt: Date.now(),
    };
    return db.settings;
  }

  public setMaintenanceMode(enabled: boolean, message?: string): SystemSettings {
    return this.updateSettings({
      maintenanceMode: enabled,
      maintenanceMessage: message || db.settings.maintenanceMessage,
    });
  }

  public isMaintenanceActive(): boolean {
    return db.settings.maintenanceMode;
  }
}

export const systemSettingsService = new SystemSettingsService();
