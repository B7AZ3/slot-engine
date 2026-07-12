/**
 * Lightweight DOM utilities to replace jQuery.
 * Supports the subset of jQuery operations used by the engine.
 */

export const $ = (selector: string | HTMLElement, context?: HTMLElement | Document): HTMLElement | null => {
  if (typeof selector === 'string') {
    return (context || document).querySelector(selector) as HTMLElement | null;
  }
  return selector;
};

export const $$ = (selector: string, context?: HTMLElement | Document): NodeListOf<HTMLElement> => {
  return (context || document).querySelectorAll(selector) as NodeListOf<HTMLElement>;
};

export const el = (tag: string, className?: string, html?: string): HTMLElement => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
};

export const css = (el: HTMLElement | null, prop: string | Record<string, string>, value?: string): void => {
  if (!el) return;
  if (typeof prop === 'string') {
    if (value !== undefined) {
      el.style.setProperty(prop, value);
    }
  } else {
    for (const [key, val] of Object.entries(prop)) {
      el.style.setProperty(key, val);
    }
  }
};

export const html = (el: HTMLElement | null, content?: string): string | void => {
  if (!el) return;
  if (content !== undefined) {
    el.innerHTML = content;
  } else {
    return el.innerHTML;
  }
};

export const text = (el: HTMLElement | null, content?: string): string | void => {
  if (!el) return;
  if (content !== undefined) {
    el.textContent = content;
  } else {
    return el.textContent || '';
  }
};

export const addClass = (el: HTMLElement | null, className: string): void => {
  if (!el) return;
  el.classList.add(className);
};

export const removeClass = (el: HTMLElement | null, className: string): void => {
  if (!el) return;
  el.classList.remove(className);
};

export const toggleClass = (el: HTMLElement | null, className: string): void => {
  if (!el) return;
  el.classList.toggle(className);
};

export const hasClass = (el: HTMLElement | null, className: string): boolean => {
  return !!el && el.classList.contains(className);
};

export const on = (el: HTMLElement | Document | null, event: string, handler: EventListener): void => {
  if (!el) return;
  el.addEventListener(event, handler);
};

export const off = (el: HTMLElement | Document | null, event: string, handler: EventListener): void => {
  if (!el) return;
  el.removeEventListener(event, handler);
};

export const append = (parent: HTMLElement | null, child: HTMLElement): void => {
  if (!parent) return;
  parent.appendChild(child);
};

export const empty = (el: HTMLElement | null): void => {
  if (!el) return;
  el.innerHTML = '';
};

export const show = (el: HTMLElement | null, display: string = 'block'): void => {
  if (!el) return;
  css(el, 'display', display);
};

export const hide = (el: HTMLElement | null): void => {
  if (!el) return;
  css(el, 'display', 'none');
};