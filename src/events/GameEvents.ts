type EventListener<T = any> = (data: T) => void;

/**
 * A simple event emitter for decoupled communication.
 * Used by GameController to notify other components of state changes.
 */
export class GameEvents {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Register a listener for an event.
   * Returns a cleanup function.
   */
  on<T = any>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener);
    return () => {
      this.listeners.get(event)?.delete(listener as EventListener);
    };
  }

  /**
   * Emit an event with data.
   */
  emit<T = any>(event: string, data: T): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[GameEvents] Error in listener for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners for a specific event.
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.listeners.clear();
  }
}