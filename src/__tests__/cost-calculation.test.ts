import { describe, it, expect } from 'vitest';
import { calculateSessionCosts, validateCostBreakdown } from '@/services/cost-calculation.service';
import { splitEvenly, splitByWeight, formatVND } from '@/lib/utils/money';

describe('splitEvenly', () => {
  it('should split evenly when divisible', () => {
    const result = splitEvenly(300000, 3);
    expect(result).toEqual([100000, 100000, 100000]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(300000);
  });

  it('should handle remainder correctly', () => {
    const result = splitEvenly(100000, 3);
    // 100000 / 3 = 33333 remainder 1
    expect(result).toEqual([33334, 33333, 33333]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100000);
  });

  it('should handle single person', () => {
    const result = splitEvenly(250000, 1);
    expect(result).toEqual([250000]);
  });

  it('should handle zero people', () => {
    expect(splitEvenly(100000, 0)).toEqual([]);
  });

  it('should handle zero amount', () => {
    const result = splitEvenly(0, 5);
    expect(result.reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('should handle large remainder', () => {
    const result = splitEvenly(7, 3);
    expect(result).toEqual([3, 2, 2]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(7);
  });
});

describe('splitByWeight', () => {
  it('should split proportionally', () => {
    const result = splitByWeight(100000, [5, 5, 5, 5]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100000);
    // Equal weights -> equal split
    result.forEach(v => expect(v).toBe(25000));
  });

  it('should handle different weights', () => {
    const result = splitByWeight(100000, [5, 3, 2]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100000);
    // 50000, 30000, 20000
    expect(result).toEqual([50000, 30000, 20000]);
  });

  it('should handle non-divisible proportions', () => {
    const result = splitByWeight(100000, [5, 5, 4, 3, 2]);
    // total weight = 19
    // sum must equal 100000
    expect(result.reduce((s, v) => s + v, 0)).toBe(100000);
  });

  it('should handle all zero weights (falls back to even split)', () => {
    const result = splitByWeight(100000, [0, 0, 0]);
    expect(result.reduce((s, v) => s + v, 0)).toBe(100000);
  });

  it('should handle single weight', () => {
    const result = splitByWeight(50000, [7]);
    expect(result).toEqual([50000]);
  });
});

describe('calculateSessionCosts', () => {
  const attendees = [
    { userId: '1', userName: 'Nguyen A', setsPlayed: 5 },
    { userId: '2', userName: 'Nguyen B', setsPlayed: 5 },
    { userId: '3', userName: 'Nguyen C', setsPlayed: 4 },
    { userId: '4', userName: 'Nguyen D', setsPlayed: 3 },
    { userId: '5', userName: 'Nguyen E', setsPlayed: 2 },
  ];

  it('HYBRID: court split equally, shuttle by sets', () => {
    const result = calculateSessionCosts({
      courtCost: 200000,
      shuttlecockCost: 100000,
      otherCost: 0,
      calculationMethod: 'HYBRID',
      attendees,
    });

    expect(result.length).toBe(5);

    // Validate sum invariant
    const validation = validateCostBreakdown(result, 200000, 100000, 0);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    // Court: 200000 / 5 = 40000 each
    result.forEach(r => expect(r.courtShare).toBe(40000));

    // Total must match
    const totalAmount = result.reduce((s, r) => s + r.totalAmount, 0);
    expect(totalAmount).toBe(300000);
  });

  it('EQUAL: all costs split equally', () => {
    const result = calculateSessionCosts({
      courtCost: 200000,
      shuttlecockCost: 100000,
      otherCost: 50000,
      calculationMethod: 'EQUAL',
      attendees,
    });

    const validation = validateCostBreakdown(result, 200000, 100000, 50000);
    expect(validation.valid).toBe(true);
  });

  it('BY_SET: all costs proportional to sets', () => {
    const result = calculateSessionCosts({
      courtCost: 200000,
      shuttlecockCost: 100000,
      otherCost: 0,
      calculationMethod: 'BY_SET',
      attendees,
    });

    const validation = validateCostBreakdown(result, 200000, 100000, 0);
    expect(validation.valid).toBe(true);

    // Higher sets = higher cost
    const sorted = [...result].sort((a, b) => b.setsPlayed - a.setsPlayed);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].totalAmount).toBeGreaterThanOrEqual(sorted[i].totalAmount);
    }
  });

  it('handles single attendee', () => {
    const result = calculateSessionCosts({
      courtCost: 200000,
      shuttlecockCost: 100000,
      otherCost: 50000,
      calculationMethod: 'HYBRID',
      attendees: [{ userId: '1', userName: 'Nguyen A', setsPlayed: 5 }],
    });

    expect(result.length).toBe(1);
    expect(result[0].totalAmount).toBe(350000);

    const validation = validateCostBreakdown(result, 200000, 100000, 50000);
    expect(validation.valid).toBe(true);
  });

  it('handles zero costs', () => {
    const result = calculateSessionCosts({
      courtCost: 0,
      shuttlecockCost: 0,
      otherCost: 0,
      calculationMethod: 'HYBRID',
      attendees,
    });

    result.forEach(r => expect(r.totalAmount).toBe(0));
  });

  it('handles no attendees', () => {
    const result = calculateSessionCosts({
      courtCost: 200000,
      shuttlecockCost: 100000,
      otherCost: 0,
      calculationMethod: 'HYBRID',
      attendees: [],
    });

    expect(result).toEqual([]);
  });

  it('handles attendees with zero sets in HYBRID', () => {
    const zerosAttendees = [
      { userId: '1', userName: 'A', setsPlayed: 0 },
      { userId: '2', userName: 'B', setsPlayed: 0 },
    ];

    const result = calculateSessionCosts({
      courtCost: 100000,
      shuttlecockCost: 100000,
      otherCost: 0,
      calculationMethod: 'HYBRID',
      attendees: zerosAttendees,
    });

    const validation = validateCostBreakdown(result, 100000, 100000, 0);
    expect(validation.valid).toBe(true);
  });

  it('sum invariant holds for many edge cases', () => {
    const costs = [
      { court: 199999, shuttle: 100001, other: 7 },
      { court: 1, shuttle: 1, other: 1 },
      { court: 333333, shuttle: 777777, other: 111111 },
    ];

    const methods: Array<'EQUAL' | 'BY_SET' | 'HYBRID'> = ['EQUAL', 'BY_SET', 'HYBRID'];

    for (const c of costs) {
      for (const method of methods) {
        const result = calculateSessionCosts({
          courtCost: c.court,
          shuttlecockCost: c.shuttle,
          otherCost: c.other,
          calculationMethod: method,
          attendees,
        });

        const validation = validateCostBreakdown(result, c.court, c.shuttle, c.other);
        expect(validation.valid).toBe(true);
      }
    }
  });
});

describe('formatVND', () => {
  it('formats correctly', () => {
    expect(formatVND(59649)).toBe('59.649 ₫');
    expect(formatVND(0)).toBe('0 ₫');
    expect(formatVND(1000000)).toBe('1.000.000 ₫');
  });
});
