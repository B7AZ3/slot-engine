import * as PIXI from 'pixi.js';
import { GameConfig } from '../core/GameConfig.js';
import { GameState } from '../core/GameState.js';
import { Renderer } from '../rendering/Renderer.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { WebSocketClient } from '../network/WebSocketClient.js';
import { MessageHandler } from '../network/MessageHandler.js';
import { type IPlatformBridge, type IWebSocketMessage, type ISpinRequest, type ISpinResponse, type SymbolMap } from '../types/index.js';
import { GameEvents } from '../events/GameEvents.js';
import { ReelRenderer } from '../rendering/ReelRenderer.js';
import { UIManager } from '../rendering/UIManager.js';
import { LoadingScreen } from '../rendering/LoadingScreen.js';
import { PaytableRenderer } from '../rendering/PaytableRenderer.js';
import { HistoryRenderer } from '../rendering/HistoryRenderer.js';
import { SettingsPanel } from '../rendering/SettingsPanel.js';
import { BonusController } from './BonusController.js';
import { SessionTimer } from '../features/SessionTimer.js';
import { AutoplayManager } from '../features/AutoplayManager.js';
import { FastSpinManager } from '../features/FastSpinManager.js';
import { AutoplayControls } from '../rendering/AutoplayControls.js';
import { FullscreenManager } from '../features/FullscreenManager.js';
import { LogoAnimator } from '../rendering/LogoAnimator.js';


export interface IGameControllerOptions {
  config: GameConfig;
  container: HTMLElement;
  platformBridge: IPlatformBridge;
  assetManifest?: any; // IAssetManifest from AssetLoader
  symbolMap: SymbolMap;
  paytableData: Record<number, Record<string, number>>;
}

/**
 * Main game controller.
 * Orchestrates the boot sequence, spin flow, and state management.
 */
export class GameController {
  private config: GameConfig;
  private state: GameState;
  private renderer: Renderer;
  private assetLoader: AssetLoader;
  private wsClient: WebSocketClient | null = null;
  private messageHandler: MessageHandler;
  private platformBridge: IPlatformBridge;
  private events: GameEvents;
  private bonusController: BonusController;
  private autoplayManager: AutoplayManager;
  private autoplayControls: AutoplayControls;
  private fastSpinManager: FastSpinManager;
  private fullscreenManager: FullscreenManager;
  private logoAnimator: LogoAnimator;

  // UI Components
  private loadingScreen: LoadingScreen;
  private reelRenderer: ReelRenderer;
  private uiManager: UIManager;
  private paytableRenderer: PaytableRenderer;
  private historyRenderer: HistoryRenderer;
  private settingsPanel: SettingsPanel;
  private sessionTimer: SessionTimer;

  private bootComplete: boolean = false;
  private isReady: boolean = false;
  private mainUIContainer: PIXI.Container;

  // Cleanup functions for registered handlers
  private handlerCleanups: (() => void)[] = [];
  private eventCleanups: (() => void)[] = [];

