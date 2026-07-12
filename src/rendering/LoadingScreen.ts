import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { UIFactory } from './UIFactory.js';
import { GameEvents } from '../events/GameEvents.js';

export class LoadingScreen {
  private container: PIXI.Container & { destroy: () => void };
  private background: PIXI.Graphics & { destroy: () => void };
  private progressBar: PIXI.Graphics & { destroy: () => void };
  private progressFill: PIXI.Graphics & { destroy: () => void };
  private statusText: PIXI.Text & { destroy: () => void };
  private progressText: PIXI.Text & { destroy: () => void };
  private events: GameEvents;

  private cleanupListeners: (() => void)[] = [];

  constructor(parent: PIXI.Container, events: GameEvents) {
    this.events = events;

    // Main container (covers the screen)
    this.container = UIFactory.createContainer(parent);
    this.container.visible = true;

    // Background (dark overlay)
    this.background = UIFactory.createRect(2000, 2000, 0x0a0a1a, undefined, 0, this.container);
    this.background.alpha = 0.9;

    // Progress bar background
    this.progressBar = UIFactory.createRoundedRect(400, 20, 10, 0x333333, undefined, 0, this.container);
    this.progressBar.x = 0;
    this.progressBar.y = 30;

    // Progress fill (starts at 0 width)
    this.progressFill = UIFactory.createRoundedRect(400, 20, 10, 0x00ff88, undefined, 0, this.container);
    this.progressFill.x = -200;
    this.progressFill.y = 30;
    this.progressFill.scale.x = 0; // Initially empty

    // Status text
    this.statusText = UIFactory.createText('Loading...', {
      fontSize: 24,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    this.statusText.x = 0;
    this.statusText.y = -30;

    // Progress percentage text
    this.progressText = UIFactory.createText('0%', {
      fontSize: 18,
      fontFamily: 'Arial',
      fill: 0xcccccc,
      align: 'center',
    }, this.container);
    this.progressText.x = 0;
    this.progressText.y = 60;

    // Listen to loading events
    this.wireEvents();
  }

  /**
   * Update the loading progress.
   */
  setProgress(progress: number): void {
    const clamped = Math.min(1, Math.max(0, progress));
    this.progressFill.scale.x = clamped;
    this.progressText.text = Math.round(clamped * 100) + '%';
  }

  /**
   * Update the status message.
   */
  setStatus(message: string): void {
    this.statusText.text = message;
  }

  /**
   * Hide the loading screen with a fade-out animation.
   */
  hide(): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.container, {
        alpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          this.container.visible = false;
          resolve();
        },
      });
    });
  }

  /**
   * Show the loading screen.
   */
  show(): void {
    this.container.visible = true;
    this.container.alpha = 1;
    this.setProgress(0);
  }

  /**
   * Destroy the loading screen.
   */
  destroy(): void {
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
    this.container.destroy(true);
  }

  private wireEvents(): void {
    // Loading progress updates
    const progressCleanup = this.events.on('loading:progress', (data: { progress: number; phase: string }) => {
      this.setProgress(data.progress);
      this.setStatus(data.phase);
    });
    this.cleanupListeners.push(progressCleanup);

    // Loading complete – automatically hide after a short delay
    const completeCleanup = this.events.on('loading:complete', () => {
      setTimeout(() => {
        this.hide().catch(() => {});
      }, 500);
    });
    this.cleanupListeners.push(completeCleanup);
  }
}