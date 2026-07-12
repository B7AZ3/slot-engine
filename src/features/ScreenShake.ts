import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GameEvents } from '../events/GameEvents.js';

export interface IScreenShakeConfig {
  /** Duration of the shake in milliseconds (default: 500) */
  duration?: number;
  /** Maximum intensity (pixels) (default: 10) */
  intensity?: number;
  /** Number of individual shake movements (default: 12) */
  steps?: number;
  /** Fade-out duration at the end (ms) (default: 200) */
  fadeOutDuration?: number;
}

export interface IScreenShakeOptions {
  /** The container to shake (usually the main game container) */
  container: PIXI.Container;
  /** Event bus */
  events?: GameEvents;
  /** Configuration */
  config?: IScreenShakeConfig;
}

/**
 * Screen shake effect.
 * Shakes a container on demand with configurable intensity and duration.
 */
export class ScreenShake {
  private container: PIXI.Container;
  private events?: GameEvents;
  private config: Required<IScreenShakeConfig>;

  private originalX: number = 0;
  private originalY: number = 0;
  private isShaking: boolean = false;
  private cleanupFns: (() => void)[] = [];

  constructor(options: IScreenShakeOptions) {
    this.container = options.container;
    this.events = options.events;

    this.config = {
      duration: options.config?.duration ?? 500,
      intensity: options.config?.intensity ?? 10,
      steps: options.config?.steps ?? 12,
      fadeOutDuration: options.config?.fadeOutDuration ?? 200,
    };

    // Store original position
    this.originalX = this.container.x;
    this.originalY = this.container.y;

    // Wire up events if provided
    if (this.events) {
      const shakeCleanup = this.events.on('screen:shake', (config?: Partial<IScreenShakeConfig>) => {
        this.shake(config);
      });
      this.cleanupFns.push(shakeCleanup);
    }
  }

  /**
   * Trigger the screen shake effect.
   * @param config - Override config for this shake only.
   * @returns Promise that resolves when the shake completes.
   */
  async shake(config?: Partial<IScreenShakeConfig>): Promise<void> {
    if (this.isShaking) return;

    const duration = config?.duration ?? this.config.duration;
    const intensity = config?.intensity ?? this.config.intensity;
    const steps = config?.steps ?? this.config.steps;
    const fadeOutDuration = config?.fadeOutDuration ?? this.config.fadeOutDuration;

    this.isShaking = true;

    // Reset to original position first
    this.container.x = this.originalX;
    this.container.y = this.originalY;

    return new Promise<void>((resolve) => {
      // Build an array of random offsets
      const offsets: { x: number; y: number }[] = [];
      for (let i = 0; i < steps; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mag = intensity * (1 - (i / steps) * 0.7); // gradually reduce intensity
        offsets.push({
          x: Math.cos(angle) * mag * (0.5 + Math.random() * 0.5),
          y: Math.sin(angle) * mag * (0.5 + Math.random() * 0.5),
        });
      }

      // Add a final return to original position
      offsets.push({ x: 0, y: 0 });

      // Create a GSAP timeline
      const tl = gsap.timeline({
        onComplete: () => {
          this.container.x = this.originalX;
          this.container.y = this.originalY;
          this.isShaking = false;
          resolve();
        },
      });

      // Step through each offset
      const stepDuration = duration / (steps + 1);
      for (const offset of offsets) {
        tl.to(this.container, {
          x: this.originalX + offset.x,
          y: this.originalY + offset.y,
          duration: stepDuration / 1000,
          ease: 'power1.inOut',
        });
      }

      // Fade out (optional: scale or alpha)
      if (fadeOutDuration > 0) {
        tl.to(this.container, {
          x: this.originalX,
          y: this.originalY,
          duration: fadeOutDuration / 1000,
          ease: 'power2.out',
        }, `-=${fadeOutDuration / 2000}`);
      }

      // Emit event
      if (this.events) {
        this.events.emit('screen:shake:started', { intensity, duration });
      }
    });
  }

  /**
   * Set the intensity for future shakes.
   */
  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(1, intensity);
  }

  /**
   * Set the duration for future shakes.
   */
  setDuration(duration: number): void {
    this.config.duration = Math.max(100, duration);
  }

  /**
   * Immediately stop the shake and reset position.
   */
  stop(): void {
    gsap.killTweensOf(this.container);
    this.container.x = this.originalX;
    this.container.y = this.originalY;
    this.isShaking = false;
  }

  /**
   * Destroy the screen shake manager.
   */
  destroy(): void {
    this.stop();
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }
}