import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export async function getAllHolidays() {
  return prisma.holiday.findMany({
    orderBy: { date: 'asc' },
  });
}

export async function createHoliday(data: { date: string; description?: string }) {
  // Parse YYYY-MM-DD to a proper UTC midnight date for Prisma @db.Date
  const parts = data.date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new AppError('Invalid date format. Expected YYYY-MM-DD');
  }
  const [year, month, day] = parts;
  const dateObj = new Date(Date.UTC(year, month - 1, day));

  const existing = await prisma.holiday.findUnique({ where: { date: dateObj } });
  if (existing) {
    throw new AppError('This date is already marked as a holiday');
  }

  return prisma.holiday.create({
    data: {
      date: dateObj,
      description: data.description,
    },
  });
}

export async function deleteHoliday(id: string) {
  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) {
    throw new AppError('Holiday not found', 404);
  }

  return prisma.holiday.delete({ where: { id } });
}

// Blocked days of week management
export async function getBlockedDays() {
  return prisma.blockedDay.findMany({
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function addBlockedDay(dayOfWeek: number) {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new AppError('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }

  const existing = await prisma.blockedDay.findUnique({ where: { dayOfWeek } });
  if (existing) {
    throw new AppError('This day is already blocked');
  }

  return prisma.blockedDay.create({
    data: { dayOfWeek },
  });
}

export async function removeBlockedDay(id: string) {
  const blockedDay = await prisma.blockedDay.findUnique({ where: { id } });
  if (!blockedDay) {
    throw new AppError('Blocked day not found', 404);
  }

  return prisma.blockedDay.delete({ where: { id } });
}
