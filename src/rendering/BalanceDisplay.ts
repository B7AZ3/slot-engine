import * as PIXI from 'pixi.js';
import { GameState } from '../core/GameState.js';
import { type IUIConfig } from '../types/index.js';
import { UIFactory } from './UIFactory.js';
import { formatCurrency } from '../utils/NumberFormatter.js';

export class BalanceDisplay {
  private container: PIXI.Container & { destroy: () => void };
  private label: PIXI.Text & { destroy: () => void };
  private valueText: PIXI.Text & { destroy: () => void };
  private config: IUIConfig;
  private state: GameState;
  private cleanup: () => void;

  constructor(parent: PIXI.Container, state: GameState, config: IUIConfig) {
    this.state = state;
    this.config = config;

    // Create container
    this.container = UIFactory.createContainer(parent);

    // Label: "Balance"
    this.label = UIFactory.createText('Balance', {
      fontSize: 18,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    this.label.x = 0;
    this.label.y = -20;

    // Value text
    this.valueText = UIFactory.createText('0.00', {
      fontSize: 32,
      fontFamily: 'Arial',
      fill: 0x00ff00,
      fontWeight: 'bold',
      align: 'center',
    }, this.container);
    this.valueText.x = 0;
    this.valueText.y = 10;

    // Subscribe to balance changes
    this.cleanup = this.state.on('balance', (newBalance) => {
      this.updateBalance(newBalance);
    });

    // Initial update
    this.updateBalance(this.state.balance);
  }

  /**
   * Set the position of the balance display.
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Update the displayed balance.
   */
  private updateBalance(balance: number): void {
    const formatted = formatCurrency(balance, {
      decimalSeparator: this.config.decimalSeparator || '.',
      thousandSeparator: this.config.thousandSeparator || ',',
      minDecimalPlaces: this.config.minDecimalPlaces || 2,
      currencySymbol: this.config.currencySymbol || '$',
      currencyPosition: 'prefix',
    });
    this.valueText.text = formatted;
  }

  /**
   * Destroy the balance display.
   */
  destroy(): void {
    this.cleanup();
    this.container.destroy(true);
  }
}