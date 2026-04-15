import { prisma } from '../../lib/prisma';
import { loadAllRules } from '../rules/rules.service';
import { createETDate, toET, fromET, TIMEZONE, formatETDate } from '../../utils/timezone';
import { addDays, addHours, addMinutes, isBefore, isAfter, eachDayOfInterval, endOfMonth, startOfDay } from 'date-fns';

interface AvailableSlot {
  startTime: string; // HH:mm in ET
  endTime: string;   // HH:mm in ET
}

interface AvailableDate {
  date: string;       // YYYY-MM-DD
  dayOfWeek: number;
  slots: AvailableSlot[];
}

interface AvailabilityQuery {
  environmentType: 'UT' | 'PROD';
  osrRequired: boolean;
  month?: string; // YYYY-MM
}

export async function getAvailability(query: AvailabilityQuery): Promise<{
  availableDates: AvailableDate[];
  timezone: string;
}> {
  const rules = await loadAllRules();

  // Load holidays
  const holidays = await prisma.holiday.findMany();
  const holidayDates = new Set(holidays.map(h => formatETDate(h.date)));

  // Load blocked days of week
  const blockedDays = await prisma.blockedDay.findMany();
  const blockedDaysOfWeek = new Set(blockedDays.map(b => b.dayOfWeek));

  // Load eligible resources
  const resourceWhere: any = { active: true };
  if (query.osrRequired) resourceWhere.osrCapable = true;

  const resources = await prisma.resource.findMany({ where: resourceWhere });
  if (resources.length === 0) return { availableDates: [], timezone: TIMEZONE };

  // Calculate date range
  const nowUtc = new Date();
  const earliestDate = addDays(nowUtc, rules.minLeadTimeDays);

  let rangeStart: Date;
  let rangeEnd: Date;

  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    const monthStart = createETDate(year, month, 1);
    const monthEnd = endOfMonth(toET(monthStart));

    if (isAfter(earliestDate, monthEnd)) return { availableDates: [], timezone: TIMEZONE };

    rangeStart = isAfter(earliestDate, monthStart) ? startOfDay(earliestDate) : monthStart;
    rangeEnd = monthEnd;
  } else {
    rangeStart = startOfDay(earliestDate);
    rangeEnd = addDays(rangeStart, 60);
  }

  // Determine working hours
  const startHour = query.environmentType === 'UT' ? rules.utStartHour : rules.prodStartHour;
  const endHour   = query.environmentType === 'UT' ? rules.utEndHour   : rules.prodEndHour;
  const duration  = rules.bookingDurationHours;
  const gapMins   = (rules.slotGranularityMinutes);
  const globalGap = rules.gapBetweenBookingsHours;

  // Load all existing CONFIRMED bookings in the range
  const existingBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: { gte: rangeStart },
      endTime:   { lte: addDays(rangeEnd, 1) },
    },
  });

  // Generate day-by-day
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const availableDates: AvailableDate[] = [];

  for (const day of days) {
    const etDay = toET(day);
    const dateStr = formatETDate(etDay);
    const dayOfWeek = etDay.getDay();

    // Skip blocked days
    if (blockedDaysOfWeek.has(dayOfWeek)) continue;
    // Skip holidays
    if (holidayDates.has(dateStr)) continue;

    const [y, m, d] = dateStr.split('-').map(Number);
    const slots: AvailableSlot[] = [];

    // Iterate possible start hours
    for (let hour = startHour; hour + duration <= endHour; hour += gapMins / 60) {
      const slotStartUtc = createETDate(y, m, d, hour);
      const slotEndUtc   = addHours(slotStartUtc, duration);

      // Skip slots in the past or before lead time
      if (isBefore(slotStartUtc, earliestDate)) continue;

      // Check if at least one resource can take this slot
      let slotAvailable = false;

      for (const resource of resources) {
        const resourceGap = resource.minGapOverride ?? globalGap;
        const maxPerDay   = resource.maxBookingsPerDay;

        // Bookings for this resource on this ET date
        const dayBookings = existingBookings.filter(b =>
          b.resourceId === resource.id && formatETDate(b.startTime) === dateStr
        );

        // Capacity check
        if (dayBookings.length >= maxPerDay) continue;

        // Conflict + gap check
        const hasConflict = dayBookings.some(b => {
          const gapStartUtc = addHours(b.startTime, -resourceGap);
          const gapEndUtc   = addHours(b.endTime,    resourceGap);
          return isBefore(slotStartUtc, gapEndUtc) && isAfter(slotEndUtc, gapStartUtc);
        });

        if (!hasConflict) { slotAvailable = true; break; }
      }

      if (slotAvailable) {
        const endHourNum = hour + duration;
        slots.push({
          startTime: `${String(hour).padStart(2, '0')}:00`,
          endTime:   `${String(endHourNum).padStart(2, '0')}:00`,
        });
      }
    }

    if (slots.length > 0) {
      availableDates.push({ date: dateStr, dayOfWeek, slots });
    }
  }

  return { availableDates, timezone: TIMEZONE };
}
