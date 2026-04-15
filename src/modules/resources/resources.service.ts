import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export async function getAllResources() {
  // Use simpler _count without where filter for broader Prisma compatibility
  const resources = await prisma.resource.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { bookings: true }
      }
    }
  });

  // Attach confirmed booking count separately for display
  const confirmedCounts = await prisma.booking.groupBy({
    by: ['resourceId'],
    where: { status: 'CONFIRMED' },
    _count: { id: true },
  });

  const countMap: Record<string, number> = {};
  confirmedCounts.forEach(c => { countMap[c.resourceId] = c._count.id; });

  return resources.map(r => ({
    ...r,
    confirmedBookingCount: countMap[r.id] ?? 0,
  }));
}

export async function getResourceById(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      bookings: {
        where: { status: 'CONFIRMED' },
        orderBy: { startTime: 'desc' },
        take: 10,
      }
    }
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  return resource;
}

export async function createResource(data: {
  name: string;
  email: string;
  osrCapable?: boolean;
  maxBookingsPerDay?: number;
  minGapOverride?: number | null;
  active?: boolean;
}) {
  const existing = await prisma.resource.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('A resource with this email already exists');
  }

  // Explicitly pick only valid Prisma fields
  return prisma.resource.create({
    data: {
      name: data.name,
      email: data.email,
      osrCapable: data.osrCapable ?? false,
      maxBookingsPerDay: data.maxBookingsPerDay ?? 1,
      minGapOverride: data.minGapOverride ?? null,
      active: data.active ?? true,
    }
  });
}

export async function updateResource(id: string, data: {
  name?: string;
  email?: string;
  osrCapable?: boolean;
  maxBookingsPerDay?: number;
  minGapOverride?: number | null;
  active?: boolean;
}) {
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  if (data.email && data.email !== resource.email) {
    const existing = await prisma.resource.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('A resource with this email already exists');
    }
  }

  // Build update object explicitly
  const updateData: any = {};
  if (data.name             !== undefined) updateData.name             = data.name;
  if (data.email            !== undefined) updateData.email            = data.email;
  if (data.osrCapable       !== undefined) updateData.osrCapable       = data.osrCapable;
  if (data.maxBookingsPerDay !== undefined) updateData.maxBookingsPerDay = data.maxBookingsPerDay;
  if (data.minGapOverride   !== undefined) updateData.minGapOverride   = data.minGapOverride;
  if (data.active           !== undefined) updateData.active           = data.active;

  return prisma.resource.update({ where: { id }, data: updateData });
}

export async function deleteResource(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } }
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  // Check for confirmed bookings specifically
  const confirmedCount = await prisma.booking.count({
    where: { resourceId: id, status: 'CONFIRMED' }
  });

  if (confirmedCount > 0) {
    // Soft delete — deactivate instead of removing
    return prisma.resource.update({
      where: { id },
      data: { active: false }
    });
  }

  return prisma.resource.delete({ where: { id } });
}
