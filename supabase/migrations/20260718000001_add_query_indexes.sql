CREATE INDEX IF NOT EXISTS idx_access_logs_intercom_id_created_at
  ON access_logs(intercom_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intercom_codes_intercom_id_enabled
  ON intercom_codes(intercom_id, enabled);

CREATE INDEX IF NOT EXISTS idx_schedules_intercom_code_id_enabled_type
  ON schedules(intercom_code_id, enabled, type);
