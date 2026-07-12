
import { randomFloat, randomInt } from '../../utils/MathUtils.js';
import { ParticleSystem, type IParticleSystemConfig } from './ParticleSystem.js';


export interface IDustConfig extends IParticleSystemConfig {
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
  /** Rotation speed range (min, max) in radians per second */
  rotationSpeedRange?: [number, number];
}

/**
 * Ambient floating dust particles.
 * Particles slowly drift around and recycle when they go off-screen or expire.
 */
export class DustParticleSystem extends ParticleSystem {
  private configExt: IDustConfig;
  private viewWidth: number = 0;
  private viewHeight: number = 0;

  constructor(config: IDustConfig) {
    super(config);
    this.configExt = config;
    // Set initial viewport size (will be updated via resize)
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;
    this.reset();
  }

  /**
   * Reset all particles.
   */
  reset(): void {
    const cfg = this.configExt;
    const speedRange = cfg.speedRange || [10, 30];
    const lifeRange = cfg.lifeRange || [3, 8];
    const scaleRange = cfg.scaleRange || [0.5, 1.5];
    const alphaRange = cfg.alphaRange || [0.3, 0.8];
    const colors = cfg.colors || [0xffffff];
    const rotSpeedRange = cfg.rotationSpeedRange || [-0.5, 0.5];

    for (const p of this.particles) {
      const x = randomFloat(0, this.viewWidth);
      const y = randomFloat(0, this.viewHeight);
      const vx = randomFloat(speedRange[0], speedRange[1]) * (Math.random() > 0.5 ? 1 : -1);
      const vy = randomFloat(speedRange[0], speedRange[1]) * (Math.random() > 0.5 ? 1 : -1);
      const life = randomFloat(lifeRange[0], lifeRange[1]);
      const scale = randomFloat(scaleRange[0], scaleRange[1]);
      const alpha = randomFloat(alphaRange[0], alphaRange[1]);
      const rot = randomFloat(0, Math.PI * 2);
      const rotSpeed = randomFloat(rotSpeedRange[0], rotSpeedRange[1]);
      const color = colors[randomInt(0, colors.length)];

      p.reset(x, y, vx, vy, life, scale, alpha, rot, rotSpeed);
      p.sprite.tint = color;
    }
  }

  /**
   * Update particles with viewport wrapping.
   */
  protected update(delta: number): void {
    if (!this.running) return;
    for (const p of this.particles) {
      if (p.active) {
        p.update(delta * this.scale);
        // Wrap around edges
        if (p.x > this.viewWidth + 50) p.x = -50;
        if (p.x < -50) p.x = this.viewWidth + 50;
        if (p.y > this.viewHeight + 50) p.y = -50;
        if (p.y < -50) p.y = this.viewHeight + 50;
        // Keep within viewport (optional)
        p.sprite.x = p.x;
        p.sprite.y = p.y;
      }
    }
  }

  /**
   * Update viewport dimensions (call on resize).
   */
  setViewport(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    this.reset();
  }
}