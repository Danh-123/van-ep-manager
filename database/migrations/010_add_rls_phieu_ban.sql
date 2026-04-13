ALTER TABLE IF EXISTS phieu_ban ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE phieu_ban TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE phieu_ban_id_seq TO authenticated;

DROP POLICY IF EXISTS phieu_ban_select_admin_ketoan ON phieu_ban;
CREATE POLICY phieu_ban_select_admin_ketoan
  ON phieu_ban
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'KeToan')
    )
  );

DROP POLICY IF EXISTS phieu_ban_insert_admin_ketoan ON phieu_ban;
CREATE POLICY phieu_ban_insert_admin_ketoan
  ON phieu_ban
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'KeToan')
    )
  );

DROP POLICY IF EXISTS phieu_ban_update_admin_ketoan ON phieu_ban;
CREATE POLICY phieu_ban_update_admin_ketoan
  ON phieu_ban
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'KeToan')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'KeToan')
    )
  );

DROP POLICY IF EXISTS phieu_ban_delete_admin_ketoan ON phieu_ban;
CREATE POLICY phieu_ban_delete_admin_ketoan
  ON phieu_ban
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'KeToan')
    )
  );
