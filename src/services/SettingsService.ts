export interface IUserSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  sessionLengthMinutes: number; // e.g., 60
  sessionElapsedSeconds: number; // persisted across page reloads (optional)
}

const STORAGE_KEY = 'slot_engine_settings';

export class SettingsService {
  private static instance: SettingsService;
  private settings: IUserSettings;

  private constructor() {
    this.settings = this.loadFromStorage() || this.getDefaults();
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private getDefaults(): IUserSettings {
    return {
      musicEnabled: true,
      sfxEnabled: true,
      sessionLengthMinutes: 60,
      sessionElapsedSeconds: 0,
    };
  }

  private loadFromStorage(): IUserSettings | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SettingsService] Failed to load settings:', e);
    }
    return null;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[SettingsService] Failed to save settings:', e);
    }
  }

  get<K extends keyof IUserSettings>(key: K): IUserSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof IUserSettings>(key: K, value: IUserSettings[K]): void {
    this.settings[key] = value;
    this.saveToStorage();
  }

  getAll(): IUserSettings {
    return { ...this.settings };
  }

  reset(): void {
    this.settings = this.getDefaults();
    this.saveToStorage();
  }
}