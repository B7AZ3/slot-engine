import * as PIXI from 'pixi.js';

/**
 * Core configuration for the slot engine.
 * This is provided by the host application at instantiation.
 */
export interface IGameConfig {
  /** API base URL (for localization, asset manifests, etc.) */
  apiBaseUrl: string;
  /** WebSocket base URL (for real-time game communication) */
  wsBaseUrl: string;
  /** Game identifier (e.g., "leprechaunwish") */
  gameId: string;
  /** Operating mode: 'real' (real money) or 'fun' (play money) */
  mode: 'real' | 'fun';
  /** Default locale (e.g., 'en', 'es') */
  locale: string;
  /** List of active languages to filter localization */
  activeLanguages?: string[];
  /** Number of reels (default: 5) */
  reelCount?: number;
  /** Number of visible rows per reel (default: 3) */
  rowCount?: number;
  /** Currency symbol (e.g., '$', '€') */
  currencySymbol?: string;
  /** Decimal separator (e.g., '.') */
  decimalSeparator?: string;
  /** Thousands separator (e.g., ',') */
  thousandSeparator?: string;
  /** Minimum number of decimal places to display */
  minDecimalPlaces?: number;
  /** Feature flags */
  features?: {
    autoplay?: boolean;
    fastSpin?: boolean;
    realityCheck?: boolean;
    fullscreen?: boolean;
  };
}

/**
 * Runtime state of the game.
 * Updated by the engine and read by the UI.
 */
export interface IGameState {
  balance: number;
  currentBet: number;
  totalWin: number;
  isSpinning: boolean;
  isBonusActive: boolean;
  freeSpinsRemaining: number;
  lastSpinResult: ISpinResult | null;
}

/**
 * Result of a single spin (parsed from WebSocket response).
 */
export interface ISpinResult {
  reels: number[][];          // 2D array of symbol IDs
  totalWin: number;
  winLines?: IWinLine[];
  bonusTriggered?: boolean;
  freeSpinsAwarded?: number;
}

/**
 * A winning line (for payline-based games).
 */
export interface IWinLine {
  lineIndex: number;
  symbolId: number;
  multiplier: number;
  winAmount: number;
  positions: { reel: number; row: number }[];
}

/**
 * Platform bridge – implemented by the host app.
 * The engine calls these methods to interact with the outer frame/app.
 */
export interface IPlatformBridge {
  /** Update the displayed balance */
  updateBalance(amount: number): void;
  /** Show a modal/popup with a message and optional actions */
  showPopup(
    title: string,
    message: string,
    buttons: { label: string; action: () => void }[]
  ): void;
  /** Close the game (e.g., navigate away or close iframe) */
  closeGame(): void;
  /** Send a postMessage to the parent window (for iframe communication) */
  sendPostMessage(data: any): void;
  /** Notify that the game is fully loaded and ready to play */
  ready(): void;
}

/**
 * URL parameters parsed from window.location.search.
 */
export interface IUrlParams {
  token?: string;
  oid?: string;
  mode?: string;
  activeLanguages?: string;
  [key: string]: string | undefined;
}

/** Configuration for a font to load */
export interface IFontConfig {
  family: string;
  url: string;
  weight?: string;
  style?: string;
}

/** Configuration for a sound to load */
export interface ISoundConfig {
  id: string;          // unique identifier (e.g., 'bg', 'spin', 'win')
  src: string;         // file path (without extension, .mp3 assumed)
  loop?: boolean;
  volume?: number;     // 0.0 to 1.0
  music?: boolean;     // if true, treated as background music
  bonusMusic?: boolean;
}

/** Localization data structure: { [locale]: { [key]: string } } */
export interface ILocalizationData {
  [locale: string]: {
    [key: string]: string;
  };
}

/** Sound manager state */
export interface ISoundState {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  currentMusicId: string | null;
}

/**
 * Base WebSocket message structure.
 * All messages sent/received over WebSocket follow this shape.
 */
