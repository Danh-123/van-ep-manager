ALTER TABLE IF EXISTS phieu_can
  ADD COLUMN IF NOT EXISTS cong_no_dau DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE phieu_can
SET cong_no_dau = COALESCE(cong_no_dau, 0)
WHERE cong_no_dau IS NULL;

CREATE OR REPLACE FUNCTION calculate_cong_no_by_customer()
RETURNS TRIGGER AS $$
DECLARE
  last_con_lai DECIMAL(15,2);
BEGIN
  SELECT con_lai INTO last_con_lai
  FROM phieu_can
  WHERE khach_hang_id = NEW.khach_hang_id
    AND id < NEW.id
  ORDER BY ngay_can ASC, id ASC
  LIMIT 1;

  IF last_con_lai IS NULL THEN
    NEW.cong_no := COALESCE(NEW.cong_no_dau, 0) + NEW.thanh_tien;
  ELSE
    NEW.cong_no := COALESCE(NEW.cong_no_dau, 0) + NEW.thanh_tien + last_con_lai;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_cong_no ON phieu_can;
CREATE TRIGGER trigger_calculate_cong_no
  BEFORE INSERT OR UPDATE ON phieu_can
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cong_no_by_customer();
