-- Enable RLS on all tables
ALTER TABLE intercoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- intercoms: SELECT and UPDATE
CREATE POLICY "user_select" ON intercoms
  FOR SELECT USING (
    id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

CREATE POLICY "user_update" ON intercoms
  FOR UPDATE USING (
    id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  )
  WITH CHECK (
    id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

-- intercom_codes: SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "user_select" ON intercom_codes
  FOR SELECT USING (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

CREATE POLICY "user_insert" ON intercom_codes
  FOR INSERT WITH CHECK (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

CREATE POLICY "user_update" ON intercom_codes
  FOR UPDATE USING (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

CREATE POLICY "user_delete" ON intercom_codes
  FOR DELETE USING (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );

-- schedules: SELECT, INSERT, UPDATE (enabled only is enforced in app, RLS allows full UPDATE)
CREATE POLICY "user_select" ON schedules
  FOR SELECT USING (
    intercom_code_id IN (
      SELECT id FROM intercom_codes WHERE intercom_id IN (
        SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "user_insert" ON schedules
  FOR INSERT WITH CHECK (
    intercom_code_id IN (
      SELECT id FROM intercom_codes WHERE intercom_id IN (
        SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "user_update" ON schedules
  FOR UPDATE USING (
    intercom_code_id IN (
      SELECT id FROM intercom_codes WHERE intercom_id IN (
        SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid()
      )
    )
  );

-- access_logs: SELECT only
CREATE POLICY "user_select" ON access_logs
  FOR SELECT USING (
    intercom_id IN (SELECT intercom_id FROM user_intercoms WHERE user_id = auth.uid())
  );
