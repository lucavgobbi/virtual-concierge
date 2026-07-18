// src/lib/services/access.ts
import { supabaseAdmin } from '@/lib/supabase/client'

export interface CodeValidationResult {
  granted: boolean
  intercomCodeId: string | null
  scheduleId: string | null
  status: 'success' | 'invalid_code' | 'invalid_schedule'
}

export interface AccessLogParams {
  intercomId: string
  codeEntered: string
  status: string
  intercomCodeId?: string
  scheduleId?: string
}

export async function lookupIntercom(twilioPhone: string) {
  const { data, error } = await supabaseAdmin
    .from('intercoms')
    .select('*')
    .eq('from_phone', twilioPhone)
    .eq('enabled', true)
    .single()

  if (error || !data) return null
  return data
}

export async function lookupIntercomById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('intercoms')
    .select('*')
    .eq('id', id)
    .eq('enabled', true)
    .single()

  if (error || !data) return null
  return data
}

function getNowInTimezone(now: Date, tz: string) {
  const timeStr = now.toLocaleTimeString('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const dayOfWeekLabel = now.toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'short',
  })
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayOfWeekLabel)
  const safeDayOfWeek = dayOfWeek >= 0 ? dayOfWeek : 0

  return { timeStr, dateStr, dayOfWeek: safeDayOfWeek }
}

export async function validateCode(
  intercomId: string,
  code: string,
  now: Date
): Promise<CodeValidationResult> {
  const { data: intercomCode, error } = await supabaseAdmin
    .from('intercom_codes')
    .select('id')
    .eq('intercom_id', intercomId)
    .eq('code', code)
    .eq('enabled', true)
    .single()

  if (error || !intercomCode) {
    return { granted: false, intercomCodeId: null, scheduleId: null, status: 'invalid_code' }
  }

  const { data: intercom } = await supabaseAdmin
    .from('intercoms')
    .select('timezone')
    .eq('id', intercomId)
    .single()

  const tz = intercom?.timezone || 'UTC'
  const { timeStr, dateStr, dayOfWeek } = getNowInTimezone(now, tz)

  // First try date-based schedule
  const { data: dateSchedule } = await supabaseAdmin
    .from('schedules')
    .select('id')
    .eq('intercom_code_id', intercomCode.id)
    .eq('enabled', true)
    .eq('type', 'date')
    .eq('date', dateStr)
    .lte('start_time', timeStr)
    .gte('end_time', timeStr)
    .limit(1)
    .maybeSingle()

  if (dateSchedule) {
    return {
      granted: true,
      intercomCodeId: intercomCode.id,
      scheduleId: dateSchedule.id,
      status: 'success',
    }
  }

  // Fall back to weekday-based schedule
  const { data: weekdaySchedule } = await supabaseAdmin
    .from('schedules')
    .select('id')
    .eq('intercom_code_id', intercomCode.id)
    .eq('enabled', true)
    .eq('type', 'weekday')
    .eq('week_day', dayOfWeek)
    .lte('start_time', timeStr)
    .gte('end_time', timeStr)
    .limit(1)
    .maybeSingle()

  if (!weekdaySchedule) {
    return {
      granted: false,
      intercomCodeId: intercomCode.id,
      scheduleId: null,
      status: 'invalid_schedule',
    }
  }

  return {
    granted: true,
    intercomCodeId: intercomCode.id,
    scheduleId: weekdaySchedule.id,
    status: 'success',
  }
}

export async function logAccess(params: AccessLogParams): Promise<void> {
  await supabaseAdmin.from('access_logs').insert({
    intercom_id: params.intercomId,
    intercom_code_id: params.intercomCodeId ?? null,
    schedule_id: params.scheduleId ?? null,
    code_entered: params.codeEntered,
    status: params.status,
  })
}

export async function checkIntercomRateLimit(
  intercomId: string,
  maxAttempts: number,
  windowMs: number = 60_000
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  const { count, error } = await supabaseAdmin
    .from('access_logs')
    .select('id', { count: 'exact', head: true })
    .eq('intercom_id', intercomId)
    .gte('created_at', windowStart)

  if (error) return false
  return (count ?? 0) < maxAttempts
}
