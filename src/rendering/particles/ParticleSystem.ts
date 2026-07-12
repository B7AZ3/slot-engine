import * as PIXI from 'pixi.js';
import { Particle } from './Particle.js';
import { UIFactory } from '../UIFactory.js';

export interface IParticleSystemConfig {
  /** Number of particles in the pool */
  count: number;
  /** Texture key or PIXI.Texture to use for all particles */
  texture: string | PIXI.Texture;
  /** Parent container to add particles to */
  parent: PIXI.Container;
}

/**
 * Base class for particle systems.
 * Manages a pool of particles, updates them on the Pixi ticker, and handles resize.
 */
export abstract class ParticleSystem {
  protected particles: Particle[] = [];
  protected container: PIXI.Container & { destroy: () => void };
  protected texture: PIXI.Texture;
  protected config: IParticleSystemConfig;
  protected tickerCallback: (ticker: PIXI.Ticker) => void;
  protected running: boolean = false;
  protected scale: number = 1;

  constructor(config: IParticleSystemConfig) {
    this.config = config;
    this.container = UIFactory.createContainer(config.parent);

    // Resolve texture
    if (typeof config.texture === 'string') {
      this.texture = PIXI.Assets.get(config.texture);
      if (!this.texture) {
        throw new Error(`[ParticleSystem] Texture not found: ${config.texture}`);
      }
    } else {
      this.texture = config.texture;
    }

    // Create particles
    for (let i = 0; i < config.count; i++) {
      const particle = new Particle(this.texture);
      this.container.addChild(particle.sprite);
      this.particles.push(particle);
    }

    // Bind ticker callback to accept the Pixi Ticker object and pass the delta number to update
    this.tickerCallback = (ticker: PIXI.Ticker) => {
      this.update(ticker.deltaTime);
    };
  }

  /**
   * Start the particle system (adds to Pixi ticker).
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    PIXI.Ticker.shared.add(this.tickerCallback);
  }

  /**
   * Stop the particle system (removes from Pixi ticker).
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    PIXI.Ticker.shared.remove(this.tickerCallback);
  }

  /**
   * Reset all particles (e.g., on resize or restart).
   */
  abstract reset(): void;

  /**
   * Update all particles.
   * @param delta - Delta time in seconds from Pixi ticker.
   */
  protected update(delta: number): void {
    if (!this.running) return;
    for (const p of this.particles) {
      if (p.active) {
        p.update(delta * this.scale);
      }
    }
  }

  /**
   * Set the scale factor (for responsive design).
   */
  setScale(scale: number): void {
    this.scale = scale;
    this.container.scale.set(scale, scale);
  }

  /**
   * Get the container (for positioning).
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Destroy the system and clean up.
   */
  destroy(): void {
    this.stop();
    this.container.destroy(true);
    this.particles = [];
  }
}
