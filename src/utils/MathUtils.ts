/**
 * Returns a random integer between min (inclusive) and max (exclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Returns a random float between min (inclusive) and max (exclusive).
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Performs weighted random selection from an array of options with weights.
 * Returns the selected item and its index.
 */
export function weightedRandom<T>(items: T[], weights: number[]): { item: T; index: number } {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have the same length');
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i]!;
    if (rand <= 0) {
      return { item: items[i]!, index: i };
    }
  }
  return { item: items[items.length - 1]!, index: items.length - 1 };
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Shuffles an array in place (Fisher-Yates).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}