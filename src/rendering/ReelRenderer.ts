import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { UIFactory } from './UIFactory.js';
import { type IReelConfig, type SymbolMap, type ReelResult, type IResizeable } from '../types/index.js';

export class ReelRenderer implements IResizeable {
  private container: PIXI.Container & { destroy: () => void };
  private reels: Reel[] = [];
  private config: IReelConfig;
  private symbolMap: SymbolMap;
  private scale: number = 1;
  private speedMultiplier: number = 1;
  private skipDelay: boolean = false;
  private _reelWidth: number = 0;
  private _reelHeight: number = 0;
  private _symbolWidth: number = 0;
  private _symbolHeight: number = 0;
  private _reelXOffsets: number[] = [];
  private _rowYOffsets: number[] = [];

  // Callbacks
  private onSpinStartCallback?: () => void;
  private onSpinCompleteCallback?: (result: ReelResult) => void;

  constructor(
    parent: PIXI.Container,
    config: IReelConfig,
    symbolMap: SymbolMap,
  ) {
    this.config = {
      spacing: 0,
      stripLength: 30,
      ...config,
    };
    this.symbolMap = symbolMap;

    // Store dimensions for PaylineRenderer
    this._symbolWidth = this.config.symbolWidth;
    this._symbolHeight = this.config.symbolHeight;
    this._reelWidth = this.config.symbolWidth + (this.config.spacing || 0);
    this._reelHeight = this.config.symbolHeight * this.config.rowCount;

    // Create a container for all reels
    this.container = UIFactory.createContainer(parent);
    this.container.pivot.set(0, 0);

    // Calculate positions
    const totalWidth = this.config.reelCount * this._reelWidth;
    const startX = -totalWidth / 2 + this._symbolWidth / 2;
    const startY = -this._reelHeight / 2 + this._symbolHeight / 2;

    // Build each reel and store its X offset
    for (let i = 0; i < this.config.reelCount; i++) {
      const x = startX + i * this._reelWidth;
      this._reelXOffsets.push(x);
      const reel = new Reel(
        this.container,
        this.config,
        this.symbolMap,
        x,
        this.scale
      );
      this.reels.push(reel);
    }

    // Store row Y offsets
    for (let i = 0; i < this.config.rowCount; i++) {
      this._rowYOffsets.push(startY + i * this._symbolHeight);
    }
  }

  getReelDimensions(): {
    reelWidth: number;
    reelHeight: number;
    symbolWidth: number;
    symbolHeight: number;
    reelXOffsets: number[];
    rowYOffsets: number[];
  } | null {
    if (this.reels.length === 0) return null;
    return {
      reelWidth: this._reelWidth,
      reelHeight: this._reelHeight,
      symbolWidth: this._symbolWidth,
      symbolHeight: this._symbolHeight,
      reelXOffsets: this._reelXOffsets,
      rowYOffsets: this._rowYOffsets,
    };
  }

  onResize(width: number, height: number, scale: number): void {
    this.scale = scale;
    for (const reel of this.reels) {
      reel.setScale(scale);
    }
  }

  setInitialState(result: ReelResult): void {
    for (let i = 0; i < this.reels.length && i < result.length; i++) {
      this.reels[i]!.setSymbols(result[i]!);
    }
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(5, multiplier));
    for (const reel of this.reels) {
      reel.setSpeedMultiplier(this.speedMultiplier);
    }
  }

  setSkipDelay(skip: boolean): void {
    this.skipDelay = skip;
    for (const reel of this.reels) {
      reel.setSkipDelay(skip);
    }
  }

  spin(): void {
    if (this.onSpinStartCallback) {
      this.onSpinStartCallback();
    }
    for (const reel of this.reels) {
      reel.spin();
    }
  }

  stop(stopPositions: ReelResult): void {
    for (let i = 0; i < this.reels.length && i < stopPositions.length; i++) {
      this.reels[i]!.stopAt(stopPositions[i]!, () => {
        const allStopped = this.reels.every((r) => !r.isSpinning);
        if (allStopped && this.onSpinCompleteCallback) {
          this.onSpinCompleteCallback(stopPositions);
        }
      });
    }
  }

  onSpinStart(cb: () => void): void {
    this.onSpinStartCallback = cb;
  }

  onSpinComplete(cb: (result: ReelResult) => void): void {
    this.onSpinCompleteCallback = cb;
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    for (const reel of this.reels) {
      reel.destroy();
    }
    this.reels = [];
    this.container.destroy(true);
  }
}

/**
 * A single reel with a mask and a strip of symbols.
 */
class Reel {
  private container: PIXI.Container & { destroy: () => void };
  private mask: PIXI.Graphics & { destroy: () => void };
  private strip: PIXI.Container & { destroy: () => void };
  private symbolHeight: number;
  private symbolWidth: number;
  private rowCount: number;
  private totalSymbols: number;
  private symbolMap: SymbolMap;
  private symbols: PIXI.Sprite[] = [];
  private _isSpinning: boolean = false;
  private tween: gsap.core.Tween | null = null;
  private scale: number = 1;
  private currentY: number = 0;
  private speedMultiplier: number = 1;
  private skipDelay: boolean = false;

