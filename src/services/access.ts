import { PrismaClient } from '@prisma/client'

export interface ValidationResult {
  granted: boolean
  customerId: string | null
  scheduleDateId: string | null
  scheduleWeekdayId: string | null
  action: 'door_open' | 'invalid_code' | 'no_schedule'
  codeEntered: string
}

export async function validateCode(
  prisma: PrismaClient,
  code: string,
  now: Date
): Promise<ValidationResult> {
  const customer = await prisma.customer.findFirst({
    where: { code, enabled: true },
  })

  if (!customer) {
    return {
      granted: false,
      customerId: null,
      scheduleDateId: null,
      scheduleWeekdayId: null,
      action: 'invalid_code',
      codeEntered: code,
    }
  }

  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5)

  const dateMatch = await prisma.scheduleDate.findFirst({
    where: {
      customerId: customer.id,
      enabled: true,
      date: dateStr,
      startTime: { lte: timeStr },
      endTime: { gte: timeStr },
    },
  })

  if (dateMatch) {
    return {
      granted: true,
      customerId: customer.id,
      scheduleDateId: dateMatch.id,
      scheduleWeekdayId: null,
      action: 'door_open',
      codeEntered: code,
    }
  }

  const dayOfWeek = now.getDay()

  const weekdayMatch = await prisma.scheduleWeekday.findFirst({
    where: {
      customerId: customer.id,
      enabled: true,
      weekDay: dayOfWeek,
      startTime: { lte: timeStr },
      endTime: { gte: timeStr },
    },
  })

  if (weekdayMatch) {
    return {
      granted: true,
      customerId: customer.id,
      scheduleDateId: null,
      scheduleWeekdayId: weekdayMatch.id,
      action: 'door_open',
      codeEntered: code,
    }
  }

  return {
    granted: false,
    customerId: customer.id,
    scheduleDateId: null,
    scheduleWeekdayId: null,
    action: 'no_schedule',
    codeEntered: code,
  }
}

export async function logAccess(
  prisma: PrismaClient,
  params: {
    customerId?: string
    codeEntered: string
    success: boolean
    action: string
    scheduleDateId?: string
    scheduleWeekdayId?: string
  }
): Promise<void> {
  await prisma.accessLog.create({
    data: {
      customerId: params.customerId ?? null,
      codeEntered: params.codeEntered,
      success: params.success,
      action: params.action,
      scheduleDateId: params.scheduleDateId ?? null,
      scheduleWeekdayId: params.scheduleWeekdayId ?? null,
    },
  })
}
