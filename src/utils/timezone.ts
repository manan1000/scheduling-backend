import { toZonedTime, fromZonedTime, format as formatTZ } from 'date-fns-tz';
import { format, startOfDay, endOfDay } from 'date-fns';

export const TIMEZONE = 'America/New_York';

/**
 * Convert a UTC date to Eastern Time zoned date
 */
export function toET(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, TIMEZONE);
}

/**
 * Convert a local wall-clock time in ET to UTC
 */
export function fromET(date: Date): Date {
  return fromZonedTime(date, TIMEZONE);
}

/**
 * Create a date representing a specific ET wall-clock time, returned as UTC
 */
export function createETDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
  // Build the wall-clock date in ET
  const wallClock = new Date(year, month - 1, day, hour, minute, 0, 0);
  return fromZonedTime(wallClock, TIMEZONE);
}

/**
 * Get the hour in Eastern Time from a UTC date
 */
export function getETHour(date: Date): number {
  return toZonedTime(date, TIMEZONE).getHours();
}

/**
 * Get the day of week in Eastern Time (0=Sunday, 6=Saturday)
 */
export function getETDayOfWeek(date: Date): number {
  return toZonedTime(date, TIMEZONE).getDay();
}

/**
 * Format a date to YYYY-MM-DD in ET
 */
export function formatETDate(date: Date): string {
  return formatTZ(toZonedTime(date, TIMEZONE), 'yyyy-MM-dd', { timeZone: TIMEZONE });
}

/**
 * Get the current time in ET
 */
export function nowET(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}
