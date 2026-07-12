import { type IWebSocketMessage } from '../types/index.js';

export type MessageHandlerCallback<T = any> = (message: IWebSocketMessage<T>) => void;

/**
 * Central dispatcher for incoming WebSocket messages.
 * Controllers can register handlers for specific message types.
 */
export class MessageHandler {
  private handlers: Map<string, Set<MessageHandlerCallback>> = new Map();

  /**
   * Register a handler for a specific message type.
   */
  register(type: string, callback: MessageHandlerCallback): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(callback);
    // Return a cleanup function
    return () => {
      this.handlers.get(type)?.delete(callback);
    };
  }

  /**
   * Process an incoming message.
   * Calls all registered handlers for the message type.
   */
  processMessage(message: IWebSocketMessage): void {
    const type = message.type;
    const handlers = this.handlers.get(type);
    if (!handlers || handlers.size === 0) {
      console.warn(`[MessageHandler] No handler for message type: ${type}`);
      return;
    }
    for (const cb of handlers) {
      try {
        cb(message);
      } catch (err) {
        console.error(`[MessageHandler] Error in handler for type "${type}":`, err);
      }
    }
  }

  /**
   * Clear all handlers (useful for cleanup).
   */
  clear(): void {
    this.handlers.clear();
  }
}