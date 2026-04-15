import { prisma } from '../../lib/prisma';
import { loadAllRules } from '../rules/rules.service';
import { AppError } from '../../middleware/error.middleware';
import { toET, fromET, createETDate, formatETDate, TIMEZONE } from '../../utils/timezone';
import { addDays, addHours, isBefore, isAfter } from 'date-fns';

interface CreateBookingData {
  caseNumber: string;
  environmentType: 'UT' | 'PROD';
  osrRequired: boolean;
  startTime: string; // ISO 8601 or YYYY-MM-DDTHH:mm
  notes?: string;
}

/**
 * Parse the customer's submitted startTime as an ET wall-clock time
 * e.g. "2026-06-01T09:00" → 9 AM ET → UTC
 */
function parseStartTimeAsET(startTimeStr: string): Date {
  // If it already has a Z or offset, parse normally
  if (startTimeStr.endsWith('Z') || startTimeStr.includes('+') || (startTimeStr.length > 19 && startTimeStr[19] === '-')) {
    return new Date(startTimeStr);
  }
  // Otherwise treat it as ET wall clock
  const [datePart, timePart] = startTimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  return createETDate(year, month, day, hour, minute ?? 0);
}

/**
 * Create a customer booking — enforces all rules
 */
export async function createBooking(data: CreateBookingData) {
  const rules = await loadAllRules();
  const slotStartUtc = parseStartTimeAsET(data.startTime);
  const slotEndUtc   = addHours(slotStartUtc, rules.bookingDurationHours);
  const etSlotStart  = toET(slotStartUtc);
  const dateStr      = formatETDate(slotStartUtc);
  const slotHour     = etSlotStart.getHours();

  // Validate lead time
  const earliestDate = addDays(new Date(), rules.minLeadTimeDays);
  if (isBefore(slotStartUtc, earliestDate)) {
    throw new AppError(`Booking must be at least ${rules.minLeadTimeDays} days in advance`);
  }

  // Validate working hours
  const startHour = data.environmentType === 'UT' ? rules.utStartHour : rules.prodStartHour;
  const endHour   = data.environmentType === 'UT' ? rules.utEndHour   : rules.prodEndHour;
  if (slotHour < startHour || slotHour + rules.bookingDurationHours > endHour) {
    throw new AppError(`Booking must be within working hours (${startHour}:00–${endHour}:00 ET)`);
  }

  // Check holiday
  const holidays = await prisma.holiday.findMany();
  if (holidays.some(h => formatETDate(h.date) === dateStr)) {
    throw new AppError('Cannot book on a holiday');
  }

  // Check blocked day of week
  const dayOfWeek   = etSlotStart.getDay();
  const blockedDays = await prisma.blockedDay.findMany();
  if (blockedDays.some(b => b.dayOfWeek === dayOfWeek)) {
    throw new AppError('Cannot book on a blocked day');
  }

  const resource = await findEligibleResource(data, slotStartUtc, slotEndUtc, dateStr, rules);

  return prisma.booking.create({
    data: {
      caseNumber:      data.caseNumber,
      environmentType: data.environmentType,
      osrRequired:     data.osrRequired,
      startTime:       slotStartUtc,
      endTime:         slotEndUtc,
      resourceId:      resource.id,
      notes:           data.notes,
      createdBy:       'customer',
    },
    include: { resource: true },
  });
}

/**
 * Create an admin booking — bypasses lead time, holiday, and blocked-day rules
 */
export async function createAdminBooking(data: CreateBookingData & { resourceId?: string }) {
  const rules = await loadAllRules();
  const slotStartUtc = parseStartTimeAsET(data.startTime);
  const slotEndUtc   = addHours(slotStartUtc, rules.bookingDurationHours);
  const dateStr      = formatETDate(slotStartUtc);

  let resourceId = data.resourceId;
  if (!resourceId) {
    const resource = await findEligibleResource(data, slotStartUtc, slotEndUtc, dateStr, rules, true);
    resourceId = resource.id;
  }

  return prisma.booking.create({
    data: {
      caseNumber:      data.caseNumber,
      environmentType: data.environmentType,
      osrRequired:     data.osrRequired,
      startTime:       slotStartUtc,
      endTime:         slotEndUtc,
      resourceId,
      notes:           data.notes,
      createdBy:       'admin',
    },
    include: { resource: true },
  });
}

