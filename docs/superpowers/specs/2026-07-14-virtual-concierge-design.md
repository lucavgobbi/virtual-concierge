# Virtual Concierge — Design Spec

## Overview

A virtual concierge system that replaces traditional intercom hardware with a Twilio-powered phone gateway. Each building intercom dials its assigned Twilio number, callers enter a 5-digit code, and the system validates schedule access before sending a DTMF tone to open the door. Callers can also press 0 to be connected to a building concierge.

Built with Next.js on Vercel, Supabase (Postgres + Auth), and Twilio.

## Architecture

- **Next.js** (App Router) on Vercel — API routes for Twilio webhooks in phase 1, admin UI pages in phase 2
- **Supabase** — Postgres DB for all data, Auth (via Supabase Auth) for phase 2 admin login
- **Twilio SDK** — TwilioML generation for call responses
- **Supabase CLI** — local development, SQL migrations, type generation

### Component Diagram

```
Intercom → Twilio Number → POST /api/twilio/incoming-call → Next.js → Supabase
                                    ↓
                            TwilioML Response
                          (Gather/Say/SendDigits/Dial)
```

## Entity Model

### users
Mirror of `auth.users` for phase 2 admin auth. Created via trigger on Supabase Auth signup.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, references auth.users.id |
| name | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### intercoms
A physical intercom device at a building entrance. Each intercom has its own Twilio phone number.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | e.g. "Building A - Main Entrance" |
| greeting | TEXT | Custom greeting played to callers |
| twilio_phone | TEXT UNIQUE | E.164, the number the intercom dials |
| concierge_phone | TEXT | E.164, dialed when visitor presses 0 |
| dtmf_tone | TEXT | Default "9" |
| enabled | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### user_intercoms
Many-to-many mapping for phase 2 — which users can manage which intercoms.

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | FK → users.id |
| intercom_id | UUID | FK → intercoms.id |
| PK | | (user_id, intercom_id) |

### intercom_codes
Access codes issued per intercom. Each code has its own schedule.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| intercom_id | UUID | FK → intercoms.id |
| description | TEXT | e.g. "Alice - Apt 4B" |
| code | VARCHAR(5) | 5 digits, no leading zero |
| enabled | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE | | (intercom_id, code) |

### schedules
Defines when an intercom_code is valid. Type discriminator supports single-date or recurring weekday windows.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| intercom_code_id | UUID | FK → intercom_codes.id |
| type | TEXT | 'date' or 'weekday' |
| date | DATE | Nullable, for 'date' type |
| week_day | SMALLINT | Nullable, 0-6 (0=Sun), for 'weekday' type |
| start_time | TIME | HH:mm |
| end_time | TIME | HH:mm |
| enabled | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### access_logs
Records every call attempt.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| intercom_id | UUID | FK → intercoms.id, which intercom was called |
| intercom_code_id | UUID | Nullable, FK → intercom_codes.id |
| schedule_id | UUID | Nullable, FK → schedules.id |
| code_entered | VARCHAR(5) | |
| status | TEXT | 'success', 'invalid_code', 'invalid_schedule', 'concierge_redirect', 'error' |
| created_at | TIMESTAMPTZ | |

## Call Flow

### 1. Inbound Call → `POST /api/twilio/incoming-call`

- Twilio sends `To` (called number) and `From` (intercom's caller ID)
- Look up intercom where `twilio_phone` matches `To` and `enabled = true`
- If not found: `<Say>` "Invalid number", `<Hangup>`
- If found: render `<Gather numDigits="5" timeout="5">` with the intercom's `greeting` text
- The `intercomId` is passed as a query param to the action URL for subsequent requests

### 2. Input → `POST /api/twilio/handle-input`

| Input | Action |
|-------|--------|
| `Digits = "0"` | `<Dial>` intercom's `concierge_phone` (E.164). Log `concierge_redirect`. |
| Not 5 chars or starts with `0` | Log `invalid_code`. Retry or hangup. |
| Valid 5-digit code | Look up `intercom_codes` where `intercom_id` and `code` match and `enabled = true`. |

If code found → validate schedule:

```
fn is_valid(intercomCode, currentTime):
    match = schedules WHERE
        intercom_code_id = intercomCode.id AND
        enabled = true AND
        (
            (type = 'date' AND date = currentDate AND start_time <= currentTime AND end_time >= currentTime)
            OR
            (type = 'weekday' AND week_day = currentDayOfWeek AND start_time <= currentTime AND end_time >= currentTime)
        )

    if match: return (GRANTED, match)
    return (DENIED, null)
```

- Schedule match → `<SendDigits>` with intercom's `dtmf_tone`, `<Say>` "Access granted", `<Hangup>`, log `success`
- No schedule → log `invalid_schedule`, retry or hangup
- No code match → log `invalid_code`, retry or hangup

### 3. Retry Logic

`attempts` counter passed as query param. Max 2 attempts total. After any failure:
- attempts < 2 → `<Redirect>` back to greeting `<Gather>` with incremented attempts
- attempts >= 2 → `<Say>` "Goodbye", `<Hangup>`

## Project Structure (Phase 1)

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── twilio/
│   │   │       ├── incoming-call/route.ts    → POST handler
│   │   │       └── handle-input/route.ts     → POST handler
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts                     → Supabase admin client (service_role)
│   │   ├── twilio/
│   │   │   └── responses.ts                  → TwilioML response builders
│   │   └── types.ts                          → Generated Supabase types
│   └── middleware.ts                         → Phase 2: session check
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Configuration (Environment Variables)

| Variable | Purpose |
|----------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Service role key (server-side only) |
| TWILIO_SID | Twilio Account SID |
| TWILIO_TOKEN | Twilio Auth Token |
| TWILIO_PHONE | Default Twilio number (for initial setup) |

## Dependencies

- `next` — React framework
- `@supabase/supabase-js` — Supabase client
- `twilio` — TwilioML response generation
- `typescript` — type safety

## Twilio Configuration

Each intercom's Twilio phone number must point to:
```
POST https://<project>.vercel.app/api/twilio/incoming-call
```

Set in Twilio Console under the number's "A call comes in" webhook.

## Out of Scope (Phase 1)

- Admin UI / dashboard
- User authentication flows
- Rate limiting on code attempts
- SMS or email notifications
- Twilio phone number provisioning (manual)

## Phase 2 Considerations

- Admin UI built in Next.js App Router pages using `@supabase/ssr` for session handling
- Supabase Auth with email/password for admin login
- RLS policies on `intercoms`, `intercom_codes`, `schedules` scoped per `user_intercoms`
- Pages for managing intercoms, codes, schedules, and viewing access logs
- The `users` table and `user_intercoms` table are designed for this — seeded on auth signup via DB trigger
