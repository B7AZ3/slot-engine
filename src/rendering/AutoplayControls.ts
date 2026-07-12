import * as PIXI from 'pixi.js';
import { UIFactory } from './UIFactory.js';
import { Button } from './Button.js';
import { GameEvents } from '../events/GameEvents.js';
import { type IAutoplayState } from '../types/index.js';

export class AutoplayControls {
  private container: PIXI.Container & { destroy: () => void };
  private events: GameEvents;

  private statusText: PIXI.Text & { destroy: () => void };
  private progressText: PIXI.Text & { destroy: () => void };
  private stopButton: Button;
  private fastSpinToggle: Button;

  private visible: boolean = false;
  private cleanupFns: (() => void)[] = [];

  constructor(parent: PIXI.Container, events: GameEvents) {
    this.events = events;

    this.container = UIFactory.createContainer(parent);
    this.container.visible = false;

    // Background (semi-transparent pill)
    const bg = UIFactory.createRoundedRect(300, 50, 25, 0x000000, 0x444466, 1, this.container);
    bg.alpha = 0.8;

    // Status text
    this.statusText = UIFactory.createText('Autoplay: 0/0', {
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    this.statusText.x = -80;
    this.statusText.y = 0;

    // Progress text (spins remaining)
    this.progressText = UIFactory.createText('', {
      fontSize: 14,
      fontFamily: 'Arial',
      fill: 0x88ddff,
      align: 'center',
    }, this.container);
    this.progressText.x = 40;
    this.progressText.y = 0;

    // Stop button (X)
    this.stopButton = new Button(
      this.container,
      {
        defaultTexture: 'btn_close_small',
        elastic: true,
        scale: 0.6,
      },
      30, 30
    );
    this.stopButton.setPosition(130, 0);
    this.stopButton.onClick(() => {
      this.events.emit('autoplay:stop', {});
    });

    // Fast spin toggle (F)
    this.fastSpinToggle = new Button(
      this.container,
      {
        defaultTexture: 'btn_fastspin_off',
        hoverTexture: 'btn_fastspin_on',
        elastic: true,
        scale: 0.6,
      },
      30, 30
    );
    this.fastSpinToggle.setPosition(95, 0);
    this.fastSpinToggle.onClick(() => {
      this.events.emit('autoplay:toggleFastSpin', {});
    });

    // Wire events
    this.wireEvents();
  }

  /**
   * Show the autoplay controls.
   */
  show(): void {
    this.container.visible = true;
    this.visible = true;
  }

  /**
   * Hide the autoplay controls.
   */
  hide(): void {
    this.container.visible = false;
    this.visible = false;
  }

  /**
   * Set the position of the controls.
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Update the display with autoplay state.
   */
  update(state: IAutoplayState): void {
    this.statusText.text = `Autoplay: ${state.roundsCompleted}/${state.roundsTotal}`;

    if (state.roundsRemaining > 0) {
      this.progressText.text = `${state.roundsRemaining} left`;
    } else {
      this.progressText.text = 'Complete';
    }

    // Update fast spin button texture
    this.fastSpinToggle.setTexture(state.fastSpin ? 'btn_fastspin_on' : 'btn_fastspin_off');
  }

  /**
   * Destroy the controls.
   */
  destroy(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.stopButton.destroy();
    this.fastSpinToggle.destroy();
    this.container.destroy(true);
  }

  private wireEvents(): void {
    const startCleanup = this.events.on('autoplay:started', (state: IAutoplayState) => {
      this.show();
      this.update(state);
    });

    const progressCleanup = this.events.on('autoplay:progress', (data) => {
      // We'll get full state from autoplay manager, but we can update partially
      // For simplicity, we'll re-query the state or just update text
      // We'll let the manager emit full state on progress.
    });

    const stateCleanup = this.events.on('autoplay:state', (state: IAutoplayState) => {
      this.update(state);
    });

    const stopCleanup = this.events.on('autoplay:stopped', () => {
      this.hide();
    });

    const fastSpinCleanup = this.events.on('autoplay:fastspin', (data: { enabled: boolean }) => {
      // Update button state (already handled in update)
    });

    this.cleanupFns.push(startCleanup, progressCleanup, stateCleanup, stopCleanup, fastSpinCleanup);
  }
}