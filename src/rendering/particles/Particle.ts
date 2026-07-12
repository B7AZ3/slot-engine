import * as PIXI from 'pixi.js';

/**
 * A single particle with position, velocity, life, and a sprite.
 */
export class Particle {
  public sprite: PIXI.Sprite;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public life: number = 0;
  public maxLife: number = 1;
  public scale: number = 1;
  public alpha: number = 1;
  public rotation: number = 0;
  public rotationSpeed: number = 0;
  public active: boolean = false;

  constructor(texture: PIXI.Texture) {
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.visible = false;
  }

  /**
   * Initialize the particle with parameters.
   */
  init(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    scale: number = 1,
    alpha: number = 1,
    rotation: number = 0,
    rotationSpeed: number = 0
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = life;
    this.life = life;
    this.scale = scale;
    this.alpha = alpha;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.active = true;
    this.sprite.visible = true;
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.scale.set(scale, scale);
    this.sprite.alpha = alpha;
    this.sprite.rotation = rotation;
  }

  /**
   * Update the particle state.
   * @param delta - Delta time in seconds.
   * @returns `true` if the particle is still alive.
   */
  update(delta: number): boolean {
    if (!this.active) return false;

    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
      this.sprite.visible = false;
      return false;
    }

    // Move
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Update rotation
    this.rotation += this.rotationSpeed * delta;
    this.sprite.rotation = this.rotation;

    // Update scale (optional: could scale over life)
    // Update alpha (optional: could fade out)
    // Simple linear fade at the end of life
    const lifeRatio = this.life / this.maxLife;
    this.sprite.alpha = Math.min(this.alpha, this.alpha * lifeRatio);

    return true;
  }

  /**
   * Kill the particle immediately.
   */
  kill(): void {
    this.active = false;
    this.sprite.visible = false;
  }

  /**
   * Reset the particle to a new state (recycling).
   */
  reset(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    scale: number = 1,
    alpha: number = 1,
    rotation: number = 0,
    rotationSpeed: number = 0
  ): void {
    this.init(x, y, vx, vy, life, scale, alpha, rotation, rotationSpeed);
  }
}