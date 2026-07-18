# Code Review Report: Virtual Concierge

**Date**: 2026-07-18
**Reviewer**: Automated Code Review
**Project**: Virtual Concierge (Next.js 14 + Twilio + Supabase)

---

## Project Overview
A Next.js 14 virtual concierge system using Twilio for voice IVR, Supabase for database/auth, deployed on Vercel.

---

## 🔴 Critical Issues

### 1. **Twilio Signature Validation Bypass Vulnerability** - `src/lib/twilio/validate.ts:3-11`

```typescript
export function validateTwilioRequest(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) return false
  const token = process.env.TWILIO_TOKEN
  if (!token) return false
  return twilio.validateRequest(token, signature, url, params)
}
```

**CRITICAL**: The `url` parameter must be the **exact URL Twilio used** to make the request. In production behind Vercel/NGINX, `request.url` may not match what Twilio sees (due to proxies, load balancers). Twilio uses the exact URL from their request. If behind a proxy, you must use `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Port` headers to reconstruct the exact URL Twilio called. This is a **critical security vulnerability** - attackers can bypass Twilio signature validation in production.

**Files affected**: 
- `src/app/api/twilio/incoming-call/route.ts:7` - passes `request.url`
- `src/app/api/twilio/handle-input/route.ts:27` - passes `request.url`

---

## 🟠 High Severity Issues

### 2. **Timezone Bug in `validateCode`** - `src/lib/services/access.ts:88`

```typescript
const { timeStr, dateStr, dayOfWeek } = getNowInTimezone(now, tz)
// But function is called getNowInTimezone, not getNowInTimezone!
```

**Bug**: Line 88 calls `getNowInTimezone()` but the function is named `getNowInTimezone()` (line 43). This will throw `ReferenceError` at runtime.

### 3. **Timezone Bug in `getNowInTimezone`** - `src/lib/services/access.ts:54-60`

```typescript
const get = (type: string) => parts.find(p => p.type === type)!.value
```

**Bug**: Using non-null assertion `!` on `find()` result. If `Intl.DateTimeFormat` doesn't return expected parts (locale-dependent), this throws `TypeError: Cannot read properties of undefined`.

### 4. **RLS Bypass Risk - Admin Client Bypasses RLS** - `src/lib/supabase/client.ts`

The `supabaseAdmin` client uses the **service role key** which **bypasses all RLS policies**. Admin API routes (`/api/twilio/*`, admin pages) use this client. Ensure:
- RLS policies on `intercoms`, `intercom_codes`, `schedules`, `access_logs` correctly filter by `intercom_id` owned by the authenticated user
- Admin pages verify user owns the `intercom_id` before queries

---

## 🟡 Medium Severity Issues

### 5. **No Rate Limiting on Twilio Webhooks** - `src/app/api/twilio/incoming-call/route.ts`, `handle-input/route.ts`

Twilio webhooks have no rate limiting. Attackers can DoS your Twilio webhook endpoints, exhausting Twilio credits and Supabase connections. Add rate limiting (e.g., `next-rate-limit` or Vercel Edge rate limiting).

### 6. **No Input Validation on Code Entry** - `src/app/api/twilio/handle-input/route.ts:64-69`

```typescript
if (digits.length !== 5 || digits.startsWith('0')) {
```

Validates format but **no sanitization**. Twilio sends `Digits` as string, but no validation that it's only numeric. Could allow injection if passed unsafely to SQL (though Supabase client uses parameterized queries).

### 7. **Client-Side Supabase Admin Risk** - `src/components/codes-table.tsx:21`, `logs-table.tsx:46`

```typescript
const supabase = createBrowserSupabaseClient()
```

Uses **anon key** in browser (correct). But admin pages fetch `intercom_codes` and `access_logs` without verifying the user owns the `intercomId`. Relies solely on RLS. If RLS is misconfigured, data leaks.

---

## 🟢 Low Severity / Code Quality

### 8. **Inconsistent Error Handling** - `src/app/api/twilio/handle-input/route.ts:101-107`

```typescript
} catch (err) {
  console.error('[handle-input] Unhandled error', { ... error: String(err) })
  return new NextResponse(errorResponse(), { status: 200, ... })
}
```

Returns **200 OK** with error TwiML on unhandled errors. Twilio treats non-200 as failures and retries. This is actually correct for Twilio (they expect 200), but the error is silently swallowed. Add alerting.

### 9. **No TypeScript Types for Supabase Query Results** - `src/components/logs-table.tsx:24-26`

```typescript
type AccessLog = Tables<'access_logs'> & {
  intercom_code: { code: string; description: string | null } | null
}
```

Manual type extension. Consider using generated types with joins via Supabase's `select('*, intercom_code:intercom_code_id(*)')` and proper type generation.

### 10. **Hardcoded Values** - `src/app/api/twilio/handle-input/route.ts:12`

```typescript
const MAX_ATTEMPTS = 2
```

Hardcoded magic number. Should be configurable via database or env var.

### 11. **Missing Indexes on Frequently Queried Columns** - Supabase Migrations

Check `supabase/migrations/` for indexes on:
- `access_logs.intercom_id` + `created_at` (used in logs-table)
- `intercom_codes.intercom_id` + `enabled`
- `schedules.intercom_code_id` + `enabled` + `type`

---

## ✅ Positive Observations

