import { type IPlatformBridge } from '../types/index.js';

/**
 * Default implementation of the platform bridge.
 * This is used when the host does not provide its own implementation.
 * It logs actions to the console and provides minimal DOM-based popups.
 */
export class DefaultPlatformBridge implements IPlatformBridge {
  private balanceElement: HTMLElement | null = null;
  private popupContainer: HTMLElement | null = null;

  constructor() {
    // Try to find common balance display elements
    this.balanceElement = document.querySelector('.balance-value');
    this.popupContainer = document.querySelector('#popup-container');
  }

  updateBalance(amount: number): void {
    if (this.balanceElement) {
      this.balanceElement.textContent = amount.toFixed(2);
    } else {
      console.log('[DefaultPlatformBridge] Balance updated:', amount);
    }
  }

  showPopup(
    title: string,
    message: string,
    buttons: { label: string; action: () => void }[]
  ): void {
    if (this.popupContainer) {
      const popup = document.createElement('div');
      popup.className = 'engine-popup';
      popup.innerHTML = `
        <div class="engine-popup-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="engine-popup-actions">
            ${buttons.map((b, i) => `<button data-index="${i}">${b.label}</button>`).join('')}
          </div>
        </div>
      `;
      this.popupContainer.appendChild(popup);
      popup.querySelectorAll('button').forEach((btn) => {
        const idx = parseInt(btn.dataset.index || '0');
        btn.addEventListener('click', () => {
          buttons[idx]?.action();
          popup.remove();
        });
      });
    } else {
      console.log('[DefaultPlatformBridge] Popup:', title, message, buttons);
    }
  }

  closeGame(): void {
    console.log('[DefaultPlatformBridge] closeGame() called');
    window.close();
  }

  sendPostMessage(data: any): void {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
    } else {
      console.log('[DefaultPlatformBridge] postMessage:', data);
    }
  }

  ready(): void {
    console.log('[DefaultPlatformBridge] Game ready');
    this.sendPostMessage({ type: 'GAME_READY' });
  }
}