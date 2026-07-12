import * as PIXI from 'pixi.js';
import { UIFactory } from './UIFactory.js';
import { GameConfig } from '../core/GameConfig.js';
import { type SymbolMap } from '../types/index.js';
import { LocalizationService } from '../assets/LocalizationService.js';

export interface IPaytableConfig {
  /** Symbol map for rendering symbols */
  symbolMap: SymbolMap;
  /** Paytable data: { symbolId: { "x1": multiplier, "x2": multiplier, ... } } */
  paytableData: Record<number, Record<string, number>>;
  /** Line patterns (if available) */
  linePatterns?: number[][];
  /** Container size for the paytable */
  width?: number;
  height?: number;
}

export class PaytableRenderer {
  private container: PIXI.Container & { destroy: () => void };
  private config: IPaytableConfig;
  private localization: LocalizationService;
  private scale: number = 1;

  constructor(
    parent: PIXI.Container,
    config: IPaytableConfig,
    localization: LocalizationService
  ) {
    this.config = config;
    this.localization = localization;

    // Create main container (hidden by default)
    this.container = UIFactory.createContainer(parent);
    this.container.visible = false;

    // Build the paytable content
    this.build();
  }

  /**
   * Build the paytable layout.
   * This is a simplified version – you can customize based on your needs.
   */
  private build(): void {
    const symbolMap = this.config.symbolMap;
    const paytableData = this.config.paytableData;

    // Background
    const bg = UIFactory.createRoundedRect(600, 700, 20, 0x1a1a2e, 0x444466, 2, this.container);
    bg.alpha = 0.95;

    // Title
    const title = UIFactory.createText(
      this.localization.get('paytable_title', true),
      {
        fontSize: 32,
        fontFamily: 'Arial',
        fill: 0xffd700,
        fontWeight: 'bold',
        align: 'center',
      },
      this.container
    );
    title.x = 0;
    title.y = -300;

    // Close button (simple cross)
    const closeBtn = UIFactory.createText('✕', {
      fontSize: 30,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    closeBtn.x = 270;
    closeBtn.y = -310;
    closeBtn.interactive = true;
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', () => {
      this.hide();
    });

    // Build symbol rows
    let yOffset = -220;
    const stepY = 60;
    const maxRows = 10;

    // Get sorted symbol IDs
    const symbolIds = Object.keys(symbolMap).map(Number).sort((a, b) => a - b);

    for (const symbolId of symbolIds) {
      if (symbolIds.indexOf(symbolId) >= maxRows) break;

      const textureKey = symbolMap[symbolId];
      if (!textureKey) continue;

      // Symbol sprite
      const sprite = UIFactory.createSprite(textureKey, {
        anchor: { x: 0.5, y: 0.5 },
        scale: { x: 1, y: 1 },
      }, this.container);
      sprite.x = -220;
      sprite.y = yOffset;
      sprite.width = 40;
      sprite.height = 40;

      // Symbol name (from localization)
      const nameKey = `symbol_${symbolId}`;
      const nameText = this.localization.get(nameKey, true);
      const nameLabel = UIFactory.createText(nameText, {
        fontSize: 16,
        fontFamily: 'Arial',
        fill: 0xffffff,
        align: 'left',
      }, this.container);
      nameLabel.x = -170;
      nameLabel.y = yOffset - 8;

      // Multipliers (e.g., "x1: 10", "x2: 50", "x3: 200")
      const multipliers = paytableData[symbolId];
      let multStr = '';
      if (multipliers) {
        const entries = Object.entries(multipliers).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        multStr = entries.map(([key, val]) => `${key}: ${val}`).join('  ');
      } else {
        multStr = '—';
      }

      const multLabel = UIFactory.createText(multStr, {
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 0x88ddff,
        align: 'right',
      }, this.container);
      multLabel.x = 220;
      multLabel.y = yOffset - 6;
      multLabel.anchor.set(1, 0.5);

      yOffset += stepY;
    }

    // If line patterns are available, render them
    if (this.config.linePatterns && this.config.linePatterns.length > 0) {
      const lineTitle = UIFactory.createText(
        this.localization.get('paytable_lines', true),
        {
          fontSize: 20,
          fontFamily: 'Arial',
          fill: 0xffd700,
          align: 'center',
        },
        this.container
      );
      lineTitle.x = 0;
      lineTitle.y = yOffset + 20;

      // Simplified line rendering (you can expand this)
      // ...
    }
  }

  /**
   * Show the paytable.
   */
  show(): void {
    this.container.visible = true;
    this.container.alpha = 1;
  }

  /**
   * Hide the paytable.
   */
  hide(): void {
    this.container.visible = false;
  }

  /**
   * Toggle the paytable visibility.
   */
  toggle(): void {
    this.container.visible = !this.container.visible;
  }

  /**
   * Destroy the paytable.
   */
  destroy(): void {
    this.container.destroy(true);
  }
}