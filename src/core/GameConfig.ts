// --- src/core/GameConfig.ts ---

import { type IGameConfig, type IUrlParams } from '../types/index.js';

/**
 * Parses URL parameters from window.location.search.
 */
export function parseUrlParams(): IUrlParams {
  const params: IUrlParams = {};
  const search = window.location.search;
  if (!search) return params;

  const pairs = search.substring(1).split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      params[key] = decodeURIComponent(value || '');
    }
  }
  return params;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Partial<IGameConfig> = {
  reelCount: 5,
  rowCount: 3,
  currencySymbol: '$',
  decimalSeparator: '.',
  thousandSeparator: ',',
  minDecimalPlaces: 2,
  features: {
    autoplay: true,
    fastSpin: true,
    realityCheck: true,
    fullscreen: true,
  },
};

/**
 * GameConfig class – merges user-provided config with defaults and URL params.
 */
export class GameConfig implements IGameConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  gameId: string;
  mode: 'real' | 'fun';
  locale: string;
  activeLanguages?: string[];
  reelCount: number;
  rowCount: number;
  currencySymbol: string;
  decimalSeparator: string;
  thousandSeparator: string;
  minDecimalPlaces: number;
  features: NonNullable<IGameConfig['features']>;
  urlParams: IUrlParams;

  constructor(config: IGameConfig) {
    // Merge with defaults
    const merged = { ...DEFAULT_CONFIG, ...config };

    this.apiBaseUrl = merged.apiBaseUrl!;
    this.wsBaseUrl = merged.wsBaseUrl!;
    this.gameId = merged.gameId!;
    this.mode = merged.mode!;
    this.locale = merged.locale!;
    this.activeLanguages = merged.activeLanguages;
    this.reelCount = merged.reelCount!;
    this.rowCount = merged.rowCount!;
    this.currencySymbol = merged.currencySymbol!;
    this.decimalSeparator = merged.decimalSeparator!;
    this.thousandSeparator = merged.thousandSeparator!;
    this.minDecimalPlaces = merged.minDecimalPlaces!;
    this.features = merged.features!;

    // Parse and store URL params
    this.urlParams = parseUrlParams();

    // Override locale from URL if present
    if (this.urlParams.lang) {
      this.locale = this.urlParams.lang;
    }

    // Override mode from URL if present
    if (this.urlParams.mode) {
      this.mode = (this.urlParams.mode === 'real' ? 'real' : 'fun');
    }

    // Override active languages from URL if present
    if (this.urlParams.active_languages) {
      this.activeLanguages = this.urlParams.active_languages.split(',');
    }
  }

  /**
   * Get a formatted copy of the config for debugging.
   */
  toJSON(): object {
    return {
      apiBaseUrl: this.apiBaseUrl,
      wsBaseUrl: this.wsBaseUrl,
      gameId: this.gameId,
      mode: this.mode,
      locale: this.locale,
      reelCount: this.reelCount,
      rowCount: this.rowCount,
      features: this.features,
      urlParams: this.urlParams,
    };
  }
}