# Virtual Concierge — Admin UI Design Spec

## Overview

Phase 2 adds an admin dashboard to manage intercoms, access codes, schedules, and access logs. Built on the existing Phase 1 foundation: Next.js App Router on Vercel, Supabase Postgres + Auth, Twilio for phone calls.

Supabase Auth (Google/Apple OAuth) authenticates admins. RLS policies scope all data access to `user_intercoms` — each admin only sees the intercoms they're linked to.

## Architecture

### Approach

- **Tailwind CSS + shadcn/ui** for all UI components
- **`@supabase/ssr`** for session management (server/client/action helpers)
- **Server Components** for data fetching where possible, **Client Components** only for interactivity
- **Server Actions** for mutations (configuration update, code/schedule CRUD)
- **RLS** enforces authorization — no API routes needed for admin CRUD

### Auth Flow

1. Unauthenticated user hits any `/admin/*` path → middleware redirects to `/login`
2. `/login` renders OAuth buttons for Google and Apple
3. On successful OAuth, Supabase sets session cookie, redirects to `/admin`
4. `/admin/page.tsx` checks `user_intercoms`:
   - 0 intercoms → render "Contact me" landing page
   - 1+ intercoms → redirect to `/admin/{firstIntercomId}/configuration`
5. `/api/twilio/*` excluded from auth check — Twilio webhooks use service_role client

### User Auto-Provisioning

A `handle_new_user()` trigger on `auth.users` inserts into `public.users` on signup. Admins are linked to intercoms via `user_intercoms` by the backend operator.

## Routing

```
/login                               → OAuth buttons
/                                    → redirect to /admin or /login
/admin                               → "Contact me" or redirect to first intercom
/admin/{intercomId}                  → redirect to /admin/{intercomId}/configuration
/admin/{intercomId}/configuration    → edit intercom settings
/admin/{intercomId}/codes            → paginated code list, add/edit
/admin/{intercomId}/schedule         → calendar (week/month), create/toggle schedules
/admin/{intercomId}/logs             → paginated log list with filters
```

## Sidebar Layout

Shared across all `/admin/*` pages:

- **Intercom selector** — dropdown at the top, lists all intercoms the user has access to. Navigating changes the `{intercomId}` in the URL.
- **Nav items** — Configuration, Access Codes, Schedule, Logs (with icons)
- **Logout button** — at the bottom, calls `supabase.auth.signOut()`

## Pages

### Configuration (`/admin/{intercomId}/configuration`)

Server component displaying a form. Fields:

| Field | DB column | Type |
|-------|-----------|------|
| Name | `name` | Text input |
| Greeting | `greeting` | Textarea |
| From Phone | `from_phone` | Text input (E.164) |
| Concierge Phone | `concierge_phone` | Text input (E.164) |
| DTMF Tone | `dtmf_tone` | Text input |
| Enabled | `enabled` | Toggle/switch |

Submits via server action that `UPDATE intercoms SET ... WHERE id = {intercomId}` (RLS enforces access).

### Access Codes (`/admin/{intercomId}/codes`)

Client component. Table with:

