import * as PIXI from 'pixi.js';
import { UIFactory } from './UIFactory.js';
import { GameState } from '../core/GameState.js';
import { GameConfig } from '../core/GameConfig.js';
import { GameEvents } from '../events/GameEvents.js';
import { LocalizationService } from '../assets/LocalizationService.js';
import { SoundManager } from '../assets/SoundManager.js';

export class SettingsPanel {
  private container: PIXI.Container & { destroy: () => void };
  private state: GameState;
  private config: GameConfig;
  private events: GameEvents;
  private localization: LocalizationService;
  private soundManager: SoundManager;

  private musicToggle: PIXI.Text & { destroy: () => void };
  private sfxToggle: PIXI.Text & { destroy: () => void };
  private languageSelector?: PIXI.Text & { destroy: () => void };

  private visible: boolean = false;
  private cleanupListeners: (() => void)[] = [];

  constructor(
    parent: PIXI.Container,
    state: GameState,
    config: GameConfig,
    events: GameEvents,
    localization: LocalizationService,
    soundManager: SoundManager
  ) {
    this.state = state;
    this.config = config;
    this.events = events;
    this.localization = localization;
    this.soundManager = soundManager;

    // Main container (hidden by default)
    this.container = UIFactory.createContainer(parent);
    this.container.visible = false;

    // Background
    const bg = UIFactory.createRoundedRect(500, 400, 20, 0x1a1a2e, 0x444466, 2, this.container);
    bg.alpha = 0.95;

    // Title
    const title = UIFactory.createText(
      this.localization.get('settings_title', true),
      {
        fontSize: 28,
        fontFamily: 'Arial',
        fill: 0xffd700,
        fontWeight: 'bold',
        align: 'center',
      },
      this.container
    );
    title.x = 0;
    title.y = -160;

    // Close button
    const closeBtn = UIFactory.createText('✕', {
      fontSize: 30,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    closeBtn.x = 220;
    closeBtn.y = -170;
    closeBtn.interactive = true;
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', () => {
      this.hide();
    });

    let yOffset = -100;

    // Music toggle
    const musicLabel = UIFactory.createText(
      this.localization.get('settings_music', true) || 'Music',
      {
        fontSize: 18,
        fontFamily: 'Arial',
        fill: 0xffffff,
        align: 'left',
      },
      this.container
    );
    musicLabel.x = -180;
    musicLabel.y = yOffset;

    this.musicToggle = UIFactory.createText(
      this.soundManager.getState().musicEnabled ? 'ON' : 'OFF',
      {
        fontSize: 18,
        fontFamily: 'Arial',
        fill: this.soundManager.getState().musicEnabled ? 0x00ff88 : 0xff4444,
        fontWeight: 'bold',
        align: 'right',
      },
      this.container
    );
    this.musicToggle.x = 180;
    this.musicToggle.y = yOffset;
    this.musicToggle.anchor.set(1, 0.5);
    this.musicToggle.interactive = true;
    this.musicToggle.cursor = 'pointer';
    this.musicToggle.on('pointerdown', () => {
      this.toggleMusic();
    });

    yOffset += 50;

    // SFX toggle
    const sfxLabel = UIFactory.createText(
      this.localization.get('settings_sfx', true) || 'Sound FX',
      {
        fontSize: 18,
        fontFamily: 'Arial',
        fill: 0xffffff,
        align: 'left',
      },
      this.container
    );
    sfxLabel.x = -180;
    sfxLabel.y = yOffset;

    this.sfxToggle = UIFactory.createText(
      this.soundManager.getState().sfxEnabled ? 'ON' : 'OFF',
      {
        fontSize: 18,
        fontFamily: 'Arial',
        fill: this.soundManager.getState().sfxEnabled ? 0x00ff88 : 0xff4444,
        fontWeight: 'bold',
        align: 'right',
      },
      this.container
    );
    this.sfxToggle.x = 180;
    this.sfxToggle.y = yOffset;
    this.sfxToggle.anchor.set(1, 0.5);
    this.sfxToggle.interactive = true;
    this.sfxToggle.cursor = 'pointer';
    this.sfxToggle.on('pointerdown', () => {
      this.toggleSfx();
    });

    yOffset += 50;

    // Language selector (if multiple languages available)
    const availableLangs = Object.keys(this.localization.getData());
    if (availableLangs.length > 1) {
      const langLabel = UIFactory.createText(
        this.localization.get('settings_language', true) || 'Language',
        {
          fontSize: 18,
          fontFamily: 'Arial',
          fill: 0xffffff,
          align: 'left',
        },
        this.container
      );
      langLabel.x = -180;
      langLabel.y = yOffset;

      this.languageSelector = UIFactory.createText(
        this.config.locale.toUpperCase(),
        {
          fontSize: 18,
          fontFamily: 'Arial',
          fill: 0x88ddff,
          fontWeight: 'bold',
          align: 'right',
        },
        this.container
      );
      this.languageSelector.x = 180;
      this.languageSelector.y = yOffset;
      this.languageSelector.anchor.set(1, 0.5);
      this.languageSelector.interactive = true;
      this.languageSelector.cursor = 'pointer';
      this.languageSelector.on('pointerdown', () => {
        this.cycleLanguage();
      });
    }
  }

  /**
   * Toggle music on/off.
   */
  private toggleMusic(): void {
    const state = this.soundManager.getState();
    this.soundManager.setMusicEnabled(!state.musicEnabled);
    const newState = this.soundManager.getState();
    this.musicToggle.text = newState.musicEnabled ? 'ON' : 'OFF';
    this.musicToggle.style.fill = newState.musicEnabled ? 0x00ff88 : 0xff4444;
  }

  /**
   * Toggle SFX on/off.
   */
  private toggleSfx(): void {
    const state = this.soundManager.getState();
    this.soundManager.setSfxEnabled(!state.sfxEnabled);
    const newState = this.soundManager.getState();
    this.sfxToggle.text = newState.sfxEnabled ? 'ON' : 'OFF';
    this.sfxToggle.style.fill = newState.sfxEnabled ? 0x00ff88 : 0xff4444;
  }

  /**
   * Cycle through available languages.
   */
  private cycleLanguage(): void {
    const availableLangs = Object.keys(this.localization.getData());
    if (availableLangs.length <= 1) return;
  
    const currentIndex = availableLangs.indexOf(this.config.locale);
    const nextIndex = (currentIndex + 1) % availableLangs.length;
    const newLang = availableLangs[nextIndex]!;
  
    this.config.locale = newLang;
  
    // Safe navigation update
    if (this.languageSelector) {
      this.languageSelector.text = newLang.toUpperCase();
    }
  
    this.events.emit('language:changed', { locale: newLang });
  }

  /**
   * Show the settings panel.
   */
  show(): void {
    this.container.visible = true;
    this.visible = true;
  }

  /**
   * Hide the settings panel.
   */
  hide(): void {
    this.container.visible = false;
    this.visible = false;
  }

  /**
   * Toggle the settings panel.
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy the settings panel.
   */
  destroy(): void {
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
    this.container.destroy(true);
  }
}