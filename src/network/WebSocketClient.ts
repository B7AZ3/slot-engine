import { type IWebSocketMessage, type IWebSocketConnectionParams, type WebSocketEventType, type WebSocketEventListener } from '../types/index.js';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token?: string;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private shouldReconnect: boolean = true;
  private messageQueue: any[] = [];

  // Event listeners
  private listeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map();

  constructor(params: IWebSocketConnectionParams) {
    this.url = params.url;
    this.token = params.token;
    this.reconnectDelay = params.reconnectDelay ?? 1000;
    this.maxReconnectAttempts = params.maxReconnectAttempts ?? 10;
  }

  /**
   * Connect to the WebSocket server.
   * If a token is provided, it will be appended as a query parameter.
   */
  connect(): void {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;
    let wsUrl = this.url;
    if (this.token) {
      const separator = wsUrl.includes('?') ? '&' : '?';
      wsUrl += `${separator}token=${encodeURIComponent(this.token)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
    } catch (err) {
      console.error('[WebSocketClient] Connection error:', err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect and prevent reconnection.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.emit('close', { wasClean: true });
  }

  /**
   * Send a message to the server.
   * If the socket is not open, the message is queued and sent after connection.
   */
  send<T = any>(message: IWebSocketMessage<T>): void {
    const payload = JSON.stringify(message);
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.messageQueue.push(payload);
    }
  }

  /**
   * Get the current connection status.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Register an event listener.
   */
  on(event: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(event: WebSocketEventType, listener: WebSocketEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: WebSocketEventType, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        cb(data);
      }
    }
  }

  private onOpen(event: Event): void {
    this.isConnecting = false;
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    console.log('[WebSocketClient] Connected');
    this.emit('open', event);

    // Flush queued messages
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }
  }

  private onClose(event: CloseEvent): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;
    console.log('[WebSocketClient] Closed', event.code, event.reason);
    this.emit('close', event);
    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private onError(event: Event): void {
    console.error('[WebSocketClient] Error:', event);
    this.emit('error', event);
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
    } catch (err) {
      console.warn('[WebSocketClient] Invalid JSON:', event.data);
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocketClient] Max reconnect attempts reached.');
      return;
    }
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}