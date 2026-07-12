import { GameEvents } from '../events/GameEvents.js';
import { type IFastSpinConfig } from '../types/index.js';

export interface IFastSpinManagerOptions {
  events: GameEvents;
  config?: Partial<IFastSpinConfig>;
  /** Callback to adjust reel speed */
  onSpeedChange?: (speedMultiplier: number) => void;
  /** Callback to skip win animations */
  onSkipWinAnimations?: (skip: boolean) => void;
  /** Callback to skip reel delay */
  onSkipReelDelay?: (skip: boolean) => void;
}

export class FastSpinManager {
  private events: GameEvents;
  private config: IFastSpinConfig;
  private enabled: boolean = false;
  private onSpeedChange?: (speed: number) => void;
  private onSkipWinAnimations?: (skip: boolean) => void;
  private onSkipReelDelay?: (skip: boolean) => void;

  constructor(options: IFastSpinManagerOptions) {
    this.events = options.events;
    this.onSpeedChange = options.onSpeedChange;
    this.onSkipWinAnimations = options.onSkipWinAnimations;
    this.onSkipReelDelay = options.onSkipReelDelay;

    this.config = {
      speedMultiplier: 2,
      skipWinAnimations: true,
      skipReelDelay: true,
      ...options.config,
    };
  }

  /**
   * Enable fast spin mode.
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    if (this.onSpeedChange) {
      this.onSpeedChange(this.config.speedMultiplier);
    }
    if (this.onSkipWinAnimations) {
      this.onSkipWinAnimations(this.config.skipWinAnimations);
    }
    if (this.onSkipReelDelay) {
      this.onSkipReelDelay(this.config.skipReelDelay);
    }

    this.events.emit('fastspin:enabled', { config: this.config });
  }

  /**
   * Disable fast spin mode.
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    if (this.onSpeedChange) {
      this.onSpeedChange(1);
    }
    if (this.onSkipWinAnimations) {
      this.onSkipWinAnimations(false);
    }
    if (this.onSkipReelDelay) {
      this.onSkipReelDelay(false);
    }

    this.events.emit('fastspin:disabled', {});
  }

  /**
   * Toggle fast spin mode.
   */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if fast spin is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the current config.
   */
  getConfig(): IFastSpinConfig {
    return { ...this.config };
  }

  /**
   * Update the config.
   */
  setConfig(config: Partial<IFastSpinConfig>): void {
    this.config = { ...this.config, ...config };
    // If enabled, apply changes immediately
    if (this.enabled) {
      this.enable(); // re-apply
    }
  }
}