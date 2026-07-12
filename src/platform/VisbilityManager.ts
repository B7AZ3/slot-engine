type VisibilityCallback = (hidden: boolean) => void;

/**
 * Wraps the Page Visibility API to notify subscribers when the tab is hidden/shown.
 */
export class VisibilityManager {
  private hidden: boolean = false;
  private callbacks: Set<VisibilityCallback> = new Set();

  constructor() {
    this.hidden = document.hidden || false;

    const handler = () => {
      this.hidden = document.hidden || false;
      for (const cb of this.callbacks) {
        cb(this.hidden);
      }
    };

    // Use the 'visibilitychange' event with vendor prefixes for older browsers
    document.addEventListener('visibilitychange', handler);
    // @ts-ignore - moz/ms/webkit prefixes for legacy support
    document.addEventListener('webkitvisibilitychange', handler);
    // @ts-ignore
    document.addEventListener('mozvisibilitychange', handler);
    // @ts-ignore
    document.addEventListener('msvisibilitychange', handler);
  }

  /**
   * Register a callback to be invoked when visibility changes.
   * The callback receives `true` if the tab is hidden, `false` if visible.
   */
  onVisibilityChange(cb: VisibilityCallback): () => void {
    this.callbacks.add(cb);
    // Return a cleanup function
    return () => {
      this.callbacks.delete(cb);
    };
  }

  /**
   * Check if the current tab is hidden.
   */
  isHidden(): boolean {
    return this.hidden;
  }
}