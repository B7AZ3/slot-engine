import * as PIXI from 'pixi.js';
import { GameState } from '../core/GameState.js';
import { GameEvents } from '../events/GameEvents.js';
import { GameConfig } from '../core/GameConfig.js';
import { type IResizeable, type IUIConfig } from '../types/index.js';
import { UIFactory } from './UIFactory.js';
import { BalanceDisplay } from './BalanceDisplay.js';
import { BetControls } from './BetControls.js';
import { SpinButton } from './SpinButton.js';
import { WinPopup } from './WinPopup.js';

export interface IUIManagerOptions {
  config: GameConfig;
  state: GameState;
  events: GameEvents;
  container: PIXI.Container;   // The main UI container (added to stage)
  uiConfig?: IUIConfig;
}

export class UIManager implements IResizeable {
  private config: GameConfig;
  private state: GameState;
  private events: GameEvents;
  private container: PIXI.Container & { destroy: () => void };
  private uiConfig: IUIConfig;
  private scale: number = 1;

  // UI Components
  private balanceDisplay: BalanceDisplay;
  private betControls: BetControls;
  private spinButton: SpinButton;
  private winPopup: WinPopup;

  // Cleanup listeners
  private listeners: (() => void)[] = [];

  constructor(options: IUIManagerOptions) {
    this.config = options.config;
    this.state = options.state;
    this.events = options.events;
    this.uiConfig = options.uiConfig || {};

    // Create main container
    this.container = UIFactory.createContainer(options.container);

    // Initialize components
    this.balanceDisplay = new BalanceDisplay(
      this.container,
      this.state,
      this.uiConfig
    );

    this.betControls = new BetControls(
      this.container,
      this.state,
      this.uiConfig
    );

    this.spinButton = new SpinButton(
      this.container,
      this.state,
      this.uiConfig
    );

    this.winPopup = new WinPopup(
      this.container,
      this.state,
      this.uiConfig
    );

    // Wire up events
    this.wireEvents();
  }

  /**
   * Resize callback (from Renderer).
   */
  onResize(width: number, height: number, scale: number): void {
    this.scale = scale;
    // Position components based on the viewport.
    // For simplicity, we'll place them at fixed relative positions.
    // The host can override via config.

    // Balance: top-left
    this.balanceDisplay.setPosition(-width / 2 + 50, -height / 2 + 50);

    // Bet controls: bottom-left
    this.betControls.setPosition(-width / 2 + 50, height / 2 - 80);

    // Spin button: bottom-center
    this.spinButton.setPosition(0, height / 2 - 60);

    // Win popup: center
    this.winPopup.setPosition(0, 0);
  }

  /**
   * Get the main container.
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Destroy UI and clean up.
   */
  destroy(): void {
    for (const cleanup of this.listeners) {
      cleanup();
    }
    this.listeners = [];
    this.container.destroy(true);
  }

  private wireEvents(): void {
    // Update spin button state when spinning starts/ends
    const spinStartCleanup = this.events.on('spin:start', () => {
      this.spinButton.setSpinning(true);
    });
    this.listeners.push(spinStartCleanup);

    const spinEndCleanup = this.events.on('spin:end', () => {
      this.spinButton.setSpinning(false);
    });
    this.listeners.push(spinEndCleanup);

    // Show win popup on win
    const winCleanup = this.events.on('win', (data) => {
      if (data.amount > 0) {
        this.winPopup.show(data.amount);
      }
    });
    this.listeners.push(winCleanup);

    // Update bet controls when bet changes (already handled internally)
    // Update balance when it changes (already handled internally)
  }
}