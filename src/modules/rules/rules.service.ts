import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export async function getAllRules() {
  return prisma.schedulingRule.findMany({
    orderBy: { key: 'asc' },
  });
}

export async function getRuleValue(key: string): Promise<string> {
  const rule = await prisma.schedulingRule.findUnique({ where: { key } });
  if (!rule) {
    throw new AppError(`Rule '${key}' not found`, 404);
  }
  return rule.value;
}

export async function getRuleAsNumber(key: string): Promise<number> {
  const value = await getRuleValue(key);
  const num = Number(value);
  if (isNaN(num)) {
    throw new AppError(`Rule '${key}' is not a valid number`);
  }
  return num;
}

export async function updateRule(key: string, value: string, description?: string) {
  const rule = await prisma.schedulingRule.findUnique({ where: { key } });
  if (!rule) {
    throw new AppError(`Rule '${key}' not found`, 404);
  }

  return prisma.schedulingRule.update({
    where: { key },
    data: {
      value,
      ...(description !== undefined && { description }),
    },
  });
}

/**
 * Load all scheduling rules as a typed object for the availability engine
 */
export async function loadAllRules() {
  const rules = await prisma.schedulingRule.findMany();
  const ruleMap: Record<string, string> = {};
  
  for (const rule of rules) {
    ruleMap[rule.key] = rule.value;
  }

  return {
    minLeadTimeDays: Number(ruleMap['minLeadTimeDays'] || '28'),
    bookingDurationHours: Number(ruleMap['bookingDurationHours'] || '4'),
    gapBetweenBookingsHours: Number(ruleMap['gapBetweenBookingsHours'] || '2'),
    slotGranularityMinutes: Number(ruleMap['slotGranularityMinutes'] || '60'),
    utStartHour: Number(ruleMap['utStartHour'] || '9'),
    utEndHour: Number(ruleMap['utEndHour'] || '17'),
    prodStartHour: Number(ruleMap['prodStartHour'] || '9'),
    prodEndHour: Number(ruleMap['prodEndHour'] || '17'),
  };
}
