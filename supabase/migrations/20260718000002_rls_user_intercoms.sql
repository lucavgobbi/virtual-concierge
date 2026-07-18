ALTER TABLE user_intercoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select" ON user_intercoms
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_insert" ON user_intercoms
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_delete" ON user_intercoms
  FOR DELETE USING (user_id = auth.uid());