  constructor(options: IGameControllerOptions) {
    this.config = options.config;
    this.state = new GameState();
    this.platformBridge = options.platformBridge;
    this.events = new GameEvents();

    // Initialize renderer
    this.renderer = new Renderer(this.config, options.container);

    // Initialize asset loader
    this.assetLoader = new AssetLoader(this.config);
    if (options.assetManifest) {
      this.assetLoader.setManifest(options.assetManifest);
    }

    // Initialize message handler
    this.messageHandler = new MessageHandler();

    // Initialize bonus controller
    this.bonusController = new BonusController(this.state, this.events);

    // Get the Pixi stage
    const stage = this.renderer.getStage();

    // Main UI container (all UI elements go here)
    this.mainUIContainer = new PIXI.Container();
    stage.addChild(this.mainUIContainer);

    // --- Initialize UI Components ---
    this.loadingScreen = new LoadingScreen(this.mainUIContainer, this.events);

    // Reel renderer (using symbol map and default config)
    const reelConfig = {
      reelCount: this.config.reelCount || 5,
      rowCount: this.config.rowCount || 3,
      symbolHeight: 100,
      symbolWidth: 80,
      spacing: 5,
      stripLength: 30,
    };
    this.reelRenderer = new ReelRenderer(
      this.mainUIContainer,
      reelConfig,
      options.symbolMap
    );

    // UIManager (balance, bet controls, spin button, win popup)
    this.uiManager = new UIManager({
      config: this.config,
      state: this.state,
      events: this.events,
      container: this.mainUIContainer,
      uiConfig: {
        currencySymbol: this.config.currencySymbol,
        decimalSeparator: this.config.decimalSeparator,
        thousandSeparator: this.config.thousandSeparator,
        minDecimalPlaces: this.config.minDecimalPlaces,
      },
    });

    // Paytable renderer
    this.paytableRenderer = new PaytableRenderer(
      this.mainUIContainer,
      {
        symbolMap: options.symbolMap,
        paytableData: options.paytableData,
      },
      this.assetLoader.getLocalization()
    );

    // History renderer
    this.historyRenderer = new HistoryRenderer(
      this.mainUIContainer,
      this.events,
      this.assetLoader.getLocalization(),
      options.symbolMap
    );

    // Initialize Session Timer
    this.sessionTimer = new SessionTimer({
      state: this.state,
      events: this.events,
      platform: this.platformBridge,
      localization: this.assetLoader.getLocalization()
    });

    // Settings panel
    this.settingsPanel = new SettingsPanel(
      this.mainUIContainer,
      this.state,
      this.config,
      this.events,
      this.assetLoader.getLocalization(),
      this.assetLoader.getSoundManager(),
      this.sessionTimer
    );

    // --- Autoplay & Fast Spin ---
    this.autoplayControls = new AutoplayControls(this.mainUIContainer, this.events);
    this.autoplayControls.setPosition(0, 160); // below spin button

    // FastSpinManager
    this.fastSpinManager = new FastSpinManager({
      events: this.events,
      onSpeedChange: (speed) => {
        this.reelRenderer.setSpeedMultiplier(speed);
      },
      onSkipWinAnimations: (skip) => {
        this.events.emit('fastspin:skipWinAnimations', { skip });
      },
      onSkipReelDelay: (skip) => {
        this.reelRenderer.setSkipDelay(skip);
      },
    });

    // AutoplayManager
    this.autoplayManager = new AutoplayManager({
      state: this.state,
      events: this.events,
      spinCallback: () => {
        // Trigger a spin (same as normal spin)
        this.spin();
      },
      fastSpinCallback: (enabled) => {
        if (enabled) {
          this.fastSpinManager.enable();
        } else {
          this.fastSpinManager.disable();
        }
      },
      config: {
        rounds: 10,
        stopOnWin: 0,
        stopOnBalanceBelow: 0,
        stopOnBonus: true,
        fastSpin: false,
      },
    });

    // Fullscreen Manager
    this.fullscreenManager = new FullscreenManager({
      events: this.events,
      element: document.documentElement, // or the game container element
    });
    const fullscreenToggleCleanup = this.events.on('ui:toggleFullscreen', async () => {
      await this.fullscreenManager.toggle();
    });
    this.eventCleanups.push(fullscreenToggleCleanup);

    // Start the session tracking immediately
    this.sessionTimer.start();

    // Register message handlers
    this.registerMessageHandlers();

    // Wire up UI events
    this.wireUIEvents();

    // Register resizeables
    this.renderer.registerResizeable(this.reelRenderer);
    this.renderer.registerResizeable(this.uiManager);

    // Set initial state of UI
    this.uiManager.onResize(window.innerWidth, window.innerHeight, 1);

    // Start the game
    this.start().catch(err => {
      console.error('[GameController] Startup error:', err);
      this.platformBridge.showPopup(
        'Error',
        'Failed to start the game. Please try again.',
        [{ label: 'Retry', action: () => this.start() }]
      );
    });

    // --- Logo Animation ---
    this.logoAnimator = new LogoAnimator(
      this.mainUIContainer,
      this.events,
      {
        imageTexture: 'logo_image', // The texture key provided by the host
        text: 'SLOT ENGINE',
        textStyle: {
          fontSize: 64,
          fontFamily: 'Arial',
          fill: 0xffd700,
          fontWeight: 'bold',
          align: 'center',
        },
        duration: 0.8,
        scalePeak: 1.3,
        autoHide: true,
        hideDelay: 0.8,
      }
    );
    this.logoAnimator.setPosition(0, 0);
  }

