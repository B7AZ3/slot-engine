import { ParticleSystem, type IParticleSystemConfig } from './ParticleSystem.js';
import { randomFloat, randomInt } from '../../utils/MathUtils.js';
import { Particle } from './Particle.js';


export interface IFallingConfig extends IParticleSystemConfig {
  /** Speed range (min, max) in pixels per second */
  speedRange?: [number, number];
  /** Horizontal drift range (min, max) in pixels per second */
  driftRange?: [number, number];
  /** Lifetime range (min, max) in seconds (0 = infinite) */
  lifeRange?: [number, number];
  /** Scale range (min, max) */
  scaleRange?: [number, number];
  /** Alpha range (min, max) */
  alphaRange?: [number, number];
  /** Colors to choose from (hex numbers) */
  colors?: number[];
  /** Rotation speed range (min, max) in radians per second */
  rotationSpeedRange?: [number, number];
  /** If true, particles fall from top to bottom and reset */
  verticalLoop?: boolean;
}

/**
 * Falling particles (snow, confetti, coins, etc.).
 * Particles fall downward and reset to the top when they go off-screen.
 */
export class FallingParticleSystem extends ParticleSystem {
  private configExt: IFallingConfig;
  private viewWidth: number = 0;
  private viewHeight: number = 0;

  constructor(config: IFallingConfig) {
    super(config);
    this.configExt = config;
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;
    this.reset();
  }

  /**
   * Reset all particles.
   */
  reset(): void {
    const cfg = this.configExt;
    const speedRange = cfg.speedRange || [50, 150];
    const driftRange = cfg.driftRange || [-20, 20];
    const lifeRange = cfg.lifeRange || [3, 10];
    const scaleRange = cfg.scaleRange || [0.5, 1.5];
    const alphaRange = cfg.alphaRange || [0.6, 1.0];
    const colors = cfg.colors || [0xffffff];
    const rotSpeedRange = cfg.rotationSpeedRange || [-1, 1];
    const verticalLoop = cfg.verticalLoop !== undefined ? cfg.verticalLoop : true;

    for (const p of this.particles) {
      const x = randomFloat(0, this.viewWidth);
      // Start from a random vertical position, or above the viewport
      const y = verticalLoop ? randomFloat(-this.viewHeight * 0.2, this.viewHeight) : randomFloat(0, this.viewHeight);
      const vx = randomFloat(driftRange[0], driftRange[1]);
      const vy = randomFloat(speedRange[0], speedRange[1]);
      const life = lifeRange[1] > 0 ? randomFloat(lifeRange[0], lifeRange[1]) : 9999;
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
   * Update particles with vertical recycling.
   */
  protected update(delta: number): void {
    if (!this.running) return;
    for (const p of this.particles) {
      if (p.active) {
        p.update(delta * this.scale);

        // If particle fell below the viewport, reset to top
        if (p.y > this.viewHeight + 50) {
          this.resetParticle(p);
        } else if (p.y < -50) {
          // If particle went above (rare), reset to bottom
          p.y = this.viewHeight + 50;
          p.x = randomFloat(0, this.viewWidth);
        }
      }
    }
  }

  /**
   * Reset a single particle to the top.
   */
  private resetParticle(p: Particle): void {
    const cfg = this.configExt;
    const speedRange = cfg.speedRange || [50, 150];
    const driftRange = cfg.driftRange || [-20, 20];
    const lifeRange = cfg.lifeRange || [3, 10];
    const scaleRange = cfg.scaleRange || [0.5, 1.5];
    const alphaRange = cfg.alphaRange || [0.6, 1.0];
    const colors = cfg.colors || [0xffffff];
    const rotSpeedRange = cfg.rotationSpeedRange || [-1, 1];

    p.x = randomFloat(0, this.viewWidth);
    p.y = randomFloat(-this.viewHeight * 0.2, 0);
    p.vx = randomFloat(driftRange[0], driftRange[1]);
    p.vy = randomFloat(speedRange[0], speedRange[1]);
    p.maxLife = lifeRange[1] > 0 ? randomFloat(lifeRange[0], lifeRange[1]) : 9999;
    p.life = p.maxLife;
    p.scale = randomFloat(scaleRange[0], scaleRange[1]);
    p.alpha = randomFloat(alphaRange[0], alphaRange[1]);
    p.rotation = randomFloat(0, Math.PI * 2);
    p.rotationSpeed = randomFloat(rotSpeedRange[0], rotSpeedRange[1]);
    p.active = true;
    p.sprite.visible = true;
    p.sprite.x = p.x;
    p.sprite.y = p.y;
    p.sprite.scale.set(p.scale, p.scale);
    p.sprite.alpha = p.alpha;
    p.sprite.rotation = p.rotation;
    p.sprite.tint = colors[randomInt(0, colors.length)];
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