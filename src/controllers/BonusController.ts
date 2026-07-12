import { GameState } from '../core/GameState.js';
import { WebSocketClient } from '../network/WebSocketClient.js';
import { GameEvents } from '../events/GameEvents.js';
import { type IWebSocketMessage } from '../types/index.js';

/**
 * Manages bonus game logic.
 * Handles free spins, pick'ems, and other bonus types.
 * Communicates with the server via WebSocket.
 */
export class BonusController {
  private state: GameState;
  private wsClient: WebSocketClient | null = null;
  private events: GameEvents;

  constructor(state: GameState, events: GameEvents) {
    this.state = state;
    this.events = events;
  }

  /**
   * Set the WebSocket client for sending bonus actions.
   */
  setWebSocketClient(client: WebSocketClient): void {
    this.wsClient = client;
  }

  /**
   * Accept a bonus offer.
   * @param bonusId - The bonus ID from the server.
   */
  acceptBonus(bonusId: string): void {
    if (!this.wsClient) {
      console.warn('[BonusController] WebSocket not connected.');
      return;
    }

    this.wsClient.send({
      type: 'BONUS',
      data: {
        action: 'accept',
        bonusId: bonusId,
      },
    });
  }

  /**
   * Decline a bonus offer.
   * @param bonusId - The bonus ID from the server.
   */
  declineBonus(bonusId: string): void {
    if (!this.wsClient) {
      console.warn('[BonusController] WebSocket not connected.');
      return;
    }

    this.wsClient.send({
      type: 'BONUS',
      data: {
        action: 'decline',
        bonusId: bonusId,
      },
    });
  }

  /**
   * Perform an action during a bonus game (e.g., pick an item).
   * @param bonusId - The bonus ID.
   * @param action - The specific action (e.g., 'pick').
   * @param payload - Additional data for the action.
   */
  bonusAction(bonusId: string, action: string, payload?: any): void {
    if (!this.wsClient) {
      console.warn('[BonusController] WebSocket not connected.');
      return;
    }

    this.wsClient.send({
      type: 'BONUS',
      data: {
        action: action,
        bonusId: bonusId,
        ...payload,
      },
    });
  }

  /**
   * Send a free spin request (when a free spin is triggered).
   * This is essentially a spin with game_mode = 1.
   * @param bet - The bet amount for the free spin.
   */
  requestFreeSpin(bet: number): void {
    if (!this.wsClient) {
      console.warn('[BonusController] WebSocket not connected.');
      return;
    }

    // The game controller will handle the actual spin request,
    // but we can emit an event to trigger it.
    this.events.emit('bonus:requestSpin', { bet, mode: 1 });
  }

  /**
   * Request bonus status from the server.
   */
  getBonusStatus(): void {
    if (!this.wsClient) {
      console.warn('[BonusController] WebSocket not connected.');
      return;
    }

    this.wsClient.send({
      type: 'BONUS_STATUS',
      data: {},
    });
  }
}