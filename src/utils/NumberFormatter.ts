export interface NumberFormatConfig {
  decimalSeparator: string;
  thousandSeparator: string;
  minDecimalPlaces: number;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
}

/**
 * Formats a number with thousand separators and decimal places.
 */
export function formatNumber(
  value: number,
  config: NumberFormatConfig,
  includeCurrency: boolean = false
): string {
  const fixed = value.toFixed(config.minDecimalPlaces);
  const parts = fixed.split('.');
  const integerPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
  const decimalPart = parts[1] || '';

  let result = integerPart;
  if (decimalPart) {
    result += config.decimalSeparator + decimalPart;
  }

  if (includeCurrency) {
    if (config.currencyPosition === 'prefix') {
      result = config.currencySymbol + ' ' + result;
    } else {
      result = result + ' ' + config.currencySymbol;
    }
  }

  return result;
}

/**
 * Formats a number without currency symbol (e.g., for display in win counters).
 */
export function formatNumberClean(value: number, config: NumberFormatConfig): string {
  return formatNumber(value, config, false);
}

/**
 * Formats a number with currency.
 */
export function formatCurrency(value: number, config: NumberFormatConfig): string {
  return formatNumber(value, config, true);
}

/**
 * Fix decimal places without rounding issues (string-based).
 */
export function fixDecimals(value: number | string, decimals: number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return parseFloat(num.toFixed(decimals));
}

/**
 * Safely add two numbers, preserving decimal precision.
 */
export function safeAdd(a: number, b: number): number {
  const factor = Math.pow(10, Math.max(decimalPlaces(a), decimalPlaces(b)));
  return (Math.round(a * factor) + Math.round(b * factor)) / factor;
}

/**
 * Safely subtract two numbers.
 */
export function safeSubtract(a: number, b: number): number {
  const factor = Math.pow(10, Math.max(decimalPlaces(a), decimalPlaces(b)));
  return (Math.round(a * factor) - Math.round(b * factor)) / factor;
}

/**
 * Safely multiply two numbers.
 */
export function safeMultiply(a: number, b: number): number {
  const factor = Math.pow(10, decimalPlaces(a) + decimalPlaces(b));
  return (Math.round(a * factor) * Math.round(b * factor)) / (factor * factor);
}

/**
 * Safely divide two numbers.
 */
export function safeDivide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  const factor = Math.pow(10, Math.max(decimalPlaces(a), decimalPlaces(b)));
  return (Math.round(a * factor) / Math.round(b * factor));
}

/**
 * Get the number of decimal places in a number.
 */
function decimalPlaces(n: number): number {
  const s = n.toString();
  const match = s.match(/\.(\d+)/);
  return match ? match[1]!.length : 0;
}