import { ParticleSystem, type IParticleSystemConfig } from './ParticleSystem.js';
import { randomFloat, randomInt } from '../../utils/MathUtils.js';

export interface IBurstConfig extends IParticleSystemConfig {
  /** Speed range (min, max) in pixels per second */
  speedRange?: [number, number];
  /** Lifetime range (min, max) in seconds */
  lifeRange?: [number, number];
  /** Scale range (min, max) */
  scaleRange?: [number, number];
  /** Alpha range (min, max) */
  alphaRange?: [number, number];
  /** Colors to choose from (hex numbers) */
  colors?: number[];
  /** Spread angle (in radians) – 0 = all directions, Math.PI = half circle, etc. */
  spread?: number;
  /** Gravity (downward acceleration) in pixels per second² */
  gravity?: number;
  /** Damping (velocity multiplier per second) */
  damping?: number;
}

/**
 * Explosive burst of particles (fireworks, win celebration, etc.).
 * Particles shoot outward from a center point and fade out.
 */
export class BurstParticleSystem extends ParticleSystem {
  private configExt: IBurstConfig;
  private originX: number = 0;
  private originY: number = 0;
  private emitted: boolean = false;

  constructor(config: IBurstConfig) {
    super(config);
    this.configExt = config;
    // Initially hidden
    this.container.visible = false;
  }

  /**
   * Emit a burst at the given position.
   */
  emit(x: number, y: number): void {
    const cfg = this.configExt;
    const speedRange = cfg.speedRange || [100, 400];
    const lifeRange = cfg.lifeRange || [0.5, 2];
    const scaleRange = cfg.scaleRange || [0.3, 1.0];
    const alphaRange = cfg.alphaRange || [0.8, 1.0];
    const colors = cfg.colors || [0xffd700, 0xff6b6b, 0x4ecdc4, 0xffe66d];
    const spread = cfg.spread !== undefined ? cfg.spread : Math.PI * 2;
    const gravity = cfg.gravity || 200;
    const damping = cfg.damping || 0.99;

    this.originX = x;
    this.originY = y;
    this.container.visible = true;
    this.container.x = 0;
    this.container.y = 0;

    const halfSpread = spread / 2;

    for (const p of this.particles) {
      // Random direction within spread
      const angle = randomFloat(-halfSpread, halfSpread);
      const speed = randomFloat(speedRange[0], speedRange[1]);
      const vx = Math.sin(angle) * speed * randomFloat(0.5, 1);
      const vy = -Math.cos(angle) * speed * randomFloat(0.5, 1); // negative = up
      const life = randomFloat(lifeRange[0], lifeRange[1]);
      const scale = randomFloat(scaleRange[0], scaleRange[1]);
      const alpha = randomFloat(alphaRange[0], alphaRange[1]);
      const rot = randomFloat(0, Math.PI * 2);
      const rotSpeed = randomFloat(-5, 5);
      const color = colors[randomInt(0, colors.length)];

      p.reset(x, y, vx, vy, life, scale, alpha, rot, rotSpeed);
      p.sprite.tint = color;
    }

    this.emitted = true;
    this.start();
  }

  /**
   * Reset all particles (make them inactive).
   */
  reset(): void {
    for (const p of this.particles) {
      p.kill();
    }
    this.emitted = false;
    this.container.visible = false;
    this.stop();
  }

  /**
   * Update particles with gravity and damping.
   */
  protected update(delta: number): void {
    if (!this.running || !this.emitted) return;

    let anyAlive = false;
    for (const p of this.particles) {
      if (p.active) {
        // Apply gravity
        p.vy += this.configExt.gravity || 200 * delta * this.scale;
        // Apply damping
        p.vx *= Math.pow(this.configExt.damping || 0.99, delta * 60);
        p.vy *= Math.pow(this.configExt.damping || 0.99, delta * 60);

        p.update(delta * this.scale);
        if (p.active) anyAlive = true;
      }
    }

    // If all particles are dead, stop the system
    if (!anyAlive) {
      this.stop();
      this.container.visible = false;
    }
  }

  /**
   * Override start to only run if emitted.
   */
  start(): void {
    if (!this.emitted) return;
    super.start();
  }

  /**
   * Set the scale factor.
   */
  setScale(scale: number): void {
    super.setScale(scale);
    // Burst particles are positioned relative to container, so we don't scale the container directly
    // We apply scale to particles individually via the update loop (already scaled).
  }
}