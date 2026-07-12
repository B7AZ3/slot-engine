import { GameState } from '../core/GameState.js';
import { GameEvents } from '../events/GameEvents.js';
import { GameConfig } from '../core/GameConfig.js';
import { type IDebugConfig, type IForceSpinResult } from '../types/index.js';

export interface IDebugManagerOptions {
  state: GameState;
  events: GameEvents;
  config: GameConfig;
  debugConfig?: IDebugConfig;
  /** Callback to force a spin with custom result */
  onForceSpin?: (result: IForceSpinResult) => void;
  /** Callback to set balance */
  onSetBalance?: (amount: number) => void;
  /** Callback to toggle fast spin */
  onToggleFastSpin?: (enabled: boolean) => void;
}

export class DebugManager {
  private state: GameState;
  private events: GameEvents;
  private config: GameConfig;
  private debugConfig: Required<Omit<IDebugConfig, 'seed'>> & { seed: number | undefined };
  private onForceSpin?: (result: IForceSpinResult) => void;
  private onSetBalance?: (amount: number) => void;
  private onToggleFastSpin?: (enabled: boolean) => void;

  private enabled: boolean = false;
  private keyListeners: ((e: KeyboardEvent) => void)[] = [];

  constructor(options: IDebugManagerOptions) {
    this.state = options.state;
    this.events = options.events;
    this.config = options.config;
    this.onForceSpin = options.onForceSpin;
    this.onSetBalance = options.onSetBalance;
    this.onToggleFastSpin = options.onToggleFastSpin;

    this.debugConfig = {
      enabled: options.debugConfig?.enabled ?? false,
      keyboardShortcuts: options.debugConfig?.keyboardShortcuts ?? true,
      logLevel: options.debugConfig?.logLevel ?? 'minimal',
      seed: options.debugConfig?.seed ?? undefined,
    };

    // Enable if URL param is present
    const urlParams = this.config.urlParams;
    if (urlParams.debug === '1' || urlParams.debug === 'true') {
      this.debugConfig.enabled = true;
    }

    if (this.debugConfig.enabled) {
      this.enable();
    }
  }

  /**
   * Enable debug mode.
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    if (this.debugConfig.keyboardShortcuts) {
      this.registerKeyboardShortcuts();
    }

    if (this.debugConfig.logLevel !== 'none') {
      this.enableLogging();
    }

    // Apply seed if provided
    if (this.debugConfig.seed !== undefined) {
      console.log(`[DebugManager] RNG seed set to: ${this.debugConfig.seed}`);
    }

    // Emit event
    this.events.emit('debug:enabled', { config: this.debugConfig });
    console.log('[DebugManager] Debug mode enabled.');
  }

  /**
   * Disable debug mode.
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Remove keyboard listeners
    for (const listener of this.keyListeners) {
      document.removeEventListener('keydown', listener);
    }
    this.keyListeners = [];

    this.events.emit('debug:disabled', {});
    console.log('[DebugManager] Debug mode disabled.');
  }

  /**
   * Force a spin with a custom result.
   */
  forceSpin(result: IForceSpinResult): void {
    if (!this.enabled) {
      console.warn('[DebugManager] Debug mode is not enabled.');
      return;
    }

    if (this.onForceSpin) {
      this.onForceSpin(result);
    } else {
      console.warn('[DebugManager] No onForceSpin callback set.');
    }
  }

  /**
   * Set the player balance.
   */
  setBalance(amount: number): void {
    if (!this.enabled) {
      console.warn('[DebugManager] Debug mode is not enabled.');
      return;
    }

    if (this.onSetBalance) {
      this.onSetBalance(amount);
    } else {
      this.state.balance = amount;
    }
  }

  /**
   * Toggle fast spin mode.
   */
  toggleFastSpin(): void {
    if (!this.enabled) {
      console.warn('[DebugManager] Debug mode is not enabled.');
      return;
    }

    if (this.onToggleFastSpin) {
      // We don't know the current state, so we'll toggle by calling with the opposite
      // The callback should handle the toggle logic.
      this.onToggleFastSpin(true); // This is a toggle, but we'll let the callback handle it
    } else {
      console.warn('[DebugManager] No onToggleFastSpin callback set.');
    }
  }

