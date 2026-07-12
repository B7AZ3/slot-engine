import * as PIXI from 'pixi.js';
import { type ITextStyle } from '../types/index.js';
import { UIFactory } from './UIFactory.js';

/**
 * A simple text wrapper that creates a PIXI.Text with anchor center and common props.
 * This is essentially a convenience wrapper around UIFactory.createText.
 */
export class Text {
  private textObj: PIXI.Text & { destroy: () => void };
  private parent: PIXI.Container;

  constructor(
    parent: PIXI.Container,
    text: string,
    style: ITextStyle
  ) {
    this.parent = parent;
    this.textObj = UIFactory.createText(text, style, parent);
  }

  /**
   * Set the text content.
   */
  setText(value: string): void {
    this.textObj.text = value;
  }

  /**
   * Set the position.
   */
  setPosition(x: number, y: number): void {
    this.textObj.x = x;
    this.textObj.y = y;
  }

  /**
   * Set the scale.
   */
  setScale(x: number, y: number): void {
    this.textObj.scale.set(x, y);
  }

  /**
   * Set the alpha.
   */
  setAlpha(alpha: number): void {
    this.textObj.alpha = alpha;
  }

  /**
   * Get the underlying PIXI.Text object.
   */
  getObject(): PIXI.Text {
    return this.textObj;
  }

  /**
   * Destroy the text.
   */
  destroy(): void {
    this.textObj.destroy(true);
  }
}