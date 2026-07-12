import { Howl, Howler } from 'howler';
import { type ISoundConfig, type ISoundState } from '../types/index.js';

export class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private configs: ISoundConfig[] = [];
  private state: ISoundState = {
    musicEnabled: true,
    sfxEnabled: true,
    currentMusicId: null,
  };

  constructor() {
    // Note: Howler internally auto-unlocks iOS/Android audio contexts on the first tap gesture.
    // Manual Audio element instantiation and user agent hacking are no longer required.
  }

  /**
   * Register sound configurations.
   */
  register(sounds: ISoundConfig[]): void {
    this.configs = sounds;
  }

  /**
   * Load all registered sounds using Howler.
   * Returns a promise that resolves when all sounds are loaded.
   */
  async load(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const cfg of this.configs) {
      const promise = new Promise<void>((resolve, reject) => {
        const howl = new Howl({
          src: [`${cfg.src}.mp3`],
          loop: cfg.loop || false,
          volume: cfg.volume || 1.0,
          onload: () => {
            this.sounds.set(cfg.id, howl);
            resolve();
          },
          // Fixed signature error constraint mapping for Howler callbacks
          onloaderror: (soundId, errorId) => {
            console.warn(`[SoundManager] Failed to load sound: ${cfg.id}`, errorId);
            reject(new Error(String(errorId || soundId)));
          },
        });
      });
      loadPromises.push(promise);
    }

    try {
      await Promise.all(loadPromises);
      console.log('[SoundManager] All sounds loaded.');
    } catch (error) {
      console.error('[SoundManager] Some sounds failed to load:', error);
    }
  }

  /**
   * Play a sound by id.
   */
  play(id: string, fadeIn?: number): void {
    const howl = this.sounds.get(id);
    if (!howl) {
      console.warn(`[SoundManager] Sound not found: ${id}`);
      return;
    }

    // Check if muted by category
    const cfg = this.configs.find(c => c.id === id);
    if (cfg?.music && !this.state.musicEnabled) return;
    if (!cfg?.music && !this.state.sfxEnabled) return;

    if (fadeIn) {
      // Corrected getter lookup for current volume boundaries safely
      const targetVolume = howl.volume();
      howl.fade(0, targetVolume, fadeIn);
    }
    
    // Explicit track state assignment tracking for music engines
    if (cfg?.music) {
      this.state.currentMusicId = id;
    }

    howl.play();
  }

  /**
   * Stop a sound by id.
   */
  stop(id: string, fadeOut?: number): void {
    const howl = this.sounds.get(id);
    if (!howl) return;
    
    if (fadeOut) {
      howl.fade(howl.volume(), 0, fadeOut);
      // Clean resource disposal handling using explicit timeout callbacks
      setTimeout(() => howl.stop(), fadeOut + 50);
    } else {
      howl.stop();
    }
  }

  /**
   * Pause all active library audio pipelines (ideal for tab visibility / page blur hooks).
   */
  pauseAll(): void {
    // Correct approach to global volume state modification in Howler
    // Using mute retains context state cleanly without breaking browser hardware bindings
    Howler.mute(true);
  }

  /**
   * Resume all audio pipelines.
   */
  resumeAll(): void {
    Howler.mute(false);
  }

  /**
   * Mute or unmute music category.
   */
  setMusicEnabled(enabled: boolean): void {
    this.state.musicEnabled = enabled;
    for (const cfg of this.configs) {
      if (cfg.music) {
        const howl = this.sounds.get(cfg.id);
        if (howl) {
          howl.mute(!enabled);
        }
      }
    }
  }

  /**
   * Mute or unmute SFX category.
   */
  setSfxEnabled(enabled: boolean): void {
    this.state.sfxEnabled = enabled;
    for (const cfg of this.configs) {
      if (!cfg.music) {
        const howl = this.sounds.get(cfg.id);
        if (howl) {
          howl.mute(!enabled);
        }
      }
    }
  }

  /**
   * Set global engine volume.
   */
  setVolume(vol: number): void {
    Howler.volume(Math.min(1, Math.max(0, vol)));
  }

  /**
   * Get the current state replica safely.
   */
  getState(): ISoundState {
    return { ...this.state };
  }
}
