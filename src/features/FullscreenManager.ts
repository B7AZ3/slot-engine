import { GameEvents } from '../events/GameEvents.js';

export interface IFullscreenManagerOptions {
  events: GameEvents;
  /** Element to make fullscreen (default: document.documentElement) */
  element?: HTMLElement;
}

/**
 * Manages fullscreen API with vendor prefix handling.
 * Emits events on fullscreen change.
 */
export class FullscreenManager {
  private events: GameEvents;
  private element: HTMLElement;
  private isFullscreen: boolean = false;
  private fullscreenChangeHandler: () => void;

  constructor(options: IFullscreenManagerOptions) {
    this.events = options.events;
    this.element = options.element || document.documentElement;

    // Bind handler
    this.fullscreenChangeHandler = this.onFullscreenChange.bind(this);

    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  /**
   * Check if fullscreen is currently active.
   */
  isActive(): boolean {
    return this.isFullscreen;
  }

  /**
   * Check if fullscreen is supported in this browser.
   */
  isSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  /**
   * Enter fullscreen mode.
   * @returns Promise that resolves when fullscreen is entered.
   */
  async enter(): Promise<void> {
    if (this.isFullscreen) return;
    if (!this.isSupported()) {
      console.warn('[FullscreenManager] Fullscreen not supported.');
      return;
    }

    try {
      const el = this.element as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      // The 'fullscreenchange' event will update isFullscreen
    } catch (err) {
      console.error('[FullscreenManager] Failed to enter fullscreen:', err);
      throw err;
    }
  }

  /**
   * Exit fullscreen mode.
   * @returns Promise that resolves when fullscreen is exited.
   */
  async exit(): Promise<void> {
    if (!this.isFullscreen) return;

    try {
      const doc = document as any;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.error('[FullscreenManager] Failed to exit fullscreen:', err);
      throw err;
    }
  }

  /**
   * Toggle fullscreen mode.
   * @returns Promise that resolves after toggle.
   */
  async toggle(): Promise<void> {
    if (this.isFullscreen) {
      await this.exit();
    } else {
      await this.enter();
    }
  }

  /**
   * Destroy the manager – clean up event listeners.
   */
  destroy(): void {
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  private onFullscreenChange(): void {
    const doc = document as any;
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    this.isFullscreen = isFull;
    this.events.emit('fullscreen:changed', { isFullscreen: isFull });
  }
}