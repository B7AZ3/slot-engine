import * as PIXI from 'pixi.js';
import { type ITextStyle, type ISpriteOptions } from '../types/index.js';

/**
 * A factory class for creating common Pixi UI elements with consistent properties.
 * All objects created have a `destroy` method that removes them from parent and cleans up.
 */
export class UIFactory {
  /**
   * Create a container with common props.
   * The returned container has an attached `destroy` method.
   */
  static createContainer(parent?: PIXI.Container): PIXI.Container & { destroy: () => void } {
    const container = new PIXI.Container();
    this.addCommonProps(container);
    if (parent) {
      parent.addChild(container);
    }
    return container as PIXI.Container & { destroy: () => void };
  }

  /**
   * Create a sprite from a texture key.
   */
  static createSprite(
    textureKey: string,
    options?: ISpriteOptions,
    parent?: PIXI.Container
  ): PIXI.Sprite & { destroy: () => void } {
    const texture = PIXI.Assets.get(textureKey);
    if (!texture) {
      throw new Error(`[UIFactory] Texture not found: ${textureKey}`);
    }
    const sprite = new PIXI.Sprite(texture);
    this.addCommonProps(sprite, options);
    if (parent) {
      parent.addChild(sprite);
    }
    return sprite as PIXI.Sprite & { destroy: () => void };
  }

  /**
   * Create a text object.
   */
  static createText(
    text: string,
    style: ITextStyle,
    parent?: PIXI.Container
  ): PIXI.Text & { destroy: () => void } {
    const textObj = new PIXI.Text(text, style);
    this.addCommonProps(textObj);
    if (parent) {
      parent.addChild(textObj);
    }
    return textObj as PIXI.Text & { destroy: () => void };
  }

  /**
   * Create a graphics object (e.g., rectangle, circle, rounded rect).
   * This returns a Graphics with a `destroy` method.
   */
  static createGraphics(parent?: PIXI.Container): PIXI.Graphics & { destroy: () => void } {
    const graphics = new PIXI.Graphics();
    this.addCommonProps(graphics);
    if (parent) {
      parent.addChild(graphics);
    }
    return graphics as PIXI.Graphics & { destroy: () => void };
  }

  /**
   * Create a simple rectangle.
   */
  static createRect(
    width: number,
    height: number,
    fillColor: number = 0xffffff,
    strokeColor?: number,
    strokeWidth: number = 1,
    parent?: PIXI.Container
  ): PIXI.Graphics & { destroy: () => void } {
    const g = this.createGraphics(parent);
    if (strokeColor !== undefined) {
      g.lineStyle(strokeWidth, strokeColor);
    }
    g.beginFill(fillColor);
    g.drawRect(-width / 2, -height / 2, width, height);
    g.endFill();
    g.pivot.set(width / 2, height / 2);
    return g;
  }

  /**
   * Create a circle.
   */
  static createCircle(
    radius: number,
    fillColor: number = 0xffffff,
    strokeColor?: number,
    strokeWidth: number = 1,
    parent?: PIXI.Container
  ): PIXI.Graphics & { destroy: () => void } {
    const g = this.createGraphics(parent);
    if (strokeColor !== undefined) {
      g.lineStyle(strokeWidth, strokeColor);
    }
    g.beginFill(fillColor);
    g.drawCircle(0, 0, radius);
    g.endFill();
    return g;
  }

  /**
   * Create a rounded rectangle.
   */
  static createRoundedRect(
    width: number,
    height: number,
    radius: number,
    fillColor: number = 0xffffff,
    strokeColor?: number,
    strokeWidth: number = 1,
    parent?: PIXI.Container
  ): PIXI.Graphics & { destroy: () => void } {
    const g = this.createGraphics(parent);
    if (strokeColor !== undefined) {
      g.lineStyle(strokeWidth, strokeColor);
    }
    g.beginFill(fillColor);
    g.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    g.endFill();
    return g;
  }

  /**
   * Apply common properties to any display object.
   * Also attaches a `destroy` method for easy cleanup.
   */
  private static addCommonProps(
    obj: PIXI.Container | PIXI.Sprite | PIXI.Text | PIXI.Graphics,
    options?: ISpriteOptions
  ): void {
    // Set anchor (for sprites and text)
    if ('anchor' in obj) {
      const anchor = options?.anchor || { x: 0.5, y: 0.5 };
      obj.anchor.set(anchor.x, anchor.y);
    }

    // Set scale
    if (options?.scale) {
      obj.scale.set(options.scale.x, options.scale.y);
    }

    // Set tint (for sprites)
    if ('tint' in obj && options?.tint !== undefined) {
      obj.tint = options.tint;
    }

    // Set alpha
    if (options?.alpha !== undefined) {
      obj.alpha = options.alpha;
    }

    // Set rotation
    if (options?.rotation !== undefined) {
      obj.rotation = options.rotation;
    }

    // Attach a destroy method that removes from parent and optionally destroys children
    (obj as any).destroy = function (this: any, destroyChildren: boolean = true) {
      if (this.parent) {
        this.parent.removeChild(this);
      }
      if (destroyChildren) {
        if (this.children) {
          for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child && (child as any).destroy) {
              (child as any).destroy(true);
            }
          }
        }
      }
      // For PIXI.Sprite/Text, call the original destroy
      if (this._destroy) {
        this._destroy(destroyChildren);
      } else if (this.destroyTexture) {
        // For Graphics, no texture to destroy, but we can clear
        if (this.clear) {
          this.clear();
        }
      }
    };
    // Store original destroy to avoid recursion
    const originalDestroy = obj.destroy;
    if (originalDestroy) {
      (obj as any)._destroy = originalDestroy.bind(obj);
    }
  }

  /**
   * Convenience method to set position on any display object.
   * This mirrors the original `setPosition` method.
   */
  static setPosition(
    obj: PIXI.Container | PIXI.Sprite | PIXI.Text | PIXI.Graphics,
    x: number,
    y: number
  ): void {
    obj.x = x;
    obj.y = y;
  }

  /**
   * Get the global position of an object (relative to the stage).
   */
  static getGlobalPosition(
    obj: PIXI.Container | PIXI.Sprite | PIXI.Text | PIXI.Graphics
  ): { x: number; y: number } {
    const pos = obj.getGlobalPosition();
    return { x: pos.x, y: pos.y };
  }
}