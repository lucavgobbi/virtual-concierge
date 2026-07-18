CREATE INDEX IF NOT EXISTS idx_access_logs_intercom_created
  ON access_logs(intercom_id, created_at DESC);
