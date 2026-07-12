import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { UIFactory } from './UIFactory.js';
import { GameEvents } from '../events/GameEvents.js';
import { type ILogoConfig } from '../types/index.js';

/**
 * Generic logo animator.
 * Shows a logo (image and/or text) with a configurable entrance animation.
 * Emits 'logo:ready' when the animation completes.
 */
export class LogoAnimator {
  private container: PIXI.Container & { destroy: () => void };
  private config: ILogoConfig & { text: string; textStyle: Partial<PIXI.TextStyle>; duration: number; scalePeak: number; scaleStart: number; alphaStart: number; ease: string; autoHide: boolean; hideDelay: number; };
  private events: GameEvents;
  private isReady: boolean = false;

  constructor(
    parent: PIXI.Container,
    events: GameEvents,
    config: ILogoConfig = {}
  ) {
    this.events = events;

    this.config = {
      imageTexture: config.imageTexture || undefined,
      text: config.text || '',
      textStyle: {
        fontSize: 48,
        fontFamily: 'Arial',
        fill: 0xffd700,
        fontWeight: 'bold',
        align: 'center',
        ...config.textStyle,
      },
      duration: config.duration ?? 0.8,
      scalePeak: config.scalePeak ?? 1.2,
      scaleStart: config.scaleStart ?? 0.5,
      alphaStart: config.alphaStart ?? 0,
      ease: config.ease ?? 'back.out(1.7)',
      autoHide: config.autoHide ?? true,
      hideDelay: config.hideDelay ?? 1.0,
    };

    // Create container (initially invisible)
    this.container = UIFactory.createContainer(parent);
    this.container.visible = false;
    this.container.alpha = 0;

    // Build the logo content
    this.build();
  }

  /**
   * Show the logo with animation.
   * Returns a promise that resolves when the animation completes.
   */
  async show(): Promise<void> {
    if (this.isReady) return;

    // Make visible
    this.container.visible = true;
    this.container.alpha = this.config.alphaStart;
    this.container.scale.set(this.config.scaleStart, this.config.scaleStart);

    // Animate in
    await new Promise<void>((resolve) => {
      gsap.to(this.container, {
        alpha: 1,
        scale: this.config.scalePeak,
        duration: this.config.duration,
        ease: this.config.ease,
        onComplete: () => {
          // Slight bounce back to 1.0
          gsap.to(this.container.scale, {
            x: 1,
            y: 1,
            duration: this.config.duration * 0.4,
            ease: 'power2.out',
          });
          resolve();
        },
      });
    });

    this.isReady = true;
    this.events.emit('logo:ready', {});

    // Auto-hide after delay
    if (this.config.autoHide) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this.hide().then(resolve);
        }, this.config.hideDelay * 1000);
      });
    }

    // Emit hidden event
    this.events.emit('logo:hidden', {});
  }

  /**
   * Hide the logo with a fade-out animation.
   */
  async hide(): Promise<void> {
    await new Promise<void>((resolve) => {
      gsap.to(this.container, {
        alpha: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          this.container.visible = false;
          resolve();
        },
      });
    });
  }

  /**
   * Show the logo immediately (no animation).
   */
  showImmediate(): void {
    this.container.visible = true;
    this.container.alpha = 1;
    this.container.scale.set(1, 1);
    this.isReady = true;
    this.events.emit('logo:ready', {});
  }

  /**
   * Hide immediately (no animation).
   */
  hideImmediate(): void {
    this.container.visible = false;
    this.container.alpha = 0;
    this.events.emit('logo:hidden', {});
  }

  /**
   * Set the position of the logo.
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Get the container (for custom positioning/layout).
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Destroy the logo animator.
   */
  destroy(): void {
    gsap.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private build(): void {
    const config = this.config;
    const hasImage = !!config.imageTexture;
    const hasText = !!config.text;

    if (!hasImage && !hasText) {
      console.warn('[LogoAnimator] No image or text provided. Logo will be empty.');
      return;
    }

    // If both image and text, stack them vertically
    const layoutContainer = UIFactory.createContainer(this.container);
    let yOffset = 0;

    if (hasImage) {
      const texture = PIXI.Assets.get(config.imageTexture!);
      if (texture) {
        const sprite = UIFactory.createSprite(config.imageTexture!, {
          anchor: { x: 0.5, y: 0.5 },
          scale: { x: 1, y: 1 },
        }, layoutContainer);
        sprite.x = 0;
        sprite.y = yOffset;
        // Scale sprite to fit within a reasonable size
        const maxSize = 200;
        if (sprite.width > maxSize) {
          const ratio = maxSize / sprite.width;
          sprite.scale.set(ratio, ratio);
        }
        yOffset += sprite.height / 2 + 20;
      } else {
        console.warn(`[LogoAnimator] Texture not found: ${config.imageTexture}`);
      }
    }

    if (hasText) {
      // Cast the config textStyle object to any or PIXI.TextStyleOptions to appease the UIFactory signature wrapper requirements
      const textObj = UIFactory.createText(
        config.text!,
        config.textStyle as any,
        layoutContainer
      );
      textObj.x = 0;
      textObj.y = yOffset;
      textObj.anchor.set(0.5, 0.5);
    }

    // Center the layout container
    const bounds = layoutContainer.getBounds();
    layoutContainer.x = -bounds.width / 2;
    layoutContainer.y = -bounds.height / 2;
  }
}
