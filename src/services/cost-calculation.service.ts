import type { CostCalculationMethod } from '@/lib/config';
import type { UserCostBreakdown } from '@/types';
import { splitEvenly, splitByWeight } from '@/lib/utils/money';

interface AttendeeData {
  userId: string;
  userName: string;
  setsPlayed: number;
}

interface SessionCostInput {
  courtCost: number;
  shuttlecockCost: number;
  otherCost: number;
  calculationMethod: CostCalculationMethod;
  attendees: AttendeeData[];
}

/**
 * Calculate cost breakdown for a session.
 *
 * INVARIANT: sum(all user totals) === courtCost + shuttlecockCost + otherCost
 *
 * Methods:
 * - EQUAL: All costs split equally among attendees
 * - BY_SET: All costs split proportionally by sets played
 * - HYBRID: Court cost → equal, Shuttlecock → by sets, Other → equal
 */
export function calculateSessionCosts(input: SessionCostInput): UserCostBreakdown[] {
  const { courtCost, shuttlecockCost, otherCost, calculationMethod, attendees } = input;

  if (attendees.length === 0) return [];

  const totalCost = courtCost + shuttlecockCost + otherCost;
  if (totalCost === 0) {
    return attendees.map((a) => ({
      userId: a.userId,
      userName: a.userName,
      setsPlayed: a.setsPlayed,
      courtShare: 0,
      shuttlecockShare: 0,
      otherShare: 0,
      totalAmount: 0,
    }));
  }

  switch (calculationMethod) {
    case 'EQUAL':
      return calculateEqual(courtCost, shuttlecockCost, otherCost, attendees);
    case 'BY_SET':
      return calculateBySet(courtCost, shuttlecockCost, otherCost, attendees);
    case 'HYBRID':
      return calculateHybrid(courtCost, shuttlecockCost, otherCost, attendees);
    default:
      return calculateHybrid(courtCost, shuttlecockCost, otherCost, attendees);
  }
}

/**
 * EQUAL: All costs split equally among attendees
 */
function calculateEqual(
  courtCost: number,
  shuttlecockCost: number,
  otherCost: number,
  attendees: AttendeeData[]
): UserCostBreakdown[] {
  const n = attendees.length;
  const totalCost = courtCost + shuttlecockCost + otherCost;

  // Split total cost evenly (this guarantees sum === total)
  const totalShares = splitEvenly(totalCost, n);

  // For breakdown display, split each component evenly too
  const courtShares = splitEvenly(courtCost, n);
  const shuttleShares = splitEvenly(shuttlecockCost, n);
  const otherShares = splitEvenly(otherCost, n);

  // Adjust component shares to match total shares
  return attendees.map((a, i) => ({
    userId: a.userId,
    userName: a.userName,
    setsPlayed: a.setsPlayed,
    courtShare: courtShares[i],
    shuttlecockShare: shuttleShares[i],
    otherShare: otherShares[i],
    totalAmount: totalShares[i],
  }));
}

/**
 * BY_SET: All costs split proportionally by sets played
 */
function calculateBySet(
  courtCost: number,
  shuttlecockCost: number,
  otherCost: number,
  attendees: AttendeeData[]
): UserCostBreakdown[] {
  const weights = attendees.map((a) => a.setsPlayed);
  const totalCost = courtCost + shuttlecockCost + otherCost;

  const totalShares = splitByWeight(totalCost, weights);
  const courtShares = splitByWeight(courtCost, weights);
  const shuttleShares = splitByWeight(shuttlecockCost, weights);
  const otherShares = splitByWeight(otherCost, weights);

  return attendees.map((a, i) => ({
    userId: a.userId,
    userName: a.userName,
    setsPlayed: a.setsPlayed,
    courtShare: courtShares[i],
    shuttlecockShare: shuttleShares[i],
    otherShare: otherShares[i],
    totalAmount: totalShares[i],
  }));
}

/**
 * HYBRID: Court → equal, Shuttlecock → by sets, Other → equal
 * This is the recommended default method.
 */
function calculateHybrid(
  courtCost: number,
  shuttlecockCost: number,
  otherCost: number,
  attendees: AttendeeData[]
): UserCostBreakdown[] {
  const n = attendees.length;
  const weights = attendees.map((a) => a.setsPlayed);

  // Court: split equally
  const courtShares = splitEvenly(courtCost, n);

  // Shuttlecock: split by sets
  const shuttleShares = splitByWeight(shuttlecockCost, weights);

  // Other: split equally
  const otherShares = splitEvenly(otherCost, n);

  return attendees.map((a, i) => {
    const total = courtShares[i] + shuttleShares[i] + otherShares[i];
    return {
      userId: a.userId,
      userName: a.userName,
      setsPlayed: a.setsPlayed,
      courtShare: courtShares[i],
      shuttlecockShare: shuttleShares[i],
      otherShare: otherShares[i],
      totalAmount: total,
    };
  });
}

/**
 * Validate that cost breakdown sums match session totals.
 * This should always be true if the calculation is correct.
 */
export function validateCostBreakdown(
  breakdowns: UserCostBreakdown[],
  courtCost: number,
  shuttlecockCost: number,
  otherCost: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const totalCourt = breakdowns.reduce((sum, b) => sum + b.courtShare, 0);
  const totalShuttle = breakdowns.reduce((sum, b) => sum + b.shuttlecockShare, 0);
  const totalOther = breakdowns.reduce((sum, b) => sum + b.otherShare, 0);
  const totalAmount = breakdowns.reduce((sum, b) => sum + b.totalAmount, 0);
  const expectedTotal = courtCost + shuttlecockCost + otherCost;

  if (totalCourt !== courtCost) {
    errors.push(`Court cost mismatch: ${totalCourt} !== ${courtCost}`);
  }
  if (totalShuttle !== shuttlecockCost) {
    errors.push(`Shuttlecock cost mismatch: ${totalShuttle} !== ${shuttlecockCost}`);
  }
  if (totalOther !== otherCost) {
    errors.push(`Other cost mismatch: ${totalOther} !== ${otherCost}`);
  }
  if (totalAmount !== expectedTotal) {
    errors.push(`Total amount mismatch: ${totalAmount} !== ${expectedTotal}`);
  }

  return { valid: errors.length === 0, errors };
}
