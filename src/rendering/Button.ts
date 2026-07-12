import * as PIXI from 'pixi.js';
import { UIFactory } from './UIFactory.js';
import { type IButtonConfig } from '../types/index.js';
import gsap from 'gsap';

export class Button {
  private container: PIXI.Container & { destroy: () => void };
  private sprite: PIXI.Sprite & { destroy: () => void };
  private config: IButtonConfig;
  private _enabled: boolean = true;
  private _clickHandler: (() => void) | null = null;
  private _hoverHandler: ((hovering: boolean) => void) | null = null;

  // Store bound event references to prevent memory leaks during cleanup
  private _boundPointerDown = this.onPointerDown.bind(this);
  private _boundPointerUp = this.onPointerUp.bind(this);
  private _boundPointerOver = this.onPointerOver.bind(this);
  private _boundPointerOut = this.onPointerOut.bind(this);

  /**
   * Creates a button with texture-based states.
   * @param parent - Parent container to add the button to.
   * @param config - Button configuration.
   * @param width - Width for hit area (defaults to sprite width).
   * @param height - Height for hit area (defaults to sprite height).
   */
  constructor(
    parent: PIXI.Container,
    config: IButtonConfig,
    width?: number,
    height?: number
  ) {
    this.config = config;

    // Create container
    this.container = UIFactory.createContainer(parent);

    // Create sprite with default texture
    const sprite = UIFactory.createSprite(config.defaultTexture, {
      anchor: { x: 0.5, y: 0.5 },
      scale: { x: config.scale || 1, y: config.scale || 1 },
    }, this.container);
    this.sprite = sprite;

    // Set hit area
    const hitWidth = width || sprite.width;
    const hitHeight = height || sprite.height;
    
    // Modern PixiJS v8 interactive and cursor settings
    sprite.interactive = true;
    sprite.cursor = 'pointer'; 
    
    sprite.hitArea = new PIXI.Rectangle(
      -hitWidth / 2,
      -hitHeight / 2,
      hitWidth,
      hitHeight
    );

    // Bind events
    this.bindEvents();
  }

  /**
   * Set the click handler.
   */
  onClick(handler: () => void): void {
    this._clickHandler = handler;
  }

  /**
   * Set the hover handler (receives boolean indicating hover state).
   */
  onHover(handler: (hovering: boolean) => void): void {
    this._hoverHandler = handler;
  }

  /**
   * Enable or disable the button.
   */
  set enabled(value: boolean) {
    this._enabled = value;
    this.sprite.interactive = value;
    
    // Toggle the pointer cursor based on state
    this.sprite.cursor = value ? 'pointer' : 'default';

    if (!value && this.config.disabledTexture) {
      this.sprite.texture = PIXI.Assets.get(this.config.disabledTexture);
    } else if (value) {
      this.sprite.texture = PIXI.Assets.get(this.config.defaultTexture);
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Set the button's position.
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Set the button's scale.
   */
  setScale(x: number, y: number): void {
    this.container.scale.set(x, y);
  }

  /**
   * Get the underlying container (for advanced layout).
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get the sprite (for texture changes).
   */
  getSprite(): PIXI.Sprite {
    return this.sprite;
  }

  /**
   * Set a specific texture (overrides the state-based logic).
   */
  setTexture(textureKey: string): void {
    const texture = PIXI.Assets.get(textureKey);
    if (texture) {
      this.sprite.texture = texture;
    }
  }

  /**
   * Destroy the button and clean up.
   */
  destroy(): void {
    // Correctly remove the listeners using the stored bound references
    this.sprite.off('pointerdown', this._boundPointerDown);
    this.sprite.off('pointerup', this._boundPointerUp);
    this.sprite.off('pointerupoutside', this._boundPointerUp);
    this.sprite.off('pointerover', this._boundPointerOver);
    this.sprite.off('pointerout', this._boundPointerOut);
    this.container.destroy(true);
  }

  private bindEvents(): void {
    // Pass the saved references so they can be securely cleaned up later
    this.sprite.on('pointerdown', this._boundPointerDown);
    this.sprite.on('pointerup', this._boundPointerUp);
    this.sprite.on('pointerupoutside', this._boundPointerUp);
    this.sprite.on('pointerover', this._boundPointerOver);
    this.sprite.on('pointerout', this._boundPointerOut);
  }

  private onPointerDown(): void {
    if (!this._enabled) return;
    if (this.config.pressedTexture) {
      this.sprite.texture = PIXI.Assets.get(this.config.pressedTexture);
    }
    if (this.config.elastic) {
      gsap.to(this.sprite.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.1,
        ease: 'power1.out',
      });
    }
  }

  private onPointerUp(): void {
    if (!this._enabled) return;
    if (this.config.defaultTexture) {
      this.sprite.texture = PIXI.Assets.get(this.config.defaultTexture);
    }
    if (this.config.elastic) {
      gsap.to(this.sprite.scale, {
        x: this.config.scale || 1,
        y: this.config.scale || 1,
        duration: 0.3,
        ease: 'elastic.out(1, 0.45)',
      });
    }
    if (this._clickHandler) {
      this._clickHandler();
    }
  }

  private onPointerOver(): void {
    if (!this._enabled) return;
    if (this.config.hoverTexture) {
      this.sprite.texture = PIXI.Assets.get(this.config.hoverTexture);
    }
    if (this.config.elastic) {
      gsap.to(this.sprite.scale, {
        x: (this.config.scale || 1) * 1.05,
        y: (this.config.scale || 1) * 1.05,
        duration: 0.3,
        ease: 'elastic.out(1, 0.45)',
      });
    }
    if (this._hoverHandler) {
      this._hoverHandler(true);
    }
  }

  private onPointerOut(): void {
    if (!this._enabled) return;
    if (this.config.defaultTexture) {
      this.sprite.texture = PIXI.Assets.get(this.config.defaultTexture);
    }
    if (this.config.elastic) {
      gsap.to(this.sprite.scale, {
        x: this.config.scale || 1,
        y: this.config.scale || 1,
        duration: 0.3,
        ease: 'elastic.out(1, 0.45)',
      });
    }
    if (this._hoverHandler) {
      this._hoverHandler(false);
    }
  }
}
