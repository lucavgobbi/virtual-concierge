CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE intercoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  greeting TEXT NOT NULL DEFAULT 'Welcome. Enter your 5-digit code or press 0 for concierge.',
  twilio_phone TEXT NOT NULL UNIQUE,
  concierge_phone TEXT NOT NULL,
  dtmf_tone TEXT NOT NULL DEFAULT '9',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_intercoms (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intercom_id UUID NOT NULL REFERENCES intercoms(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, intercom_id)
);

CREATE TABLE intercom_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intercom_id UUID NOT NULL REFERENCES intercoms(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  code VARCHAR(5) NOT NULL CHECK (code ~ '^[1-9][0-9]{4}$'),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intercom_id, code)
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intercom_code_id UUID NOT NULL REFERENCES intercom_codes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('date', 'weekday')),
  date DATE,
  week_day SMALLINT CHECK (week_day BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date CHECK (type != 'date' OR date IS NOT NULL),
  CONSTRAINT valid_weekday CHECK (type != 'weekday' OR week_day IS NOT NULL)
);

CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intercom_id UUID NOT NULL REFERENCES intercoms(id) ON DELETE CASCADE,
  intercom_code_id UUID REFERENCES intercom_codes(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  code_entered VARCHAR(5) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'invalid_code', 'invalid_schedule', 'concierge_redirect', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intercom_codes_intercom_id ON intercom_codes(intercom_id);
CREATE INDEX idx_schedules_intercom_code_id ON schedules(intercom_code_id);
CREATE INDEX idx_access_logs_intercom_id ON access_logs(intercom_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);
