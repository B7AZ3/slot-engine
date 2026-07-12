import * as PIXI from 'pixi.js';
import { type IResizeable } from '../types/index.js';
import { GameConfig } from '../core/GameConfig.js';

export class Renderer {
  private app: PIXI.Application;
  private config: GameConfig;
  private resizeables: Set<IResizeable> = new Set();
  private _scale: number = 1;
  private _width: number = 0;
  private _height: number = 0;

  constructor(config: GameConfig, container: HTMLElement) {
    this.config = config;

    // Create Pixi Application
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio || 1,
      antialias: true,
      autoDensity: true,
      backgroundColor: 0x0a0a1a,
      resizeTo: window, // Automatically resize to window
    });

    // Mount the canvas to the provided container
    container.appendChild(this.app.canvas);

    // Store initial dimensions
    this._width = this.app.screen.width;
    this._height = this.app.screen.height;

    // Listen to window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Get the Pixi application instance.
   */
  getApplication(): PIXI.Application {
    return this.app;
  }

  /**
   * Get the root stage.
   */
  getStage(): PIXI.Container {
    return this.app.stage;
  }

  /**
   * Get the current scale factor (relative to a reference size, e.g., 1080p).
   * This is used to scale UI elements consistently across resolutions.
   */
  get scale(): number {
    return this._scale;
  }

  /**
   * Get the current viewport width.
   */
  get width(): number {
    return this._width;
  }

  /**
   * Get the current viewport height.
   */
  get height(): number {
    return this._height;
  }

  /**
   * Register a resizeable object.
   * It will be notified on every resize.
   */
  registerResizeable(obj: IResizeable): void {
    this.resizeables.add(obj);
    // Immediately notify with current dimensions
    obj.onResize(this._width, this._height, this._scale);
  }

  /**
   * Unregister a resizeable object.
   */
  unregisterResizeable(obj: IResizeable): void {
    this.resizeables.delete(obj);
  }

  /**
   * Destroy the renderer and clean up.
   */
  destroy(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.app.destroy(true, { children: true, texture: true });
    this.resizeables.clear();
  }

  private onWindowResize(): void {
    this._width = this.app.screen.width;
    this._height = this.app.screen.height;

    // Compute scale relative to a reference height of 1080px
    // This is a typical slot game baseline
    const referenceHeight = 1080;
    const scaleX = this._width / (referenceHeight * (16 / 9));
    const scaleY = this._height / referenceHeight;
    this._scale = Math.min(scaleX, scaleY);

    // Notify all resizeable objects
    for (const obj of this.resizeables) {
      obj.onResize(this._width, this._height, this._scale);
    }
  }
}