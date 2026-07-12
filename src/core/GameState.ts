import { type IGameState, type ISpinResult } from '../types/index.js';
import { safeAdd, safeSubtract, fixDecimals } from '../utils/NumberFormatter.js';

/**
 * Simple observable state container.
 * Emits events when critical properties change.
 */
type StateListener<T> = (newValue: T, oldValue: T) => void;

export class GameState implements IGameState {
  private _balance: number = 0;
  private _currentBet: number = 0;
  private _totalWin: number = 0;
  private _isSpinning: boolean = false;
  private _isBonusActive: boolean = false;
  private _freeSpinsRemaining: number = 0;
  private _lastSpinResult: ISpinResult | null = null;
  private _isAutoplayActive: boolean = false;
  private _autoplayRemaining: number = 0;
  private _isFastSpin: boolean = false;

  // Listeners
  private listeners: Map<keyof GameState, Set<StateListener<any>>> = new Map();

  // Getters
  get balance(): number { return this._balance; }
  get currentBet(): number { return this._currentBet; }
  get totalWin(): number { return this._totalWin; }
  get isSpinning(): boolean { return this._isSpinning; }
  get isBonusActive(): boolean { return this._isBonusActive; }
  get freeSpinsRemaining(): number { return this._freeSpinsRemaining; }
  get lastSpinResult(): ISpinResult | null { return this._lastSpinResult; }

  // Setters with notifications
  set balance(value: number) {
    const old = this._balance;
    this._balance = fixDecimals(value, 2);
    this.notify('balance', this._balance, old);
  }

  set currentBet(value: number) {
    const old = this._currentBet;
    this._currentBet = fixDecimals(value, 2);
    this.notify('currentBet', this._currentBet, old);
  }

  set totalWin(value: number) {
    const old = this._totalWin;
    this._totalWin = fixDecimals(value, 2);
    this.notify('totalWin', this._totalWin, old);
  }

  set isSpinning(value: boolean) {
    const old = this._isSpinning;
    this._isSpinning = value;
    this.notify('isSpinning', this._isSpinning, old);
  }

  set isBonusActive(value: boolean) {
    const old = this._isBonusActive;
    this._isBonusActive = value;
    this.notify('isBonusActive', this._isBonusActive, old);
  }

  set freeSpinsRemaining(value: number) {
    const old = this._freeSpinsRemaining;
    this._freeSpinsRemaining = Math.max(0, value);
    this.notify('freeSpinsRemaining', this._freeSpinsRemaining, old);
  }

  set lastSpinResult(value: ISpinResult | null) {
    const old = this._lastSpinResult;
    this._lastSpinResult = value;
    this.notify('lastSpinResult', this._lastSpinResult, old);
  }

  get isAutoplayActive(): boolean { return this._isAutoplayActive; }
  set isAutoplayActive(value: boolean) {
    const old = this._isAutoplayActive;
    this._isAutoplayActive = value;
    this.notify('isAutoplayActive', value, old);
  }

  get autoplayRemaining(): number { return this._autoplayRemaining; }
  set autoplayRemaining(value: number) {
    const old = this._autoplayRemaining;
    this._autoplayRemaining = Math.max(0, value);
    this.notify('autoplayRemaining', this._autoplayRemaining, old);
  }

  get isFastSpin(): boolean { return this._isFastSpin; }
  set isFastSpin(value: boolean) {
    const old = this._isFastSpin;
    this._isFastSpin = value;
    this.notify('isFastSpin', value, old);
  }

  /**
   * Subscribe to changes on a specific property.
   * Returns a cleanup function.
   */
  on<K extends keyof GameState>(key: K, listener: StateListener<GameState[K]>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  private notify<K extends keyof GameState>(key: K, newVal: GameState[K], oldVal: GameState[K]) {
    const set = this.listeners.get(key);
    if (set) {
      for (const cb of set) {
        cb(newVal, oldVal);
      }
    }
  }

  /**
   * Add a winning amount to the balance.
   */
  addWin(amount: number): void {
    this.balance = safeAdd(this.balance, amount);
    this.totalWin = amount;
  }

  /**
   * Deduct a bet from the balance.
   */
  deductBet(amount: number): void {
    this.balance = safeSubtract(this.balance, amount);
  }

  /**
   * Reset the state for a new game session.
   */
  reset(): void {
    this.balance = 0;
    this.currentBet = 0;
    this.totalWin = 0;
    this.isSpinning = false;
    this.isBonusActive = false;
    this.freeSpinsRemaining = 0;
    this.lastSpinResult = null;
    this._isAutoplayActive = false;
    this._autoplayRemaining = 0;
    this._isFastSpin = false;
  }
}