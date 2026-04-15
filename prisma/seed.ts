import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
    },
  });
  console.log('✅ Admin user created (admin / admin123)');

  // Create default scheduling rules
  const defaultRules = [
    { key: 'minLeadTimeDays', value: '28', description: 'Minimum days from now before a booking can be made' },
    { key: 'bookingDurationHours', value: '4', description: 'Fixed duration of each booking block in hours' },
    { key: 'gapBetweenBookingsHours', value: '2', description: 'Minimum gap between bookings for the same resource in hours' },
    { key: 'slotGranularityMinutes', value: '60', description: 'Slot interval in minutes' },
    { key: 'utStartHour', value: '9', description: 'UT booking window start hour (ET)' },
    { key: 'utEndHour', value: '17', description: 'UT booking window end hour (ET)' },
    { key: 'prodStartHour', value: '9', description: 'PROD booking window start hour (ET)' },
    { key: 'prodEndHour', value: '17', description: 'PROD booking window end hour (ET)' },
  ];

  for (const rule of defaultRules) {
    await prisma.schedulingRule.upsert({
      where: { key: rule.key },
      update: {},
      create: rule,
    });
  }
  console.log('✅ Scheduling rules seeded');

  // Block Saturday and Sunday by default
  for (const dayOfWeek of [0, 6]) { // 0=Sunday, 6=Saturday
    await prisma.blockedDay.upsert({
      where: { dayOfWeek },
      update: {},
      create: { dayOfWeek },
    });
  }
  console.log('✅ Weekend days blocked (Saturday, Sunday)');

  // Create sample resources
  const sampleResources = [
    { name: 'Engineer Alpha', email: 'alpha@booking.sys', osrCapable: true, maxBookingsPerDay: 1 },
    { name: 'Engineer Beta', email: 'beta@booking.sys', osrCapable: false, maxBookingsPerDay: 1 },
    { name: 'Engineer Gamma', email: 'gamma@booking.sys', osrCapable: true, maxBookingsPerDay: 1 },
  ];

  for (const resource of sampleResources) {
    await prisma.resource.upsert({
      where: { email: resource.email },
      update: {},
      create: resource,
    });
  }
  console.log('✅ Sample resources created');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