export interface IWebSocketMessage<T = any> {
  type: string;
  data: T;
  status?: string;      // 'OK' or 'ERROR' in responses
  timestamp?: number;
}

/**
 * Generic spin request.
 * The actual fields may vary per game; this is a minimal common interface.
 */
export interface ISpinRequest {
  action: 'spin' | 'autospin' | 'fastspin';
  stakePerLine: number;
  selectedLines: number;
  totalStake: number;
  game_mode: 0 | 1;      // 0 = main, 1 = bonus
}

/**
 * Generic spin response (simplified).
 * Actual response may include more fields (wilds, free spins, etc.).
 */
export interface ISpinResponse {
  result: number[][];            // 2D array of symbol IDs
  totalWin: number;
  stakePerLine: number;
  totalStake: number;
  gameMode: 0 | 1;
  freeSpinsRemaining?: number;
  bonusTriggered?: boolean;
  bonusData?: any;               // Bonus-specific payload
  winLines?: {
    lineIndex: number;
    symbolId: number;
    multiplier: number;
    winAmount: number;
    positions: { reel: number; row: number }[];
  }[];
}

/**
 * Connection parameters for WebSocket.
 */
export interface IWebSocketConnectionParams {
  url: string;                   // Full WebSocket URL (including query params)
  token?: string;
  timeout?: number;              // Connection timeout in ms
  reconnectDelay?: number;       // Initial reconnect delay (ms)
  maxReconnectAttempts?: number;
}

/**
 * WebSocket event types.
 */
export type WebSocketEventType = 'open' | 'close' | 'error' | 'message';
export type WebSocketEventListener = (event: any) => void;

/**
 * Interface for objects that need to be notified on resize.
 * Used by the Renderer to propagate viewport changes.
 */
export interface IResizeable {
  onResize(width: number, height: number, scale: number): void;
}

/**
 * Configuration for a button.
 */
export interface IButtonConfig {
  /** Default texture key */
  defaultTexture: string;
  /** Hover texture key (optional) */
  hoverTexture?: string;
  /** Pressed texture key (optional) */
  pressedTexture?: string;
  /** Disabled texture key (optional) */
  disabledTexture?: string;
  /** Scale multiplier for the button sprite (default: 1) */
  scale?: number;
  /** Elastic animation on hover (default: false) */
  elastic?: boolean;
}

/**
 * Style options for text.
 */
