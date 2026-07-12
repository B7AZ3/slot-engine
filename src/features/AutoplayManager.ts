import { GameState } from '../core/GameState.js';
import { GameEvents } from '../events/GameEvents.js';
import { type IAutoplayConfig, type IAutoplayState, type IFastSpinConfig } from '../types/index.js'

export interface IAutoplayManagerOptions {
  state: GameState;
  events: GameEvents;
  config?: Partial<IAutoplayConfig>;
  fastSpinConfig?: Partial<IFastSpinConfig>;
  /** Callback to trigger a spin */
  spinCallback: () => void;
  /** Callback to toggle fast spin mode */
  fastSpinCallback: (enabled: boolean) => void;
}

export class AutoplayManager {
  private state: GameState;
  private events: GameEvents;
  private config: IAutoplayConfig;
  private fastSpinConfig: IFastSpinConfig;
  private spinCallback: () => void;
  private fastSpinCallback: (enabled: boolean) => void;

  private _state: IAutoplayState = {
    active: false,
    roundsTotal: 0,
    roundsRemaining: 0,
    roundsCompleted: 0,
    fastSpin: false,
    paused: false,
  };

  private spinCount: number = 0;
  private winCount: number = 0;
  private isProcessingSpin: boolean = false;
  private cleanupFns: (() => void)[] = [];

  constructor(options: IAutoplayManagerOptions) {
    this.state = options.state;
    this.events = options.events;
    this.spinCallback = options.spinCallback;
    this.fastSpinCallback = options.fastSpinCallback;

    // Default config
    this.config = {
      rounds: 10,
      stopOnWin: 0,
      stopOnBalanceBelow: 0,
      stopOnBonus: true,
      fastSpin: false,
      ...options.config,
    };

    this.fastSpinConfig = {
      speedMultiplier: 2,
      skipWinAnimations: true,
      skipReelDelay: true,
      ...options.fastSpinConfig,
    };

    this.wireEvents();
  }

  /**
   * Start autoplay with the given configuration.
   */
  start(config?: Partial<IAutoplayConfig>): void {
    if (this._state.active) {
      console.warn('[AutoplayManager] Already active.');
      return;
    }

    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Reset counters
    this.spinCount = 0;
    this.winCount = 0;

    // Set state
    this._state.active = true;
    this._state.roundsTotal = this.config.rounds;
    this._state.roundsRemaining = this.config.rounds;
    this._state.roundsCompleted = 0;
    this._state.fastSpin = this.config.fastSpin || false;
    this._state.paused = false;

    this.events.emit('autoplay:started', this._state);

    // Apply fast spin
    if (this._state.fastSpin) {
      this.fastSpinCallback(true);
    }

    // Start the first spin
    this.triggerNextSpin();
  }

  /**
   * Stop autoplay immediately.
   */
  stop(): void {
    if (!this._state.active) return;

    this._state.active = false;
    this._state.paused = false;
    this.isProcessingSpin = false;

    // Disable fast spin
    if (this._state.fastSpin) {
      this.fastSpinCallback(false);
      this._state.fastSpin = false;
    }

    this.events.emit('autoplay:stopped', this._state);
  }

  /**
   * Pause autoplay (e.g., during bonus games).
   */
  pause(): void {
    if (!this._state.active || this._state.paused) return;
    this._state.paused = true;
    this.events.emit('autoplay:paused', this._state);
  }

  /**
   * Resume autoplay after pause.
   */
  resume(): void {
    if (!this._state.active || !this._state.paused) return;
    this._state.paused = false;
    this.events.emit('autoplay:resumed', this._state);
    this.triggerNextSpin();
  }

  /**
   * Toggle fast spin mode.
   */
  toggleFastSpin(enabled: boolean): void {
    this._state.fastSpin = enabled;
    this.fastSpinCallback(enabled);
    this.events.emit('autoplay:fastspin', { enabled });
  }

  /**
   * Get the current autoplay state.
   */
  getState(): IAutoplayState {
    return { ...this._state };
  }

  /**
   * Check if autoplay is active.
   */
  isActive(): boolean {
    return this._state.active;
  }

  /**
   * Check if fast spin is active.
   */
  isFastSpin(): boolean {
    return this._state.fastSpin;
  }

  /**
   * Set the number of rounds for the next autoplay session.
   */
  setRounds(rounds: number): void {
    this.config.rounds = Math.max(1, rounds);
  }

  /**
   * Destroy the manager.
   */
  destroy(): void {
    this.stop();
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }

  // --- Private methods ---

  private wireEvents(): void {
    // Listen for spin completion
    const spinCompleteCleanup = this.events.on('spin:complete', (data) => {
      this.handleSpinComplete(data);
    });
    this.cleanupFns.push(spinCompleteCleanup);

    // Listen for spin end (after animations)
    const spinEndCleanup = this.events.on('spin:end', () => {
      this.isProcessingSpin = false;
      // Trigger next spin if autoplay is still active
      if (this._state.active && !this._state.paused) {
        this.triggerNextSpin();
      }
    });
    this.cleanupFns.push(spinEndCleanup);

    // Listen for bonus trigger (stop if configured)
    const bonusTriggerCleanup = this.events.on('bonus:trigger', () => {
      if (this.config.stopOnBonus && this._state.active) {
        console.log('[AutoplayManager] Bonus triggered – stopping autoplay.');
        this.stop();
      }
    });
    this.cleanupFns.push(bonusTriggerCleanup);

    // Listen for bonus end (resume if paused)
    const bonusEndCleanup = this.events.on('bonus:end', () => {
      if (this._state.active && this._state.paused) {
        console.log('[AutoplayManager] Bonus ended – resuming autoplay.');
        this.resume();
      }
    });
    this.cleanupFns.push(bonusEndCleanup);
  }

  private triggerNextSpin(): void {
    if (!this._state.active || this._state.paused) return;
    if (this.isProcessingSpin) return;
    if (this._state.roundsRemaining <= 0) {
      this.stop();
      return;
    }

    // Check stop conditions
    if (this.shouldStop()) {
      this.stop();
      return;
    }

    this.isProcessingSpin = true;
    this.spinCallback();
  }

  private shouldStop(): boolean {
    // Check win threshold
    if (this.config.stopOnWin && this.state.totalWin > 0) {
      const totalWin = this.state.totalWin;
      if (totalWin >= this.config.stopOnWin) {
        console.log(`[AutoplayManager] Win threshold reached: ${totalWin} >= ${this.config.stopOnWin}`);
        return true;
      }
    }

    // Check balance threshold
    if (this.config.stopOnBalanceBelow && this.state.balance > 0) {
      if (this.state.balance < this.config.stopOnBalanceBelow) {
        console.log(`[AutoplayManager] Balance below threshold: ${this.state.balance} < ${this.config.stopOnBalanceBelow}`);
        return true;
      }
    }

    return false;
  }

  private handleSpinComplete(data: any): void {
    if (!this._state.active) return;

    this.spinCount++;
    this._state.roundsRemaining--;
    this._state.roundsCompleted++;

    // Track wins
    if (data.totalWin > 0) {
      this.winCount++;
    }

    this.events.emit('autoplay:progress', {
      roundsCompleted: this._state.roundsCompleted,
      roundsTotal: this._state.roundsTotal,
      roundsRemaining: this._state.roundsRemaining,
      winCount: this.winCount,
    });
  }
}