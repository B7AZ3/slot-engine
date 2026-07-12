import { type ILocalizationData } from '../types/index.js';
import { GameConfig } from '../core/GameConfig.js';

export class LocalizationService {
  private data: ILocalizationData = {};
  private activeLanguages: string[] = [];
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    this.activeLanguages = config.activeLanguages || [];
  }

  /**
   * Fetch localization from the API using native fetch.
   * Returns a promise that resolves when the data is loaded and filtered.
   */
  async load(): Promise<ILocalizationData> {
    // Construct the query parameters safely using URLSearchParams
    const params = new URLSearchParams({
      gameId: this.config.gameId,
      mode: this.config.mode,
    });

    const url = `${this.config.apiBaseUrl}/localization?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the response payload
      const incomingData: ILocalizationData = await response.json();

      // Fix: Filter active languages into a new object without altering incoming reference prematurely
      if (this.activeLanguages.length > 0) {
        const filtered: ILocalizationData = {};
        for (const lang of this.activeLanguages) {
          if (incomingData[lang]) {
            filtered[lang] = incomingData[lang];
          }
        }
        this.data = filtered;
      } else {
        this.data = incomingData;
      }

      // Ensure the current locale structure exists; fallback to 'en' or an empty record safely
      if (!this.data[this.config.locale]) {
        this.data[this.config.locale] = this.data['en'] || {};
      }

      return this.data;
    } catch (error) {
      console.error('[LocalizationService] Failed to load localization:', error);
      throw new Error('Failed to load localization');
    }
  }

  /**
   * Get a localized string by key.
   * Optionally fallback to the key itself if not found.
   */
  get(key: string, capitalize: boolean = false): string {
    const localeData = this.data[this.config.locale];
    let value = localeData && localeData[key] ? localeData[key] : key;
    
    if (capitalize && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  }

  /**
   * Returns the full localization data (for paytable, help, etc.)
   */
  getData(): ILocalizationData {
    return this.data;
  }
}
