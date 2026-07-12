import * as PIXI from 'pixi.js';
import { UIFactory } from './UIFactory.js';
import { GameEvents } from '../events/GameEvents.js';
import { LocalizationService } from '../assets/LocalizationService.js';
import { type SymbolMap } from '../types/index.js';

export interface IHistoryEntry {
  time: string;
  bet: number;
  win: number;
  balance: number;
  result: number[][]; // reel symbols
}

export class HistoryRenderer {
  private container: PIXI.Container & { destroy: () => void };
  private entriesContainer: PIXI.Container & { destroy: () => void };
  private events: GameEvents;
  private localization: LocalizationService;
  private symbolMap: SymbolMap;
  private scale: number = 1;
  private historyData: IHistoryEntry[] = [];
  private visible: boolean = false;
  private cleanupListeners: (() => void)[] = [];

  constructor(
    parent: PIXI.Container,
    events: GameEvents,
    localization: LocalizationService,
    symbolMap: SymbolMap
  ) {
    this.events = events;
    this.localization = localization;
    this.symbolMap = symbolMap;

    // Main container (hidden by default)
    this.container = UIFactory.createContainer(parent);
    this.container.visible = false;

    // Background
    const bg = UIFactory.createRoundedRect(700, 600, 20, 0x1a1a2e, 0x444466, 2, this.container);
    bg.alpha = 0.95;

    // Title
    const title = UIFactory.createText(
      this.localization.get('history_title', true),
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
    title.y = -260;

    // Close button
    const closeBtn = UIFactory.createText('✕', {
      fontSize: 30,
      fontFamily: 'Arial',
      fill: 0xffffff,
      align: 'center',
    }, this.container);
    closeBtn.x = 320;
    closeBtn.y = -270;
    closeBtn.interactive = true;
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', () => {
      this.hide();
    });

    // Entries container (scrollable area)
    this.entriesContainer = UIFactory.createContainer(this.container);
    this.entriesContainer.y = -200;

    // Mask for entries
    const mask = UIFactory.createRect(600, 380, 0xffffff, undefined, 0, this.entriesContainer);
    mask.x = 0;
    mask.y = 20;
    this.entriesContainer.mask = mask;

    // Listen for history data
    const historyCleanup = this.events.on('history:data', (data) => {
      this.updateHistory(data);
    });
    this.cleanupListeners.push(historyCleanup);

    // Initially empty
    this.renderEntries();
  }

  /**
   * Update history data and re-render.
   */
  updateHistory(data: any): void {
    // Parse the data – this depends on your backend format
    // For now, assume data is an array of entries
    if (Array.isArray(data)) {
      this.historyData = data.map((entry) => ({
        time: entry.time || new Date().toLocaleTimeString(),
        bet: entry.bet || 0,
        win: entry.win || 0,
        balance: entry.balance || 0,
        result: entry.result || [],
      }));
    } else if (data && data.entries) {
      this.historyData = data.entries;
    } else {
      this.historyData = [];
    }
    this.renderEntries();
  }

  /**
   * Render the history entries.
   */
  private renderEntries(): void {
    // Clear existing entries
    while (this.entriesContainer.children.length > 1) {
      const child = this.entriesContainer.children[1];
      if (child && (child as any).destroy) {
        (child as any).destroy(true);
      } else {
        this.entriesContainer.removeChild(child);
      }
    }

    if (this.historyData.length === 0) {
      const emptyText = UIFactory.createText(
        this.localization.get('history_empty', true) || 'No history yet.',
        {
          fontSize: 18,
          fontFamily: 'Arial',
          fill: 0x888888,
          align: 'center',
        },
        this.entriesContainer
      );
      emptyText.x = 0;
      emptyText.y = 50;
      return;
    }

    // Show last 20 entries
    const entriesToShow = this.historyData.slice(-20);
    let yOffset = 20;

    for (const entry of entriesToShow) {
      // Entry background (alternating)
      const bg = UIFactory.createRect(560, 30, yOffset % 60 === 20 ? 0x222244 : 0x1a1a2e, undefined, 0, this.entriesContainer);
      bg.x = 0;
      bg.y = yOffset;

      // Time
      const timeText = UIFactory.createText(entry.time || '--', {
        fontSize: 12,
        fontFamily: 'Arial',
        fill: 0x8888aa,
        align: 'left',
      }, this.entriesContainer);
      timeText.x = -260;
      timeText.y = yOffset + 5;

      // Bet
      const betText = UIFactory.createText(`Bet: ${entry.bet.toFixed(2)}`, {
        fontSize: 12,
        fontFamily: 'Arial',
        fill: 0xcccccc,
        align: 'left',
      }, this.entriesContainer);
      betText.x = -150;
      betText.y = yOffset + 5;

      // Win
      const winColor = entry.win > 0 ? 0x00ff88 : 0x888888;
      const winText = UIFactory.createText(`+${entry.win.toFixed(2)}`, {
        fontSize: 12,
        fontFamily: 'Arial',
        fill: winColor,
        fontWeight: entry.win > 0 ? 'bold' : 'normal',
        align: 'left',
      }, this.entriesContainer);
      winText.x = -50;
      winText.y = yOffset + 5;

      // Small symbols (up to 3 reels preview)
      if (entry.result && entry.result.length > 0) {
        const preview = entry.result[0];
        if (preview && preview.length > 0) {
          for (let i = 0; i < Math.min(preview.length, 3); i++) {
            const symbolId = preview[i];
            const textureKey = this.symbolMap[symbolId!] || 'symbol_0';
            const sprite = UIFactory.createSprite(textureKey, {
              anchor: { x: 0.5, y: 0.5 },
              scale: { x: 0.3, y: 0.3 },
            }, this.entriesContainer);
            sprite.x = 100 + i * 25;
            sprite.y = yOffset + 15;
          }
        }
      }

      yOffset += 30;
    }

    // Adjust container height
    this.entriesContainer.y = -200;
  }

  /**
   * Show the history panel.
   */
  show(): void {
    this.container.visible = true;
    this.visible = true;
    // Refresh data if needed
    this.events.emit('history:request', {});
  }

  /**
   * Hide the history panel.
   */
  hide(): void {
    this.container.visible = false;
    this.visible = false;
  }

  /**
   * Toggle the history panel.
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy the history panel.
   */
  destroy(): void {
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
    this.container.destroy(true);
  }
}