- Columns: Code (5 digits), Description, Status (enabled/disabled), Created, Actions (Edit)
- **Server-side pagination** — page number controls
- **Search** — text input filters by `description ILIKE %search%`
- **Code uniqueness** — code must be unique per intercom (enforced by DB `UNIQUE (intercom_id, code)`)
- **Add** button opens a Dialog with form: description, code (manually entered, no leading zero), enabled toggle. Server action inserts into `intercom_codes`. Show inline error if code already exists for this intercom.
- **Edit** opens same Dialog pre-filled (code field read-only after creation). Server action updates.
- RLS allows `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `intercom_codes` where `intercom_id` is user-accessible.

### Schedule (`/admin/{intercomId}/schedule`)

Client component. Calendar view with week/month toggle.

**Week view:**
- CSS grid: 7 columns (days, left-to-right) × 24 rows (hours 00:00–23:00)
- Hour labels in left gutter
- Schedule blocks positioned by `start_time` / `end_time`, colored by access code
- Block displays description + time range
- Toggle switch on each block to enable/disable

**Month view:**
- Standard calendar grid: rows for weeks, cells for days
- Days with active schedules show colored indicators (dots/bars) per code
- Clicking a day could switch to week view for that week

**Controls:**
- Week/Month toggle button
- Prev/Next navigation (changes week or month)
- Filters: enabled/disabled/all dropdown, access code dropdown (multi-select or single)
- **New schedule** button → Dialog form:
  - Access code (dropdown from `intercom_codes`, limited to codes for this intercom)
  - Type: date or weekday
  - Date picker (if date type) or day-of-week checkboxes (if weekday type)
  - Start time, end time
  - Enabled toggle (default true)
  - Server action inserts into `schedules`

**Permissions:** RLS allows `SELECT`/`INSERT` on `schedules`, `UPDATE` on `enabled` column only.

### Logs (`/admin/{intercomId}/logs`)

Client component. Table with server-side pagination.

**Columns:** Timestamp, Phone (caller), Code Entered, Status, Details

**Filters:**
- Date range (from/to date pickers)
- Status dropdown (success, invalid_code, invalid_schedule, concierge_redirect, error, all)
- Optional code search

**Pagination:** page numbers.

RLS allows `SELECT` only on `access_logs`.

## Database Changes

### Migration 1: Rename column

```sql
ALTER TABLE intercoms RENAME COLUMN twilio_phone TO from_phone;
```

### Migration 2: User auto-provisioning trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Migration 3: RLS policies

Enable RLS on all tables. Policies follow the same pattern:

```sql
-- intercoms: SELECT, UPDATE
CREATE POLICY "user_access" ON intercoms
  FOR SELECT USING (
    id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

CREATE POLICY "user_update" ON intercoms
  FOR UPDATE USING (
    id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

-- intercom_codes: SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "user_access" ON intercom_codes
  FOR SELECT USING (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

-- (same pattern for INSERT/UPDATE/DELETE)
-- schedules: SELECT, INSERT, UPDATE on enabled
-- access_logs: SELECT only
```

### Migration 4: Indexes

```sql
CREATE INDEX idx_user_intercoms_user_id ON user_intercoms(user_id);
```

## File Structure

```
src/
├── app/
│   ├── api/twilio/                     ← unchanged
│   ├── login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                  ← sidebar + intercom selector
│   │   ├── page.tsx                    ← "Contact me" or redirect to first intercom
│   │   └── [intercomId]/
│   │       ├── page.tsx                ← redirect to configuration
│   │       ├── configuration/page.tsx
│   │       ├── codes/page.tsx
│   │       ├── schedule/page.tsx
│   │       └── logs/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                             ← shadcn components (installed via CLI)
│   ├── login-form.tsx
│   ├── sidebar.tsx
│   ├── intercom-selector.tsx
│   ├── configuration-form.tsx
│   ├── codes-table.tsx
│   ├── code-form-dialog.tsx
│   ├── calendar-week-view.tsx
│   ├── calendar-month-view.tsx
│   ├── schedule-filters.tsx
│   ├── schedule-form-dialog.tsx
│   ├── logs-table.tsx
│   └── logs-filters.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← unchanged (service_role)
│   │   └── ssr.ts                      ← @supabase/ssr helpers
│   └── ...
├── types.ts                            ← update types after migration
└── middleware.ts
```

## Non-Goals

- Inline schedule editing (times, dates) — only create and enable/disable
- Drag-and-drop on calendar
- CSV export
- Email/SMS notifications
- Role-based access (admin only, no sub-admin tiers)
- Twilio phone number provisioning

## Dependencies Added

- `@supabase/ssr` — session management
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- `@radix-ui/*` components (via shadcn installer)
- `lucide-react` — icons (via shadcn)

## Twilio API Routes Note

The `lookupIntercom` function references `from_phone` after the rename (previously `twilio_phone`). All references in `src/app/api/twilio/` and `src/lib/services/access.ts` must be updated to match.
