import * as PIXI from 'pixi.js';
import { GameState } from '../core/GameState.js';
import { type IUIConfig } from '../types/index.js';
import { Button } from './Button.js';

export class SpinButton {
  private button: Button;
  private state: GameState;
  private isSpinning: boolean = false;

  constructor(parent: PIXI.Container, state: GameState, config: IUIConfig) {
    this.state = state;

    this.button = new Button(
      parent,
      {
        defaultTexture: 'btn_spin',
        hoverTexture: 'btn_spin_hover',
        pressedTexture: 'btn_spin_pressed',
        disabledTexture: 'btn_spin_disabled',
        elastic: true,
        scale: 1.0,
      },
      150, 60
    );

    this.button.onClick(() => {
      if (!this.isSpinning && !this.state.isSpinning) {
        // Emit spin request via GameController
        // The controller will listen for this event.
        // We can use the GameEvents instance if we have it, but for simplicity we'll use a callback.
        if (this._spinCallback) {
          this._spinCallback();
        }
      }
    });

    // Update button state based on game state
    this.state.on('isSpinning', (spinning) => {
      this.setSpinning(spinning);
    });
  }

  private _spinCallback: (() => void) | null = null;

  /**
   * Set the callback to be called when the spin button is clicked.
   */
  onSpin(callback: () => void): void {
    this._spinCallback = callback;
  }

  /**
   * Set the spinning state (disables the button during spin).
   */
  setSpinning(spinning: boolean): void {
    this.isSpinning = spinning;
    this.button.enabled = !spinning;
  }

  /**
   * Set the position of the spin button.
   */
  setPosition(x: number, y: number): void {
    this.button.setPosition(x, y);
  }

  /**
   * Destroy the spin button.
   */
  destroy(): void {
    this.button.destroy();
  }
}