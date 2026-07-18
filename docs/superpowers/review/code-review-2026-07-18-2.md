# Security Audit — Virtual Concierge

**Date:** 2026-07-18
**Auditor:** Opencode (automated review)
**Scope:** Full application codebase

---

## Findings

### CRITICAL

#### 1. IDOR — Ownership check doesn't filter by current user

**Status:** Open
**Files:**
- `src/app/admin/[intercomId]/configuration/page.tsx:14-18`
- `src/app/admin/[intercomId]/codes/page.tsx:14-18`
- `src/app/admin/[intercomId]/schedule/page.tsx:14-18`
- `src/app/admin/[intercomId]/logs/page.tsx:14-18`

**Description:**

Every admin page checks intercom ownership with:

```typescript
const { data: ownership } = await supabase
  .from('user_intercoms')
  .select('intercom_id')
  .eq('intercom_id', params.intercomId)
  .maybeSingle()
if (!ownership) notFound()
```

This queries `user_intercoms` for *any* row matching the `intercom_id`, without filtering by the current user's ID. The `user_intercoms` table does not have RLS enabled (only `intercoms`, `intercom_codes`, `schedules`, and `access_logs` do — see `supabase/migrations/20260716000003_rls_policies.sql`). Any authenticated user can read all rows from `user_intercoms`.

**Impact:** User A can navigate to `/admin/<user_b_intercom_id>/configuration` and access User B's intercom configuration, access codes, schedules, and logs.

**Fix (two options):**

Option A — Enable RLS on `user_intercoms`:

```sql
ALTER TABLE user_intercoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select" ON user_intercoms
  FOR SELECT USING (user_id = auth.uid());
```

Option B — Filter by user ID in application code:

```typescript
const { data: { user } } = await supabase.auth.getUser()

const { data: ownership } = await supabase
  .from('user_intercoms')
  .select('intercom_id')
  .eq('intercom_id', params.intercomId)
  .eq('user_id', user.id)
  .maybeSingle()
if (!ownership) notFound()
```

Option A is preferred as it provides defense-in-depth at the database level.

---

#### 2. Open registration — anyone can create accounts

**Status:** Open
**File:** `src/components/login-form.tsx:31-33`

**Description:**

The login form exposes a sign-up mode via `supabase.auth.signUp()`. There is no admin approval flow, no invite-only restriction, and no CAPTCHA.

```typescript
const { error: err } = mode === 'signin'
  ? await supabase.auth.signInWithPassword({ email, password })
  : await supabase.auth.signUp({ email, password })
```

**Impact:** Anyone can create accounts, consuming resources. Combined with the IDOR in finding #1, this increases the attack surface.

**Fix:** Disable sign-up in Supabase auth settings (Authentication > Providers > Email > Disable sign-ups), or remove the sign-up button from the login form and manage users exclusively through the Supabase dashboard.

---

### HIGH

#### 3. Ineffective rate limiting on serverless

**Status:** Open
**Files:**
- `src/lib/rate-limit.ts`
- `src/app/api/twilio/incoming-call/route.ts:12`
- `src/app/api/twilio/handle-input/route.ts:19`

**Description:**

The rate limiter uses an in-memory `Map`:

```typescript
const rateMap = new Map<string, { count: number; resetAt: number }>()
```

On Vercel's serverless functions, each cold start resets the counter. Different concurrent requests may hit different function instances, making the rate limiter ineffective.

Additionally, `MAX_ATTEMPTS` (default 2) only limits retries within a single call. Once the call ends, a new call starts with a fresh attempt counter.

**Impact:** An attacker can brute-force the 5-digit access codes (90,000 possibilities: 10000–99999) without meaningful throttling.

**Fix:**
- Replace the in-memory rate limiter with a distributed store (Redis, Upstash, or Vercel KV).
- Implement per-phone-number attempt lockout across calls (e.g., lock the phone number for N minutes after M failed attempts).
- Consider adding a CAPTCHA or challenge after repeated failures.

---

#### 4. No security headers configured

**Status:** Open
**File:** `next.config.mjs`

**Description:**

The Next.js configuration is empty:

```javascript
const nextConfig = {}
export default nextConfig
```

Missing security headers:
- `Content-Security-Policy` — no XSS mitigation
- `X-Frame-Options` — clickjacking risk
- `X-Content-Type-Options` — MIME sniffing risk
- `Strict-Transport-Security` — no HSTS
- `Referrer-Policy` — referrer leakage
- `Permissions-Policy` — no feature restrictions