  constructor(
    parent: PIXI.Container,
    config: IReelConfig,
    symbolMap: SymbolMap,
    x: number,
    scale: number
  ) {
    this.symbolHeight = config.symbolHeight;
    this.symbolWidth = config.symbolWidth;
    this.rowCount = config.rowCount;
    this.totalSymbols = config.stripLength || 30;
    this.symbolMap = symbolMap;
    this.scale = scale;

    // Container for this reel
    this.container = UIFactory.createContainer(parent);
    this.container.x = x;

    // Create mask: a rectangle covering exactly the visible rows
    const maskHeight = this.rowCount * this.symbolHeight;
    const maskWidth = this.symbolWidth;
    this.mask = UIFactory.createRect(maskWidth, maskHeight, 0xffffff, undefined, 0, this.container);
    this.mask.alpha = 0.3; // semi-transparent for debugging (optional)
    this.container.mask = this.mask;

    // Strip container (holds all symbols)
    this.strip = UIFactory.createContainer(this.container);
    this.strip.y = 0;

    // Build the strip with symbols
    this.buildStrip();

    // Set initial position so that the center row is aligned
    this.alignToCenter();
  }

  /**
   * Build the strip with `totalSymbols` sprites, cycling through available symbols.
   */
  private buildStrip(): void {
    const keys = Object.keys(this.symbolMap);
    if (keys.length === 0) {
      throw new Error('[Reel] No symbols in symbolMap.');
    }

    for (let i = 0; i < this.totalSymbols; i++) {
      // Cycle through symbol IDs
      const symbolId = parseInt(keys[i % keys.length]!, 10);
      const textureKey = this.symbolMap[symbolId]!;
      const sprite = UIFactory.createSprite(textureKey, {
        anchor: { x: 0.5, y: 0.5 },
        scale: { x: 1, y: 1 },
      }, this.strip);
      sprite.x = this.symbolWidth / 2;
      sprite.y = i * this.symbolHeight + this.symbolHeight / 2;
      sprite.width = this.symbolWidth;
      sprite.height = this.symbolHeight;
      (sprite as any)._symbolId = symbolId; // store for reference
      this.symbols.push(sprite);
    }
  }

  /**
   * Align the strip so that the middle row is visible.
   * This is called after building or after stopping.
   */
  private alignToCenter(): void {
    const centerRow = Math.floor(this.rowCount / 2);
    const targetY = -centerRow * this.symbolHeight;
    this.strip.y = targetY;
    this.currentY = targetY;
  }

  /**
   * Set the symbols on the strip (for initial state).
   * @param symbolIds - Array of symbol IDs in top-to-bottom order (length = rowCount).
   */
  setSymbols(symbolIds: number[]): void {
    // Update the strip to show exactly these symbols in the visible rows.
    // We'll shift the strip so that the first symbol is at the top.
    // This is a simplified approach – we just replace the visible portion.
    for (let i = 0; i < symbolIds.length && i < this.rowCount; i++) {
      const sprite = this.symbols[i];
      if (sprite) {
        const textureKey = this.symbolMap[symbolIds[i]!];
        if (textureKey) {
          sprite.texture = PIXI.Assets.get(textureKey);
          (sprite as any)._symbolId = symbolIds[i];
        }
      }
    }
    // Reposition strip so these symbols are visible
    this.alignToCenter();
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  setSkipDelay(skip: boolean): void {
    this.skipDelay = skip;
  }

  /**
   * Start spinning this reel.
   */
  spin(): void {
    if (this._isSpinning) return;
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }

    this._isSpinning = true;

    // Determine a random spin duration and distance.
    const duration = (1.5 + Math.random() * 1.0) / this.speedMultiplier;
    const distance = this.totalSymbols * this.symbolHeight * (2 + Math.random() * 3);

    // Animate the strip moving downward (positive y) and then stop.
    // We'll use a "from" tween to create a smooth start.
    const startY = this.strip.y;
    const targetY = startY + distance;

    // Use GSAP to animate y
    this.tween = gsap.to(this.strip, {
      y: targetY,
      duration: duration,
      ease: 'power2.inOut',
      onComplete: () => {
        // The reel will be stopped via `stopAt` – this just finishes the spin phase.
        // We don't set `_isSpinning = false` here because we need to wait for stop.
        this.tween = null;
      },
    });
  }

  /**
   * Stop the reel at the given symbol IDs (top-to-bottom order).
   * @param symbolIds - Array of symbol IDs for the visible rows.
   * @param onComplete - Called when the stop animation finishes.
   */
  stopAt(symbolIds: number[], onComplete?: () => void): void {
    if (!this._isSpinning) {
      // If not spinning, just set the symbols directly.
      this.setSymbols(symbolIds);
      if (onComplete) onComplete();
      return;
    }

    // First, update the texture of the visible symbols to the desired ones.
    for (let i = 0; i < symbolIds.length && i < this.rowCount; i++) {
      const sprite = this.symbols[i];
      if (sprite) {
        const textureKey = this.symbolMap[symbolIds[i]!];
        if (textureKey) {
          sprite.texture = PIXI.Assets.get(textureKey);
          (sprite as any)._symbolId = symbolIds[i];
        }
      }
    }

    const centerRow = Math.floor(this.rowCount / 2);
    const targetY = -centerRow * this.symbolHeight;

    // If there's an ongoing tween, kill it.
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }

    // Animate to the target position.
    const duration = (0.6 + Math.random() * 0.4) / this.speedMultiplier;
    const finalDuration = this.skipDelay ? 0.1 : duration;
    this.tween = gsap.to(this.strip, {
      y: targetY,
      duration: finalDuration,
      ease: 'power4.out',
      onComplete: () => {
        this._isSpinning = false;
        this.currentY = targetY;
        this.tween = null;
        if (onComplete) onComplete();
      },
    });
  }

  /**
   * Set the scale for this reel.
   */
  setScale(scale: number): void {
    this.scale = scale;
    this.container.scale.set(scale, scale);
  }

  /**
   * Check if the reel is currently spinning.
   */
  get isSpinning(): boolean {
    return this._isSpinning;
  }

  /**
   * Destroy the reel.
   */
  destroy(): void {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
    this.container.destroy(true);
  }
}