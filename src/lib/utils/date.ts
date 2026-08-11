import { format, parseISO, addHours, subHours, isAfter, isBefore, startOfWeek, endOfWeek, addWeeks, setDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { TIMEZONE } from '@/lib/config';

/**
 * Get the current time in the club's timezone
 */
export function nowInTimezone(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Format a date string for display (e.g., "11 Aug 2026")
 */
export function formatDate(dateStr: string): string {
  return formatInTimeZone(parseISO(dateStr), TIMEZONE, 'dd MMM yyyy');
}

/**
 * Format a date as short (e.g., "11 Aug")
 */
export function formatDateShort(dateStr: string): string {
  return formatInTimeZone(parseISO(dateStr), TIMEZONE, 'dd MMM');
}

/**
 * Format a time string (e.g., "19:00")
 */
export function formatTime(timeStr: string): string {
  // timeStr could be "19:00:00" or "19:00"
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Format date and time together (e.g., "Mon, 11 Aug · 19:00 - 21:00")
 */
export function formatSessionDateTime(
  dateStr: string,
  startTime: string,
  endTime: string
): string {
  const dayName = formatInTimeZone(parseISO(dateStr), TIMEZONE, 'EEE');
  return `${dayName}, ${formatDate(dateStr)} · ${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Get day name from day_of_week number (0=Sunday)
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

/**
 * Get short day name (e.g., "Mon")
 */
export function getDayNameShort(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek] || '?';
}

/**
 * Combine a date string (YYYY-MM-DD) and time string (HH:mm:ss) into a Date object
 * in the club's timezone
 */
export function combineDateTime(dateStr: string, timeStr: string): Date {
  const combined = `${dateStr}T${timeStr}`;
  return toZonedTime(new Date(combined), TIMEZONE);
}

/**
 * Calculate registration open/close times from session start
 */
export function calculateRegistrationTimes(
  sessionDate: string,
  sessionStartTime: string,
  openHoursBefore: number,
  closeHoursBefore: number
): { openAt: Date; closeAt: Date } {
  const sessionStart = combineDateTime(sessionDate, sessionStartTime);
  return {
    openAt: subHours(sessionStart, openHoursBefore),
    closeAt: subHours(sessionStart, closeHoursBefore),
  };
}

/**
 * Check if registration is currently open
 */
export function isRegistrationOpen(
  registrationOpenAt: string | null,
  registrationCloseAt: string | null
): boolean {
  if (!registrationOpenAt || !registrationCloseAt) return false;
  const now = new Date();
  const openAt = parseISO(registrationOpenAt);
  const closeAt = parseISO(registrationCloseAt);
  return isAfter(now, openAt) && isBefore(now, closeAt);
}

/**
 * Check if the session is starting within 24 hours
 */
export function isWithin24Hours(
  sessionDate: string,
  sessionStartTime: string
): boolean {
  const sessionStart = combineDateTime(sessionDate, sessionStartTime);
  const now = new Date();
  const diffMs = sessionStart.getTime() - now.getTime();
  const hoursRemaining = diffMs / 3600000;
  return hoursRemaining <= 24;
}

/**
 * Determine if a cancellation is early or late
 */
export function getCancellationType(
  sessionDate: string,
  sessionStartTime: string,
  lateCancellationHours: number
): 'EARLY' | 'LATE' {
  const sessionStart = combineDateTime(sessionDate, sessionStartTime);
  const lateThreshold = subHours(sessionStart, lateCancellationHours);
  const now = new Date();
  return isAfter(now, lateThreshold) ? 'LATE' : 'EARLY';
}

/**
 * Get the start and end dates for the current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = nowInTimezone();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

/**
 * Generate dates for a specific day of week, N weeks ahead
 */
export function generateDatesForDay(
  dayOfWeek: number,
  weeksAhead: number,
  startFrom?: Date
): Date[] {
  const dates: Date[] = [];
  const start = startFrom || nowInTimezone();

  for (let week = 0; week < weeksAhead; week++) {
    const weekStart = addWeeks(startOfWeek(start, { weekStartsOn: 1 }), week);
    const targetDate = setDay(weekStart, dayOfWeek, { weekStartsOn: 1 });

    // Only include future dates
    if (isAfter(targetDate, start)) {
      dates.push(targetDate);
    }
  }

  return dates;
}

/**
 * Format a relative time (e.g., "in 2 hours", "3 days ago")
 */
export function getRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}