**Fix:** Add headers in `next.config.mjs`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          },
        ],
      },
    ]
  },
}
export default nextConfig
```

Adjust the CSP directive to match the actual assets used by the application.

---

### MEDIUM

#### 5. Access codes logged in plaintext

**Status:** Open
**File:** `src/app/api/twilio/handle-input/route.ts:82`

**Description:**

The handle-input route logs the actual digits entered:

```typescript
console.log('[handle-input] Code validation result', {
  intercomId, digits, status: result.status, granted: result.granted, callSid
})
```

**Impact:** Access codes are visible in Vercel's logging system. Anyone with dashboard access can read them.

**Fix:** Mask the digits or omit them from logs:

```typescript
console.log('[handle-input] Code validation result', {
  intercomId, status: result.status, granted: result.granted, callSid
})
```

---

#### 6. No login rate limiting

**Status:** Open
**File:** `src/components/login-form.tsx`

**Description:**

The login form does not implement rate limiting on failed login attempts. While Supabase has some built-in protection, the application adds no additional throttling.

**Impact:** Brute-force attacks on user passwords.

**Fix:** Implement server-side rate limiting on authentication attempts, or verify and document that Supabase's built-in rate limiting is enabled and configured appropriately.

---

#### 7. No password policy

**Status:** Open
**File:** `src/components/login-form.tsx`

**Description:**

The signup form accepts any password with no complexity requirements. Supabase may have default settings, but the application does not enforce or communicate any policy.

**Impact:** Users may set weak passwords, increasing the risk of account compromise.

**Fix:** Add client-side password validation (minimum length, complexity) and configure Supabase's password policy in the dashboard.

---

#### 8. User-configurable phone numbers without validation

**Status:** Open
**File:** `src/components/configuration-form.tsx:111-115`

**Description:**

The configuration form allows admins to set `from_phone` and `concierge_phone` as free text without E.164 format validation.

**Impact:** Invalid phone numbers break the Twilio integration silently, potentially causing missed calls or failed access grants.

**Fix:** Add pattern validation for E.164 format:

```html
<Input
  id="from_phone"
  name="from_phone"
  defaultValue={config.from_phone}
  pattern="^\+[1-9]\d{1,14}$"
  placeholder="+14155551234"
  required
/>
```

---

### LOW

#### 9. No CSRF tokens on admin forms

**Status:** Open
**Files:** All admin form components

**Description:**

Admin forms use client-side Supabase operations without explicit CSRF tokens. Row-Level Security provides the primary protection.

**Impact:** If RLS is ever misconfigured or disabled, CSRF attacks could modify data through the admin forms.

**Fix:** This is acceptable as long as RLS remains properly configured. Document the dependency on RLS for CSRF protection.

---

#### 10. DTMF tone not validated

**Status:** Open
**File:** `src/components/configuration-form.tsx:119`

**Description:**

The `dtmf_tone` field is a free-text input. Valid DTMF characters are `0-9`, `A-D`, `*`, `#`. Invalid characters could cause intercom malfunctions.

**Impact:** Data integrity issue — invalid DTMF tones could prevent the intercom from granting access.

**Fix:** Add pattern validation:

```html
<Input
  id="dtmf_tone"
  name="dtmf_tone"
  defaultValue={config.dtmf_tone}
  pattern="[0-9A-D*#]"
  maxLength={1}
  required
/>
```

---

#### 11. Greeting field social engineering risk

**Status:** Open
**File:** `src/lib/services/access.ts` (greeting rendered via `twilio/responses.ts:19`)

**Description:**

The `greeting` field is user-configurable and rendered as TwiML speech. An admin could set a misleading greeting (e.g., "Your code is 12345, press it to enter").

**Impact:** Trust/design concern — callers could be socially engineered through the greeting.

**Fix:** This is a design decision. Consider limiting greeting length or adding warning text in the admin UI about appropriate greeting content.

---

## Recommendations Summary

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Fix IDOR by enabling RLS on `user_intercoms` | Low |
| P0 | Disable open registration or add admin approval | Low |
| P1 | Replace in-memory rate limiter with distributed store | Medium |
| P1 | Add security headers in `next.config.mjs` | Low |
| P2 | Remove access codes from logs | Low |
| P2 | Add login rate limiting | Medium |
| P2 | Add password policy | Low |
| P2 | Validate phone numbers (E.164) | Low |
| P3 | Add CSRF tokens (if RLS dependency is unacceptable) | Medium |
| P3 | Validate DTMF tone input | Low |
| P3 | Document greeting content policy | Low |