async function findEligibleResource(
  data: Pick<CreateBookingData, 'osrRequired'>,
  slotStartUtc: Date,
  slotEndUtc: Date,
  dateStr: string,
  rules: Awaited<ReturnType<typeof loadAllRules>>,
  _isAdmin = false,
) {
  const resourceWhere: any = { active: true };
  if (data.osrRequired) resourceWhere.osrCapable = true;

  const resources = await prisma.resource.findMany({
    where: resourceWhere,
    include: { bookings: { where: { status: 'CONFIRMED' } } },
  });

  if (resources.length === 0) {
    throw new AppError(data.osrRequired ? 'No OSR-capable resources available' : 'No resources available', 409);
  }

  const eligible = resources
    .filter(resource => {
      const resourceGap  = resource.minGapOverride ?? rules.gapBetweenBookingsHours;
      const dayBookings  = resource.bookings.filter(b => formatETDate(b.startTime) === dateStr);

      if (dayBookings.length >= resource.maxBookingsPerDay) return false;

      return !dayBookings.some(b => {
        const gapStart = addHours(b.startTime, -resourceGap);
        const gapEnd   = addHours(b.endTime,    resourceGap);
        return isBefore(slotStartUtc, gapEnd) && isAfter(slotEndUtc, gapStart);
      });
    })
    .sort((a, b) => a.bookings.length - b.bookings.length); // least loaded first

  if (eligible.length === 0) {
    throw new AppError('No available resource for this time slot', 409);
  }

  return eligible[0];
}

export async function getAllBookings(filters?: {
  status?: string;
  environmentType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: any = {};
  if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters?.environmentType && filters.environmentType !== 'ALL') where.environmentType = filters.environmentType;
  if (filters?.startDate || filters?.endDate) {
    where.startTime = {};
    if (filters.startDate) where.startTime.gte = new Date(filters.startDate);
    if (filters.endDate)   where.startTime.lte = new Date(filters.endDate);
  }

  return prisma.booking.findMany({
    where,
    include: { resource: true },
    orderBy: { startTime: 'asc' },
  });
}

export async function getBookingById(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { resource: true },
  });
  if (!booking) throw new AppError('Booking not found', 404);
  return booking;
}

export async function updateBooking(id: string, data: {
  caseNumber?: string;
  environmentType?: 'UT' | 'PROD';
  osrRequired?: boolean;
  startTime?: string;
  notes?: string;
  status?: 'CONFIRMED' | 'CANCELLED';
  resourceId?: string;
}) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new AppError('Booking not found', 404);

  // Build update object explicitly — never spread raw request data into Prisma
  const updateData: any = {};
  if (data.caseNumber     !== undefined) updateData.caseNumber      = data.caseNumber;
  if (data.environmentType !== undefined) updateData.environmentType = data.environmentType;
  if (data.osrRequired    !== undefined) updateData.osrRequired     = data.osrRequired;
  if (data.notes          !== undefined) updateData.notes           = data.notes;
  if (data.status         !== undefined) updateData.status          = data.status;
  if (data.resourceId     !== undefined) updateData.resourceId      = data.resourceId;

  if (data.startTime) {
    const rules = await loadAllRules();
    updateData.startTime = parseStartTimeAsET(data.startTime);
    updateData.endTime   = addHours(updateData.startTime, rules.bookingDurationHours);
  }

  return prisma.booking.update({
    where: { id },
    data: updateData,
    include: { resource: true },
  });
}

export async function deleteBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError('Booking not found', 404);
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
}
