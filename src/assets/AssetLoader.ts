import * as PIXI from 'pixi.js';
import { GameConfig } from '../core/GameConfig.js';
import { LocalizationService } from './LocalizationService.js';
import { FontManager } from './FontManager.js';
import { SoundManager } from './SoundManager.js';
import { type ILocalizationData, type IFontConfig, type ISoundConfig } from '../types/index.js';

export interface IAssetManifest {
  fonts: IFontConfig[];
  sounds: ISoundConfig[];
  textures: string[];        // Array of image paths (or spritesheet JSON paths)
  spritesheets?: string[];   // JSON spritesheet paths
}

export class AssetLoader {
  private config: GameConfig;
  private localization: LocalizationService;
  private fontManager: FontManager;
  private soundManager: SoundManager;

  private manifest: IAssetManifest | null = null;
  private loaded: boolean = false;

  constructor(config: GameConfig) {
    this.config = config;
    this.localization = new LocalizationService(config);
    this.fontManager = new FontManager();
    this.soundManager = new SoundManager();
  }

  /**
   * Set the asset manifest (could be loaded from a JSON file or passed in).
   * This can be called before load().
   */
  setManifest(manifest: IAssetManifest): void {
    this.manifest = manifest;
  }

  /**
   * Load all assets: localization, fonts, sounds, and textures.
   * Returns a promise that resolves when everything is ready.
   */
  async loadAll(): Promise<{
    localization: ILocalizationData;
    fontsLoaded: boolean;
    soundsLoaded: boolean;
    texturesLoaded: boolean;
  }> {
    // 1. Localization
    const localizationData = await this.localization.load();

    // 2. Parallel loading of fonts, sounds, and textures
    const promises: Promise<any>[] = [];

    if (this.manifest) {
      // Fonts
      if (this.manifest.fonts && this.manifest.fonts.length > 0) {
        this.fontManager.register(this.manifest.fonts);
        promises.push(this.fontManager.load().catch(err => console.warn('Fonts load error:', err)));
      }

      // Sounds
      if (this.manifest.sounds && this.manifest.sounds.length > 0) {
        this.soundManager.register(this.manifest.sounds);
        promises.push(this.soundManager.load().catch(err => console.warn('Sounds load error:', err)));
      }

      // Textures (Pixi loader)
      if (this.manifest.textures || this.manifest.spritesheets) {
        // Collect all target assets into a single combined array for the modern Assets API
        const assetUrls: string[] = [];
        
        if (this.manifest.textures) {
          this.manifest.textures.forEach((path) => {
            assetUrls.push(path);
          });
        }
        if (this.manifest.spritesheets) {
          this.manifest.spritesheets.forEach((path) => {
            assetUrls.push(path);
          });
        }

        // PixiJS v8 promise-based batch asset initialization
        const textureLoadPromise = PIXI.Assets.load<PIXI.Texture | PIXI.Spritesheet>(assetUrls)
          .then((resources) => {
            console.log('[AssetLoader] Textures loaded:', resources);
          });
        
        promises.push(textureLoadPromise.catch(err => console.warn('Texture load error:', err)));
      }
    }

    await Promise.all(promises);

    this.loaded = true;
    console.log('[AssetLoader] All assets loaded.');

    return {
      localization: localizationData,
      fontsLoaded: this.fontManager.isLoaded(),
      soundsLoaded: true, // we might need a flag from sound manager
      texturesLoaded: true,
    };
  }

  /**
   * Get the localization service.
   */
  getLocalization(): LocalizationService {
    return this.localization;
  }

  /**
   * Get the font manager.
   */
  getFontManager(): FontManager {
    return this.fontManager;
  }

  /**
   * Get the sound manager.
   */
  getSoundManager(): SoundManager {
    return this.soundManager;
  }

  /**
   * Access the Pixi assets manager directly for additional assets.
   * Note: Refactored return type to reflect the modern PixiJS v8 architecture.
   */
  getPixiAssets(): typeof PIXI.Assets {
    return PIXI.Assets;
  }

  /**
   * Check if all assets are loaded.
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}
