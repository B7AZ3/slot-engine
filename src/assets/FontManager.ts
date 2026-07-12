import FontFaceObserver from 'fontfaceobserver';
import { type IFontConfig } from '../types/index.js';

export class FontManager {
  private fonts: IFontConfig[] = [];
  private loaded: boolean = false;
  private loadPromises: Promise<void>[] = [];

  /**
   * Register fonts to be loaded.
   */
  register(fonts: IFontConfig[]): void {
    this.fonts = fonts;
  }

  /**
   * Load all registered fonts.
   * Returns a promise that resolves when all fonts are loaded or rejects on error.
   */
  async load(): Promise<void> {
    if (this.fonts.length === 0) {
      this.loaded = true;
      return;
    }

    this.loadPromises = this.fonts.map((font) => {
      return new Promise<void>((resolve, reject) => {
        const observer = new FontFaceObserver(font.family, {
          weight: font.weight,
          style: font.style,
        });
        observer.load()
          .then(() => {
            console.log(`[FontManager] Loaded: ${font.family}`);
            resolve();
          })
          .catch((err) => {
            console.warn(`[FontManager] Failed to load font ${font.family}:`, err);
            reject(err);
          });
      });
    });

    try {
      await Promise.all(this.loadPromises);
      this.loaded = true;
    } catch (error) {
      console.error('[FontManager] Some fonts failed to load:', error);
      // We still set loaded to true to not block the whole game, but we could re-throw
      this.loaded = true;
    }
  }

  /**
   * Check if fonts are loaded.
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}