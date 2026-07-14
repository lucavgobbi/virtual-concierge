# Virtual Concierge — Design Spec

## Overview

A virtual concierge system that replaces traditional intercom hardware with a Twilio-powered phone gateway. Visitors call a Twilio number, enter a 5-digit access code, and the system validates their schedule before sending a DTMF tone to open the door. Visitors can also press 0 to be connected to a building concierge.

Built with Node.js/TypeScript on Railway, using Railway Postgres for storage.

## Architecture

- **Hono.js** — lightweight TypeScript web framework serving Twilio webhook endpoints
- **Prisma ORM** — type-safe database queries with automatic migration support
- **Railway Postgres** — primary data store for customers, schedules, and logs
- **Twilio** — phone number management, inbound call handling, TwilioML responses

### Component Diagram

```
Visitor Phone → Twilio Number → POST /incoming-call → Hono App → Prisma → Postgres
                                    ↓
                            TwilioML Response
                          (Gather/Play/SendDigits/Dial)
```

## Call Flow

1. **Visitor calls** the Twilio number
2. **Twilio POSTs** to `/incoming-call` on the Railway app
3. **Greeting**: `<Gather numDigits="5" timeout="5">` plays:
   - "Welcome. Enter your 5-digit code or press 0 for concierge."
4. **Submit handler** (`POST /handle-input`):

   | Input | Action |
   |-------|--------|
   | `Digits = "0"` | `<Dial>` the configured CONCIERGE_PHONE. Log as `concierge_redirect`. |
   | `Digits` is 5 chars, no leading zero | Validate customer + schedule. |
   | Timeout or garbage | Log error, retry (max 2 total attempts). |

5. **Code validation** (POST `/handle-input`):
   - Look up customer by `code` where `enabled = true`
   - Not found → log `invalid_code` with `success=false`, `<Say>` error
   - Found → check schedule match against current datetime
   - No matching schedule → log `no_schedule` with `success=false`, `<Say>` "You don't have access at this time"
   - Schedule match → log `door_open` with `success=true` and schedule ref, `<SendDigits>` DOOR_DTMF_TONE, `<Say>` "Access granted", `<Hangup>`

6. **Retry mechanism**: `attempts` counter is passed as a query parameter in `<Redirect>` URLs (e.g., `/handle-input?attempts=1`). After any failure, if `attempts < 2`, `<Redirect>` back to the greeting `<Gather>` so the visitor can retry with code or press 0. If `attempts >= 2`, `<Say>` "Goodbye" and `<Hangup>`. Each attempt (including retries) is logged independently.

## Database Schema

### customers
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid() |
| name | TEXT | NOT NULL |
| code | VARCHAR(5) | UNIQUE, NOT NULL, CHECK (code NOT LIKE '0%') |
| enabled | BOOLEAN | NOT NULL, default true |
| createdAt | TIMESTAMP | NOT NULL, default now() |
| updatedAt | TIMESTAMP | NOT NULL, updated on change |

### schedule_dates
Date-specific access windows (e.g., "July 15, 9AM-5PM").

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid() |
| customerId | UUID | FK → customers.id, NOT NULL |
| date | DATE | NOT NULL |
| startTime | TIME | NOT NULL |
| endTime | TIME | NOT NULL |
| enabled | BOOLEAN | NOT NULL, default true |

### schedule_weekdays
Recurring weekly access windows (e.g., "Mondays 8AM-6PM").

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid() |
| customerId | UUID | FK → customers.id, NOT NULL |
| weekDay | INTEGER | NOT NULL, CHECK (0-6) where 0=Sunday |
| startTime | TIME | NOT NULL |
| endTime | TIME | NOT NULL |
| enabled | BOOLEAN | NOT NULL, default true |

### access_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid() |
| customerId | UUID | FK → customers.id, nullable |
| codeEntered | VARCHAR(5) | NOT NULL |
| success | BOOLEAN | NOT NULL |
| action | VARCHAR(20) | NOT NULL ('door_open', 'concierge_redirect', 'invalid_code', 'no_schedule') |
| scheduleDateId | UUID | FK → schedule_dates.id, nullable |
| scheduleWeekdayId | UUID | FK → schedule_weekdays.id, nullable |
| createdAt | TIMESTAMP | NOT NULL, default now() |

### Schedule Validation Logic

```
fn is_access_granted(customer, currentTime):
    matches = schedule_dates WHERE
        customerId = customer.id AND
        enabled = true AND
        date = currentTime.date AND
        startTime <= currentTime.time AND
        endTime >= currentTime.time

    matches += schedule_weekdays WHERE
        customerId = customer.id AND
        enabled = true AND
        weekDay = currentTime.dayOfWeek AND
        startTime <= currentTime.time AND
        endTime >= currentTime.time

    if matches is empty:
        return (DENIED, null)
    return (GRANTED, first_match)  // returns which schedule entry matched
```

- If customer has zero schedule entries total → DENIED (`no_schedule`)
- At least one match → GRANTED (log the matching schedule entry)

## Configuration (Environment Variables)

| Variable | Purpose |
|----------|---------|
| TWILIO_SID | Twilio Account SID |
| TWILIO_TOKEN | Twilio Auth Token |
| TWILIO_PHONE | Purchased Twilio phone number (E.164) |
| CONCIERGE_PHONE | Default number for press 0 redirect (E.164) |
| DOOR_DTMF_TONE | DTMF digit sent on valid code (e.g., "9") |
| DATABASE_URL | Railway Postgres connection string |

## Project Structure

```
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── incoming.ts
│   │   └── handle-input.ts
│   ├── services/
│   │   └── access.ts
│   └── lib/
│       └── twilio.ts
├── package.json
├── tsconfig.json
└── railway.json
```

## Dependencies

- `hono` — HTTP framework
- `@prisma/client` + `prisma` — database
- `twilio` — Twilio SDK for TwilioML generation
- `typescript`, `ts-node`, `tsx` — TypeScript tooling
- `@types/node` — type definitions

## Twilio Configuration

The Twilio phone number must be configured with a webhook pointing to:
```
POST https://virtual-concierge-production-1865.up.railway.app/incoming-call
```
This is done in the Twilio Console or via the Twilio API. The webhook must be set on the "A call comes in" field.

## Security & Input Validation

- Codes are 5 digits, no leading zero (enforced at DB level + API level)
- All TwilioML responses only include digits/numbers configured in env vars
- Prisma parameterized queries prevent SQL injection
- No admin/auth endpoints in v1 (data managed via Prisma Studio or direct DB access)

## Out of Scope (v1)

- No admin dashboard or management UI
- No multi-building support
- No SMS notifications
- No voicemail fallback for concierge
- No Twilio phone number provisioning (must be done manually)

## Future Considerations

- Admin API for managing customers/schedules
- Multi-building/tenant support
- SMS alerts on access grant/deny
- Voicemail when concierge unavailable
- Rate limiting on code attempts
