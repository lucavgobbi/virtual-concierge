# Virtual Concierge

A cloud-based virtual concierge that replaces traditional physical intercom keypads. Tenants call a phone number, enter a 5-digit code, and the system sends a DTMF tone to open the door — all managed through an admin dashboard.

Built with [Next.js](https://nextjs.org) 14 (App Router), [Supabase](https://supabase.com) (PostgreSQL + Auth), [Twilio](https://twilio.com) (Voice IVR), and deployed on [Vercel](https://vercel.com).

## Architecture

```
Phone call → Twilio → /api/twilio/incoming-call (greeting + gather DTMF)
                  → /api/twilio/handle-input (validate code + schedule)
                  → Access granted (send DTMF tone) or denied (re-prompt)
```

- **IVR Flow:** Incoming call → play greeting → gather 5-digit code → validate against database schedules → send DTMF tone to open door or reject
- **Admin UI:** Manage intercoms, access codes, schedules, and view access logs with timezone-aware timestamps
- **Auth:** Supabase Auth (email/password) with Row-Level Security — each user only sees their assigned intercoms

## Prerequisites

- [Twilio](https://twilio.com) account with a phone number capable of voice
- [Supabase](https://supabase.com) project
- [Vercel](https://vercel.com) account
- [Node.js](https://nodejs.org) 18+
- [Stripe Projects CLI](https://projects.dev) for managing credentials and deployments

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin operations) |
| `TWILIO_SID` | Twilio account SID |
| `TWILIO_TOKEN` | Twilio auth token |
| `MAX_CODE_ATTEMPTS` | Max code entry attempts before hangup (default: `2`) |

## Local Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

### Twilio Webhook Tunneling

To test Twilio webhooks locally, use a tunnel like [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Then configure your Twilio phone number's voice webhook URL to point to your ngrok URL (e.g., `https://your-ngrok.ngrok.app/api/twilio/incoming-call`).

## Database

Migrations are in `supabase/migrations/`. Apply them to your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Key Tables

- **intercoms** — Physical intercom devices (name, greeting, phone numbers, timezone)
- **intercom_codes** — 5-digit access codes linked to intercoms
- **schedules** — Time-based rules (date-specific or recurring weekday) for each code
- **access_logs** — Full audit trail of every access attempt
- **user_intercoms** — Many-to-many: which users can manage which intercoms

## Deployment

### Using Stripe Projects CLI

```bash
stripe projects env --pull    # Fetch credentials
npm run build                  # Production build
```

Then deploy to Vercel:

```bash
vercel --prod
```

### Twilio Configuration

1. Buy a Twilio phone number with voice capability
2. Set the voice webhook URL to `https://your-domain.vercel.app/api/twilio/incoming-call`
3. Set the webhook HTTP method to `POST`

## Admin Dashboard

Navigate to `https://your-domain.vercel.app/admin` after deployment.

- **Configuration** — Intercom name, greeting message, DTMF tone, timezone
- **Access Codes** — Create and manage 5-digit codes (no leading zero)
- **Schedule** — Calendar view to set when each code is active (date-specific or recurring weekly)
- **Logs** — Audit trail of all access attempts with filtering by status, code, and free-text search

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Row-Level Security |
| Voice | Twilio IVR (TwiML) |
| UI | Tailwind CSS v4 + shadcn/ui + Base UI |
| Deployment | Vercel |
| Secrets | Stripe Projects CLI |

## License

Private — all rights reserved.
