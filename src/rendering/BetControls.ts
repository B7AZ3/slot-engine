import * as PIXI from 'pixi.js';
import { GameState } from '../core/GameState.js';
import { type IUIConfig } from '../types/index.js';
import { UIFactory } from './UIFactory.js';
import { Button } from './Button.js';
import { formatCurrency } from '../utils/NumberFormatter.js';

export class BetControls {
  private container: PIXI.Container & { destroy: () => void };
  private betText: PIXI.Text & { destroy: () => void };
  private betDownButton: Button;
  private betUpButton: Button;
  private config: IUIConfig;
  private state: GameState;
  private fastSpinToggle: Button;
  private cleanup: () => void;

  constructor(parent: PIXI.Container, state: GameState, config: IUIConfig) {
    this.state = state;
    this.config = config;

    // Create container
    this.container = UIFactory.createContainer(parent);

    // Bet label
    const label = UIFactory.createText('Bet', {
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 0xcccccc,
      align: 'center',
    }, this.container);
    label.x = 0;
    label.y = -30;

    // Bet value
    this.betText = UIFactory.createText('0.00', {
      fontSize: 28,
      fontFamily: 'Arial',
      fill: 0xffffff,
      fontWeight: 'bold',
      align: 'center',
    }, this.container);
    this.betText.x = 0;
    this.betText.y = -2;

    // Down button (using generic button textures – will need config)
    this.betDownButton = new Button(
      this.container,
      {
        defaultTexture: 'btn_down',   // Host must provide these textures
        hoverTexture: 'btn_down_hover',
        pressedTexture: 'btn_down_pressed',
        elastic: true,
        scale: 0.8,
      },
      40, 40
    );
    this.betDownButton.setPosition(-60, 10);
    this.betDownButton.onClick(() => this.decreaseBet());

    // Up button
    this.betUpButton = new Button(
      this.container,
      {
        defaultTexture: 'btn_up',
        hoverTexture: 'btn_up_hover',
        pressedTexture: 'btn_up_pressed',
        elastic: true,
        scale: 0.8,
      },
      40, 40
    );
    this.betUpButton.setPosition(60, 10);
    this.betUpButton.onClick(() => this.increaseBet());

    // Fast spin toggle
    this.fastSpinToggle = new Button(
      this.container,
      {
        defaultTexture: 'btn_fastspin_off',
        hoverTexture: 'btn_fastspin_on',
        pressedTexture: 'btn_fastspin_on',
        elastic: true,
        scale: 0.8,
      },
      40, 40
    );
    this.fastSpinToggle.setPosition(120, 10);
    this.fastSpinToggle.onClick(() => {
      // Emit event
      this.state.isFastSpin = !this.state.isFastSpin
    });

    // Subscribe to bet changes
    this.cleanup = this.state.on('currentBet', (newBet) => {
      this.updateBetDisplay(newBet);
    });

    // Initial update
    this.updateBetDisplay(this.state.currentBet);
  }

  /**
   * Set the position of the bet controls.
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Decrease the bet by one step.
   */
  private decreaseBet(): void {
    const minBet = 0.01; // Could be configured
    const step = 0.01;
    const newBet = Math.max(minBet, this.state.currentBet - step);
    this.state.currentBet = newBet;
  }

  /**
   * Increase the bet by one step.
   */
  private increaseBet(): void {
    const maxBet = 100; // Could be configured
    const step = 0.01;
    const newBet = Math.min(maxBet, this.state.currentBet + step);
    this.state.currentBet = newBet;
  }

  /**
   * Update the bet display.
   */
  private updateBetDisplay(bet: number): void {
    const formatted = formatCurrency(bet, {
      decimalSeparator: this.config.decimalSeparator || '.',
      thousandSeparator: this.config.thousandSeparator || ',',
      minDecimalPlaces: this.config.minDecimalPlaces || 2,
      currencySymbol: this.config.currencySymbol || '$',
      currencyPosition: 'prefix',
    });
    this.betText.text = formatted;
  }

  // Fast spin state
  setFastSpinEnabled(enabled: boolean): void {
    this.fastSpinToggle.setTexture(enabled ? 'btn_fastspin_on' : 'btn_fastspin_off');
  }

  /**
   * Destroy the bet controls.
   */
  destroy(): void {
    this.cleanup();
    this.betDownButton.destroy();
    this.betUpButton.destroy();
    this.container.destroy(true);
  }
}