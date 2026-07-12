import * as PIXI from 'pixi.js';
import { GameState } from '../core/GameState.js';
import { GameEvents } from '../events/GameEvents.js';
import { LocalizationService } from '../assets/LocalizationService.js';
import { SettingsService } from '../services/SettingsService.js';
import { formatTime } from '../utils/TimeUtils.js';
import { type IPlatformBridge } from '../types/index.js';


export interface ISessionTimerOptions {
  state: GameState;
  events: GameEvents;
  platform: IPlatformBridge;
  localization: LocalizationService;
  /** Callback when the timer updates (for UI display) */
  onTick?: (elapsedSeconds: number, formatted: string) => void;
}

export class SessionTimer {
  private state: GameState;
  private events: GameEvents;
  private platform: IPlatformBridge;
  private localization: LocalizationService;
  private settings: SettingsService;

  private elapsedSeconds: number = 0;
  private limitMinutes: number = 60;
  private ticker: PIXI.Ticker | null = null;
  private isPaused: boolean = false;
  private popupActive: boolean = false;
  private onTickCallback?: (elapsedSeconds: number, formatted: string) => void;
  private tickerCallback: (ticker: PIXI.Ticker) => void;

  // Cleanup
  private visibilityCleanup?: () => void;

  constructor(options: ISessionTimerOptions) {
    this.state = options.state;
    this.events = options.events;
    this.platform = options.platform;
    this.localization = options.localization;
    this.onTickCallback = options.onTick;
    this.settings = SettingsService.getInstance();

    // Load saved settings
    this.limitMinutes = this.settings.get('sessionLengthMinutes');
    this.elapsedSeconds = this.settings.get('sessionElapsedSeconds') || 0;

    // Listen to visibility changes
    this.visibilityCleanup = this.events.on('visibility:changed', (hidden) => {
      if (hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    // Create a stable ticker callback wrapper for PixiJS v8 compatibility and reliable removal
    this.tickerCallback = (ticker: PIXI.Ticker) => {
      this.update(ticker.deltaTime);
    };
  }

  /**
   * Start the timer.
   */
  start(): void {
    if (this.ticker) return;
    this.ticker = PIXI.Ticker.shared;
    this.ticker.add(this.tickerCallback);
    this.isPaused = false;
    this.emitTick();
  }

  /**
   * Pause the timer (e.g., when tab is hidden).
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the timer (e.g., when tab becomes visible).
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Reset the timer (e.g., after a reality check "Continue").
   */
  reset(): void {
    this.elapsedSeconds = 0;
    this.settings.set('sessionElapsedSeconds', 0);
    this.popupActive = false;
    this.emitTick();
  }

  /**
   * Set the session limit in minutes.
   */
  setLimit(minutes: number): void {
    this.limitMinutes = Math.max(1, minutes);
    this.settings.set('sessionLengthMinutes', this.limitMinutes);
  }

  /**
   * Get the current elapsed time (seconds).
   */
  getElapsed(): number {
    return this.elapsedSeconds;
  }

  /**
   * Get the formatted time (e.g., "01:23").
   */
  getFormatted(): string {
    return formatTime(this.elapsedSeconds);
  }

  /**
   * Destroy the timer.
   */
  destroy(): void {
    if (this.ticker) {
      this.ticker.remove(this.tickerCallback);
      this.ticker = null;
    }
    if (this.visibilityCleanup) {
      this.visibilityCleanup();
      this.visibilityCleanup = undefined;
    }
  }

  private update(delta: number): void {
    if (this.isPaused || this.popupActive) return;

    // Accumulate seconds (delta is in seconds)
    this.elapsedSeconds += delta;
    this.settings.set('sessionElapsedSeconds', this.elapsedSeconds);

    // Emit tick event for UI updates
    this.emitTick();

    // Check if we've reached the limit
    const limitSeconds = this.limitMinutes * 60;
    if (this.elapsedSeconds >= limitSeconds) {
      this.triggerRealityCheck();
    }
  }

  private emitTick(): void {
    if (this.onTickCallback) {
      this.onTickCallback(this.elapsedSeconds, this.getFormatted());
    }
    this.events.emit('session:tick', {
      elapsed: this.elapsedSeconds,
      formatted: this.getFormatted(),
      limit: this.limitMinutes,
    });
  }

  private triggerRealityCheck(): void {
    if (this.popupActive) return;
    this.popupActive = true;
    this.pause();

    const elapsedMinutes = Math.floor(this.elapsedSeconds / 60);
    const message = this.localization.get('reality_check_message', false)
      .replace('{minutes}', String(elapsedMinutes))
      .replace('{limit}', String(this.limitMinutes));

    this.platform.showPopup(
      this.localization.get('reality_check_title', true),
      message,
      [
        {
          label: this.localization.get('reality_check_continue', true),
          action: () => {
            this.popupActive = false;
            this.resume();
            this.reset();
          },
        },
        {
          label: this.localization.get('reality_check_exit', true),
          action: () => {
            this.popupActive = false;
            this.platform.closeGame();
          },
        },
      ]
    );
  }
}