  /**
   * Get the game state.
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Get the event bus.
   */
  getEvents(): GameEvents {
    return this.events;
  }

  /**
   * Get the renderer.
   */
  getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Start the game.
   * This kicks off the boot sequence.
   */
  private async start(): Promise<void> {
    console.log('[GameController] Starting...');

    // Show loading screen
    this.loadingScreen.show();
    this.events.emit('loading:progress', { progress: 0, phase: 'Starting...' });

    try {
      // Step 1: Load assets
      await this.loadAssets();

      // Step 2: Connect WebSocket
      this.events.emit('loading:progress', { progress: 0.7, phase: 'Connecting...' });
      this.connectWebSocket();

      // Step 3: Wait for INIT response (handled by message handler)
      // The WS connection will send INIT automatically upon connection.
      // We'll wait for the 'game:ready' event.
      await new Promise<void>((resolve) => {
        const cleanup = this.events.on('game:ready', () => {
          cleanup();
          resolve();
        });
        // Timeout fallback
        setTimeout(() => {
          cleanup();
          resolve();
        }, 10000);
      });

      this.bootComplete = true;
      this.events.emit('loading:progress', { progress: 1, phase: 'Ready!' });
      this.events.emit('loading:complete', {});

      console.log('[GameController] Boot complete.');
    } catch (err) {
      console.error('[GameController] Boot failed:', err);
      this.platformBridge.showPopup(
        'Error',
        'Failed to start the game. Please try again.',
        [{ label: 'Retry', action: () => this.start() }]
      );
    }
  }

  /**
   * Spin the reels.
   * Validates state, constructs request, sends via WebSocket.
   */
  private spin(): void {
    if (!this.isReady) {
      console.warn('[GameController] Game not ready for spin.');
      return;
    }

    if (this.state.isSpinning) {
      console.warn('[GameController] Already spinning.');
      return;
    }

    const bet = this.state.currentBet;
    if (bet <= 0) {
      console.warn('[GameController] Bet must be greater than 0.');
      return;
    }

    // Deduct bet from balance
    this.state.deductBet(bet);
    this.state.isSpinning = true;
    this.events.emit('spin:start', { bet });

    // Start reel animation
    this.reelRenderer.spin();

    // Construct spin request
    const request: IWebSocketMessage<ISpinRequest> = {
      type: 'SPIN',
      data: {
        action: 'spin',
        stakePerLine: bet,
        selectedLines: this.config.reelCount || 5,
        totalStake: bet,
        game_mode: this.state.isBonusActive ? 1 : 0,
      },
    };

    // Send via WebSocket
    if (this.wsClient) {
      this.wsClient.send(request);
    } else {
      console.error('[GameController] WebSocket not connected.');
      this.state.isSpinning = false;
      // Refund bet?
      this.state.addWin(bet);
      this.events.emit('spin:end', { error: 'WebSocket disconnected' });
    }
  }

  /**
   * Request history data.
   */
  fetchHistory(): void {
    if (!this.wsClient) return;
    this.wsClient.send({
      type: 'HISTORY',
      data: { action: 'history' },
    });
  }

  /**
   * Destroy the game and clean up.
   */
  destroy(): void {
    // Clean up message handlers
    for (const cleanup of this.handlerCleanups) {
      cleanup();
    }
    this.handlerCleanups = [];

    // Clean up event listeners
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];

    // Destroy UI components
    this.loadingScreen.destroy();
    this.reelRenderer.destroy();
    this.uiManager.destroy();
    this.paytableRenderer.destroy();
    this.historyRenderer.destroy();
    this.settingsPanel.destroy();