  /**
   * Log the current game state.
   */
  logState(): void {
    if (!this.enabled) return;
    console.log('[DebugManager] Game State:', {
      balance: this.state.balance,
      currentBet: this.state.currentBet,
      totalWin: this.state.totalWin,
      isSpinning: this.state.isSpinning,
      isBonusActive: this.state.isBonusActive,
      freeSpinsRemaining: this.state.freeSpinsRemaining,
      lastSpinResult: this.state.lastSpinResult,
    });
  }

  /**
   * Log all available commands.
   */
  logHelp(): void {
    if (!this.enabled) return;
    console.log(`
[DebugManager] Available commands:
  Ctrl+Shift+F  - Force a spin (opens prompt)
  Ctrl+Shift+B  - Set balance (opens prompt)
  Ctrl+Shift+F  - Toggle fast spin
  Ctrl+Shift+L  - Log game state
  Ctrl+Shift+H  - Show this help
  Ctrl+Shift+D  - Disable debug mode
`);
  }

  private registerKeyboardShortcuts(): void {
    const handler = (e: KeyboardEvent) => {
      // Only trigger if Ctrl+Shift are held
      if (!e.ctrlKey || !e.shiftKey) return;

      // Prevent default for all debug shortcuts
      const key = e.key.toLowerCase();

      switch (key) {
        case 'f': // Force spin
          e.preventDefault();
          this.promptForceSpin();
          break;
        case 'b': // Set balance
          e.preventDefault();
          this.promptSetBalance();
          break;
        case 't': // Toggle fast spin
          e.preventDefault();
          this.toggleFastSpin();
          break;
        case 'l': // Log state
          e.preventDefault();
          this.logState();
          break;
        case 'h': // Help
          e.preventDefault();
          this.logHelp();
          break;
        case 'd': // Disable
          e.preventDefault();
          this.disable();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handler);
    this.keyListeners.push(handler);
  }

  private promptForceSpin(): void {
    if (!this.enabled) return;

    // Simple prompt for the user
    const input = prompt(
      'Force spin result (JSON format):\n' +
      'Example: {"reels":[[1,2,3],[4,5,6],[7,8,9],[0,1,2],[3,4,5]],"totalWin":50}'
    );

    if (!input) return;

    try {
      const result = JSON.parse(input) as IForceSpinResult;
      this.forceSpin(result);
    } catch (err) {
      console.error('[DebugManager] Invalid JSON:', err);
    }
  }

  private promptSetBalance(): void {
    if (!this.enabled) return;

    const input = prompt('Set balance to:', '100');
    if (!input) return;

    const amount = parseFloat(input);
    if (isNaN(amount)) {
      console.error('[DebugManager] Invalid amount.');
      return;
    }

    this.setBalance(amount);
  }

  private enableLogging(): void {
    // Intercept state changes and log them
    if (this.debugConfig.logLevel === 'full') {
      this.state.on('balance', (newVal, oldVal) => {
        console.log(`[DebugManager] Balance: ${oldVal} → ${newVal}`);
      });
      this.state.on('currentBet', (newVal, oldVal) => {
        console.log(`[DebugManager] Bet: ${oldVal} → ${newVal}`);
      });
      this.state.on('isSpinning', (newVal) => {
        console.log(`[DebugManager] Spinning: ${newVal}`);
      });
      this.state.on('isBonusActive', (newVal) => {
        console.log(`[DebugManager] Bonus Active: ${newVal}`);
      });
    }

    // Log events
    if (this.debugConfig.logLevel === 'full') {
      // We can also log events, but this would be noisy.
      // We'll log only important events.
      this.events.on('spin:start', (data) => {
        console.log('[DebugManager] Spin started:', data);
      });
      this.events.on('spin:complete', (data) => {
        console.log('[DebugManager] Spin complete:', data);
      });
      this.events.on('win', (data) => {
        console.log('[DebugManager] Win:', data);
      });
    }
  }
}