| Area | Assessment |
|------|------------|
| **Type Safety** | Excellent - Full Supabase generated types, strict TS config |
| **Architecture** | Clean separation: API routes → services → Supabase |
| **Twilio Integration** | Proper TwiML responses, signature validation (aside from URL bug) |
| **Admin UI** | Well-structured React components with TanStack-like patterns |
| **Database** | Proper RLS policies (from migrations), indexes on FKs |
| **Logging** | Structured logging with context in all API routes |

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 3 |
| 🟡 Medium | 3 |
| 🟢 Low | 4 |

**Top Priority**: Fix the Twilio URL validation bug (#1) and the timezone function bugs (#2, #3) before deploying to production. Both cause runtime failures or security bypasses.

---

## Developer Fix Guide

### Fix #1: Twilio Signature Validation URL Reconstruction

**Problem**: `request.url` in Next.js API routes behind Vercel returns the internal URL (e.g., `http://localhost:3000/api/...`) but Twilio validates against the public URL (e.g., `https://your-app.vercel.app/api/...`).

**Solution**: Create a utility to reconstruct the exact public URL Twilio called.

**File to create**: `src/lib/twilio/url.ts` (new file)

```typescript
// src/lib/twilio/url.ts
import { NextRequest } from 'next/server'

export function getTwilioWebhookUrl(request: NextRequest): string {
  // Vercel sets these headers
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  
  if (!host) {
    // Fallback for local dev
    return request.url
  }
  
  const path = request.nextUrl.pathname + request.nextUrl.search
  return `${proto}://${host}${path}`
}
```

**Update `src/lib/twilio/validate.ts`**:

```typescript
// src/lib/twilio/validate.ts
import twilio from 'twilio'
import { getTwilioWebhookUrl } from './url'

export function validateTwilioRequest(
  request: NextRequest,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) return false
  const token = process.env.TWILIO_TOKEN
  if (!token) return false
  
  // Use reconstructed public URL, not request.url
  const url = getTwilioWebhookUrl(request)
  return twilio.validateRequest(token, signature, url, params)
}
```

**Update API routes** to pass `request` instead of `request.url`:

```typescript
// src/app/api/twilio/incoming-call/route.ts:7,24
const signature = request.headers.get("x-twilio-signature") || "";
// ...
if (!validateTwilioRequest(request, params, signature)) {
```

```typescript
// src/app/api/twilio/handle-input/route.ts:27,28
const signature = request.headers.get('x-twilio-signature') || ''
if (!validateTwilioRequest(request, params, signature)) {
```

**Testing**:
1. Deploy to Vercel preview
2. Use Twilio console to send test webhook
3. Check logs for "Unauthorized request" - should not appear for valid Twilio requests
4. Test with invalid signature - should return 401

---

### Fix #2 & #3: Timezone Function Bugs

**Problem 1**: Function name typo - `getNowInTimezone` vs `getNowInTimezone` (line 43 vs 88)

**Problem 2**: Non-null assertion on `find()` result can throw at runtime

**File to modify**: `src/lib/services/access.ts`

**Fix**:

```typescript
// src/lib/services/access.ts - line 43: fix function name
function getNowInTimezone(now: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(now)
  
  // Safe getter with fallback
  const get = (type: string): string => {
    const part = parts.find(p => p.type === type)
    if (!part) {
      // Fallback: construct from Date directly
      const fallback = new Intl.DateTimeFormat('en-CA', { timeZone: tz, [type]: 'numeric' }).format(now)
      return fallback
    }
    return part.value
  }

  return {
    timeStr: `${get('hour')}:${get('minute')}`,
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  }
}
```

**Alternative simpler fix** using `toLocaleString`:

```typescript
function getNowInTimezone(now: Date, tz: string) {
  // Get time in timezone
  const timeStr = now.toLocaleTimeString('en-CA', { 
    timeZone: tz, 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  })
  
  // Get date in timezone
  const dateStr = now.toLocaleDateString('en-CA', { 
    timeZone: tz, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
  
  // Get day of week (0=Sun, 6=Sat)
  const dayOfWeek = now.toLocaleDateString('en-US', { 
    timeZone: tz, 
    weekday: 'short' 
  })
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayOfWeek)
  
  return { timeStr, dateStr, dayOfWeek: dayIndex >= 0 ? dayIndex : 0 }
}
```

**Testing**:
1. Unit test with known dates/timezones
2. Test DST transitions (e.g., `America/New_York` in March/November)
3. Test edge case: `now` = midnight on DST boundary

---

## Verification Checklist

Before deploying fixes:

- [ ] **Critical #1**: Twilio signature validation works on Vercel preview deployment
- [ ] **Critical #1**: Invalid signatures return 401
- [ ] **High #2**: `validateCode` runs without ReferenceError
- [ ] **High #3**: Timezone function handles all IANA timezones without throwing
- [ ] **High #4**: Admin pages verify `user_intercoms` ownership before queries
- [ ] Run `npm run lint` and `npm run build` pass
- [ ] Test end-to-end: call Twilio number → enter code → verify access granted/denied

---

## References

- [Twilio Request Validation](https://www.twilio.com/docs/usage/security#validating-requests)
- [Vercel Headers](https://vercel.com/docs/concepts/edge-network/headers)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [IANA Timezone Database](https://www.iana.org/time-zones)