    if (this.sessionTimer) {
      this.sessionTimer.destroy();
    }

    // Disconnect WebSocket
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }

    // Destroy renderer
    this.renderer.destroy();

    // Clear events
    this.events.clear();
  }

  // --- Private Methods ---

  private async loadAssets(): Promise<void> {
    this.events.emit('loading:start', { phase: 'assets' });
    await this.assetLoader.loadAll();
    this.events.emit('loading:complete', { phase: 'assets' });
  }

  /**
   * Connect to the WebSocket server.
   */
  private connectWebSocket(): void {
    const wsUrl = this.config.wsBaseUrl;
    const token = this.config.urlParams.token;

    this.wsClient = new WebSocketClient({
      url: wsUrl,
      token: token,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
    });

    // Register WebSocket event listeners
    this.wsClient.on('open', () => {
      console.log('[GameController] WebSocket connected.');
      this.sendInit();
    });

    this.wsClient.on('close', (event) => {
      console.warn('[GameController] WebSocket closed:', event);
      this.state.isSpinning = false;
      this.events.emit('connection:closed', { code: event.code, reason: event.reason });
    });

    this.wsClient.on('error', (event) => {
      console.error('[GameController] WebSocket error:', event);
      this.events.emit('connection:error', event);
    });

    this.wsClient.on('message', (data) => {
      this.messageHandler.processMessage(data);
    });

    // Set WebSocket client on bonus controller
    this.bonusController.setWebSocketClient(this.wsClient);

    // Connect
    this.wsClient.connect();
  }

  private sendInit(): void {
    if (!this.wsClient) return;
    this.wsClient.send({
      type: 'INIT',
      data: {
        gameId: this.config.gameId,
        mode: this.config.mode,
        locale: this.config.locale,
      },
    });
  }

  private registerMessageHandlers(): void {
    // Handle INIT response
    const initCleanup = this.messageHandler.register('INIT', (message) => {
      console.log('[GameController] INIT received:', message);
      if (message.data && message.data.balance !== undefined) {
        this.state.balance = message.data.balance;
      }
      if (message.data && message.data.bet !== undefined) {
        this.state.currentBet = message.data.bet;
      }
      this.isReady = true;
      this.events.emit('game:ready', { state: this.state });
      this.platformBridge.ready();
    });
    this.handlerCleanups.push(initCleanup);

    // Handle SPIN response
    const spinCleanup = this.messageHandler.register('SPIN', (message) => {
      this.handleSpinResult(message);
    });
    this.handlerCleanups.push(spinCleanup);

    // Handle BONUS response
    const bonusCleanup = this.messageHandler.register('BONUS', (message) => {
      this.handleBonusMessage(message);
    });
    this.handlerCleanups.push(bonusCleanup);

    // Handle HISTORY response
    const historyCleanup = this.messageHandler.register('HISTORY', (message) => {
      this.events.emit('history:data', message.data);
    });
    this.handlerCleanups.push(historyCleanup);

    // Handle ERROR responses
    const errorCleanup = this.messageHandler.register('ERROR', (message) => {
      console.error('[GameController] Server error:', message);
      this.state.isSpinning = false;
      this.events.emit('error', message);
      this.platformBridge.showPopup(
        'Error',
        message.data?.message || 'An error occurred.',
        [{ label: 'OK', action: () => {} }]
      );
    });
    this.handlerCleanups.push(errorCleanup);
  }

  /**
   * Wire up UI events (spin button, history, settings, paytable toggles).
   */
  private wireUIEvents(): void {
    // Spin button callback
    const spinCleanup = this.events.on('spin:request', () => {
      this.spin();
    });
    this.eventCleanups.push(spinCleanup);

    // History toggle (you can bind this to a button later)
    const historyCleanup = this.events.on('ui:toggleHistory', () => {
      this.historyRenderer.toggle();
    });
    this.eventCleanups.push(historyCleanup);

    // Settings toggle
    const settingsCleanup = this.events.on('ui:toggleSettings', () => {
      this.settingsPanel.toggle();
    });
    this.eventCleanups.push(settingsCleanup);

    // Paytable toggle
    const paytableCleanup = this.events.on('ui:togglePaytable', () => {
      this.paytableRenderer.toggle();
    });
    this.eventCleanups.push(paytableCleanup);

    // Language change – re-render UI text (you can implement this as needed)
    const langCleanup = this.events.on('language:changed', (data) => {
      console.log('[GameController] Language changed to:', data.locale);
      // Rebuild paytable, history, settings text, etc.
      // For simplicity, we'll just emit a refresh event.
      this.events.emit('ui:refresh', {});
    });
    this.eventCleanups.push(langCleanup);

    const autoplayStartCleanup = this.events.on('autoplay:start', (config) => {
      this.autoplayManager.start(config);
    });
    this.eventCleanups.push(autoplayStartCleanup);

    const autoplayStopCleanup = this.events.on('autoplay:stop', () => {
      this.autoplayManager.stop();
    });
    this.eventCleanups.push(autoplayStopCleanup);

    const autoplayToggleFastSpinCleanup = this.events.on('autoplay:toggleFastSpin', () => {
      const current = this.autoplayManager.isFastSpin();
      this.autoplayManager.toggleFastSpin(!current);
    });
    this.eventCleanups.push(autoplayToggleFastSpinCleanup);

    const fastSpinToggleCleanup = this.events.on('fastspin:toggle', () => {
      this.fastSpinManager.toggle();
    });
    this.eventCleanups.push(fastSpinToggleCleanup);

    // Update spin button with autoplay state
    const autoplayStateCleanup = this.events.on('autoplay:started', (state) => {
      this.uiManager.spinButton.setAutoplayActive(true);
    });
    const autoplayStoppedCleanup = this.events.on('autoplay:stopped', () => {
      this.uiManager.spinButton.setAutoplayActive(false);
    });
    this.eventCleanups.push(autoplayStateCleanup, autoplayStoppedCleanup);

    // Update spin button stop callback
    this.uiManager.spinButton.onAutoplayStop(() => {
      this.autoplayManager.stop();
    });
  }

  private handleSpinResult(message: IWebSocketMessage): void {
    const data = message.data as ISpinResponse;
    if (!data) {
      console.warn('[GameController] Invalid spin response.');
      this.state.isSpinning = false;
      return;
    }

    // Map result to reels
    const result = {
      ...data,
      reels: data.result,
    };

    // Update state
    this.state.lastSpinResult = result;
    this.state.totalWin = data.totalWin || 0;

    // Add win to balance
    if (data.totalWin > 0) {
      this.state.addWin(data.totalWin);
      this.events.emit('win', { amount: data.totalWin, lines: data.winLines });
    }

    // Check for bonus trigger
    if (data.bonusTriggered && data.freeSpinsRemaining && data.freeSpinsRemaining > 0) {
      this.state.isBonusActive = true;
      this.state.freeSpinsRemaining = data.freeSpinsRemaining;
      this.events.emit('bonus:trigger', { spinsRemaining: data.freeSpinsRemaining });
    }

    // Stop the reels at the given positions
    if (data.result && data.result.length > 0) {
      this.reelRenderer.stop(data.result);
    } else {
      // No result? Just mark spin as complete.
      this.state.isSpinning = false;
      this.events.emit('spin:end', { result: data });
    }

    // Reset spinning state (the reel renderer will call back when animation completes)
    // We'll use the reel renderer's onSpinComplete callback.
  }

  /**
   * Handle a bonus message from the server.
   */
  private handleBonusMessage(message: IWebSocketMessage): void {
    const data = message.data;
    console.log('[GameController] Bonus message:', data);

    // Generic bonus handling
    this.events.emit('bonus:update', data);

    // If bonus has ended, reset state
    if (data.state === 'ENDED' || data.state === 'COMPLETE') {
      this.state.isBonusActive = false;
      this.state.freeSpinsRemaining = 0;
      this.events.emit('bonus:end', data);
    }
  }
}