export interface ITextStyle extends Partial<PIXI.TextStyle> {
  fontSize?: number;
  fontFamily?: string;
  fill?: string | number;
  stroke?: string | number;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Options for a sprite.
 */
export interface ISpriteOptions {
  /** Anchor point (default: 0.5, 0.5) */
  anchor?: { x: number; y: number };
  /** Scale (default: 1, 1) */
  scale?: { x: number; y: number };
  /** Tint color (default: 0xFFFFFF) */
  tint?: number;
  /** Alpha (default: 1) */
  alpha?: number;
  /** Rotation in radians (default: 0) */
  rotation?: number;
}

/**
 * Mapping from symbol ID (number) to texture key.
 * E.g., { 0: 'symbol_small_0', 1: 'symbol_small_1', ... }
 */
export type SymbolMap = Record<number, string>;

/**
 * Configuration for the reels.
 */
export interface IReelConfig {
  /** Number of reels (default: 5) */
  reelCount: number;
  /** Number of visible rows (default: 3) */
  rowCount: number;
  /** Height of one symbol sprite (in pixels) */
  symbolHeight: number;
  /** Width of one symbol sprite (in pixels) */
  symbolWidth: number;
  /** Gap between symbols (default: 0) */
  spacing?: number;
  /** Total symbols in each reel strip (for smooth scrolling) */
  stripLength?: number;
}

/**
 * Result of a spin – an array of symbol IDs for each reel.
 */
export type ReelResult = number[][];  // [reelIndex][rowIndex]

/**
 * Configuration for UI components.
 */
export interface IUIConfig {
  /** Currency symbol (e.g., '$') */
  currencySymbol?: string;
  /** Decimal separator (e.g., '.') */
  decimalSeparator?: string;
  /** Thousands separator (e.g., ',') */
  thousandSeparator?: string;
  /** Minimum decimal places */
  minDecimalPlaces?: number;
  /** Color of the balance text */
  balanceColor?: number;
  /** Color of the win text */
  winColor?: number;
}

/**
 * Bet control state.
 */
export interface IBetState {
  currentBet: number;
  minBet: number;
  maxBet: number;
  step: number;
}

/**
 * Autoplay configuration.
 */
export interface IAutoplayConfig {
  /** Number of spins to play (default: 10) */
  rounds: number;
  /** Stop if any win exceeds this amount (0 = no stop) */
  stopOnWin?: number;
  /** Stop if balance drops below this amount */
  stopOnBalanceBelow?: number;
  /** Stop if a bonus is triggered */
  stopOnBonus?: boolean;
  /** Enable fast spin mode */
  fastSpin?: boolean;
}

/**
 * Autoplay state.
 */
export interface IAutoplayState {
  active: boolean;
  roundsTotal: number;
  roundsRemaining: number;
  roundsCompleted: number;
  fastSpin: boolean;
  paused: boolean;
}

/**
 * Fast spin configuration.
 */
export interface IFastSpinConfig {
  /** Speed multiplier (e.g., 2 = twice as fast) */
  speedMultiplier: number;
  /** Skip win animations */
  skipWinAnimations: boolean;
  /** Skip reel stop delay */
  skipReelDelay: boolean;
}

export interface ILogoConfig {
  /** Texture key for the logo image (optional) */
  imageTexture?: string;
  /** Logo text (optional) */
  text?: string;
  /** Text style */
  textStyle?: Partial<PIXI.TextStyle>;
  /** Animation duration in seconds (default: 0.8) */
  duration?: number;
  /** Scale factor at peak (default: 1.2) */
  scalePeak?: number;
  /** Initial scale (default: 0.5) */
  scaleStart?: number;
  /** Initial alpha (default: 0) */
  alphaStart?: number;
  /** Ease function for GSAP (default: 'back.out(1.7)') */
  ease?: string;
  /** Auto-hide after animation (default: true) */
  autoHide?: boolean;
  /** Delay before hiding (seconds) (default: 1.0) */
  hideDelay?: number;
}

/**
 * A single payline pattern.
 * Each element is { reel: number; row: number } (0-indexed).
 */
export type IPaylinePattern = { reel: number; row: number }[];

/**
 * A winning line result from a spin.
 */
export interface IWinLineResult {
  /** Index of the line in the paytable */
  lineIndex: number;
  /** Symbol ID that formed the win */
  symbolId: number;
  /** Multiplier for the win */
  multiplier: number;
  /** Total win amount */
  winAmount: number;
  /** Positions (reel, row) of the winning symbols */
  positions: { reel: number; row: number }[];
}

/**
 * Configuration for the payline renderer.
 */
export interface IPaylineRendererConfig {
  /** Color of the line (default: 0xffd700) */
  color?: number;
  /** Alpha of the line (default: 0.8) */
  alpha?: number;
  /** Width of the line stroke (default: 3) */
  lineWidth?: number;
  /** Glow/outline width (default: 2) */
  glowWidth?: number;
  /** Glow color (default: same as line color) */
  glowColor?: number;
  /** Glow alpha (default: 0.3) */
  glowAlpha?: number;
  /** Duration of the draw animation in seconds (default: 0.5) */
  drawDuration?: number;
  /** Ease for the animation (default: 'power2.out') */
  ease?: string;
  /** Should lines pulse after drawing? (default: true) */
  pulse?: boolean;
  /** Pulse duration in seconds (default: 0.8) */
  pulseDuration?: number;
}