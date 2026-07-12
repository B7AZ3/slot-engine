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
import { AutoplayManager } from '../features/AutoplayManager.js';
import { Button } from './Button.js';
import { Text } from './Text.js';


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
  private autoplayManager: AutoplayManager | null = null;

  // UI Components
  public balanceDisplay: BalanceDisplay;
  public betControls: BetControls;
  public spinButton: SpinButton;
  public winPopup: WinPopup;
  public autoplayBtn: Button;
  public fastSpinBtn: Button;
  public autoplayRemainingText: PIXI.Text;

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

    this.autoplayBtn = new Button(
      this.container,
      { defaultTexture: 'btn_autoplay', elastic: true },
      60, 60
    );

    // Adjust relative to the spin button
    this.autoplayBtn.setPosition(-80, 20);

    // Fast Spin toggle
    this.fastSpinBtn = new Button(
      this.container,
      { defaultTexture: 'btn_fastspin_off', elastic: true },
      40, 40
    );
    this.fastSpinBtn.setPosition(-140, 20);

    // Autoplay remaining text
    this.autoplayRemainingText = UIFactory.createText('', {
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    this.autoplayRemainingText.x = -80;
    this.autoplayRemainingText.y = -30;

    // Wire up events
    this.wireEvents();
  }

  setAutoplayManager(manager: AutoplayManager): void {
    this.autoplayManager = manager;
    // Wire up button clicks
    this.autoplayBtn.onClick(() => {
      if (this.autoplayManager && !this.autoplayManager.isActive()) {
        // Show a popup to set number of spins 
        const spins = 10; // could be configurable
        this.autoplayManager.start();
      } else {
        this.autoplayManager?.stop();
      }
    });

    this.fastSpinBtn.onClick(() => {
      const newVal = !this.state.isFastSpin;
      this.state.isFastSpin = newVal;
      this.fastSpinBtn.setTexture(newVal ? 'btn_fastspin_on' : 'btn_fastspin_off');
    });

    // Listen to autoplay state changes
    this.state.on('autoplayRemaining', (remaining) => {
      this.autoplayRemainingText.text = remaining > 0 ? `${remaining}` : '';
    });

    this.state.on('isAutoplayActive', (active) => {
      this.autoplayBtn.setTexture(active ? 'btn_autoplay_active' : 'btn_autoplay');
    });
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