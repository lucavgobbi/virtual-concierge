CREATE INDEX IF NOT EXISTS idx_user_intercoms_user_id ON user_intercoms(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
