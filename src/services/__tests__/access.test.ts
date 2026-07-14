import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateCode, logAccess } from '../access.js'
import type { PrismaClient } from '@prisma/client'

function createMockPrisma() {
  return {
    customer: { findFirst: vi.fn() },
    scheduleDate: { findFirst: vi.fn() },
    scheduleWeekday: { findFirst: vi.fn() },
    accessLog: { create: vi.fn() },
  } as unknown as PrismaClient
}

const fakeCustomer = {
  id: 'cust-1', name: 'John', code: '12345',
  enabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('validateCode', () => {
  let mock: PrismaClient

  beforeEach(() => {
    mock = createMockPrisma()
  })

  it('returns invalid_code when no customer matches', async () => {
    ;(mock.customer.findFirst as any).mockResolvedValue(null)

    const result = await validateCode(mock, '12345', new Date('2026-07-13T14:00:00'))

    expect(result.granted).toBe(false)
    expect(result.action).toBe('invalid_code')
    expect(result.customerId).toBeNull()
  })

  it('returns invalid_code when customer is disabled (findFirst with enabled=true returns null)', async () => {
    ;(mock.customer.findFirst as any).mockResolvedValue(null)

    const result = await validateCode(mock, '99999', new Date('2026-07-13T14:00:00'))

    expect(result.granted).toBe(false)
    expect(result.action).toBe('invalid_code')
  })

  it('returns door_open when schedule_date matches', async () => {
    ;(mock.customer.findFirst as any).mockResolvedValue(fakeCustomer)
    ;(mock.scheduleDate.findFirst as any).mockResolvedValue({
      id: 'sd-1', customerId: 'cust-1', date: new Date('2026-07-13'),
      startTime: '09:00', endTime: '17:00', enabled: true,
    })
    ;(mock.scheduleWeekday.findFirst as any).mockResolvedValue(null)

    const result = await validateCode(mock, '12345', new Date('2026-07-13T14:00:00'))

    expect(result.granted).toBe(true)
    expect(result.action).toBe('door_open')
    expect(result.scheduleDateId).toBe('sd-1')
    expect(result.scheduleWeekdayId).toBeNull()
  })

  it('returns door_open when schedule_weekday matches', async () => {
    ;(mock.customer.findFirst as any).mockResolvedValue(fakeCustomer)
    ;(mock.scheduleDate.findFirst as any).mockResolvedValue(null)
    ;(mock.scheduleWeekday.findFirst as any).mockResolvedValue({
      id: 'wk-1', customerId: 'cust-1', weekDay: 1,
      startTime: '09:00', endTime: '17:00', enabled: true,
    })

    const result = await validateCode(mock, '12345', new Date('2026-07-13T14:00:00'))

    expect(result.granted).toBe(true)
    expect(result.action).toBe('door_open')
    expect(result.scheduleDateId).toBeNull()
    expect(result.scheduleWeekdayId).toBe('wk-1')
  })

  it('returns no_schedule when no schedule matches', async () => {
    ;(mock.customer.findFirst as any).mockResolvedValue(fakeCustomer)
    ;(mock.scheduleDate.findFirst as any).mockResolvedValue(null)
    ;(mock.scheduleWeekday.findFirst as any).mockResolvedValue(null)

    const result = await validateCode(mock, '12345', new Date('2026-07-13T14:00:00'))

    expect(result.granted).toBe(false)
    expect(result.action).toBe('no_schedule')
    expect(result.customerId).toBe('cust-1')
  })
})

describe('logAccess', () => {
  let mock: PrismaClient

  beforeEach(() => {
    mock = createMockPrisma()
    ;(mock.accessLog.create as any).mockResolvedValue({ id: 'log-1' })
  })

  it('creates access log entry with provided data', async () => {
    await logAccess(mock, {
      codeEntered: '12345',
      success: false,
      action: 'invalid_code',
    })

    expect(mock.accessLog.create).toHaveBeenCalledWith({
      data: {
        customerId: null,
        codeEntered: '12345',
        success: false,
        action: 'invalid_code',
        scheduleDateId: null,
        scheduleWeekdayId: null,
      },
    })
  })

  it('passes optional customerId and schedule IDs', async () => {
    await logAccess(mock, {
      customerId: 'cust-1',
      codeEntered: '12345',
      success: true,
      action: 'door_open',
      scheduleDateId: 'sd-1',
    })

    expect(mock.accessLog.create).toHaveBeenCalledWith({
      data: {
        customerId: 'cust-1',
        codeEntered: '12345',
        success: true,
        action: 'door_open',
        scheduleDateId: 'sd-1',
        scheduleWeekdayId: null,
      },
    })
  })
})
