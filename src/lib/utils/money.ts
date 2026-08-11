import { CURRENCY } from '@/lib/config';

/**
 * Format a VND amount as a localized currency string.
 * All amounts are stored as integers (no floating point).
 *
 * @example formatVND(59649) → "59,649 ₫"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' ' + CURRENCY.symbol;
}

/**
 * Format a VND amount compactly (for cards/badges).
 * @example formatVNDCompact(1500000) → "1.5M ₫"
 */
export function formatVNDCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M ${CURRENCY.symbol}`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(0)}K ${CURRENCY.symbol}`;
  }
  return formatVND(amount);
}

/**
 * Split an integer amount evenly among N people.
 * Uses largest-remainder method to ensure sum === total.
 *
 * @returns Array of N integer amounts that sum exactly to total
 */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [total];

  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base
  );
}

/**
 * Split an amount proportionally based on weights (e.g., sets played).
 * Uses largest-remainder method to ensure sum === total.
 *
 * @param total - Total amount to split (integer)
 * @param weights - Array of weights (e.g., sets per player)
 * @returns Array of integer amounts that sum exactly to total
 */
export function splitByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    // If all weights are 0, split evenly
    return splitEvenly(total, weights.length);
  }

  // Calculate exact proportions
  const exactShares = weights.map((w) => (total * w) / totalWeight);

  // Floor each share
  const floored = exactShares.map((s) => Math.floor(s));
  const flooredTotal = floored.reduce((sum, s) => sum + s, 0);
  let remainder = total - flooredTotal;

  // Distribute remainder using largest-remainder method
  const remainders = exactShares.map((s, i) => ({
    index: i,
    remainder: s - floored[i],
  }));

  // Sort by remainder descending
  remainders.sort((a, b) => b.remainder - a.remainder);

  const result = [...floored];
  for (let i = 0; i < remainder; i++) {
    result[remainders[i].index] += 1;
  }

  return result;
}

/**
 * Parse a VND string back to integer. Strips non-numeric chars.
 */
export function parseVND(value: string): number {
  const cleaned = value.replace(/[^\d-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}
