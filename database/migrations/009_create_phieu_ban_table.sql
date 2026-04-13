CREATE TABLE IF NOT EXISTS phieu_ban (
  id BIGSERIAL PRIMARY KEY,
  so_phieu TEXT NOT NULL UNIQUE,
  ngay_ban DATE NOT NULL DEFAULT CURRENT_DATE,
  khach_hang_id BIGINT NOT NULL REFERENCES khach_hang(id) ON DELETE RESTRICT,
  khach_hang TEXT NOT NULL,
  so_bo NUMERIC(18, 2) NOT NULL DEFAULT 0,
  so_to NUMERIC(18, 2) NOT NULL DEFAULT 0,
  do_rong NUMERIC(18, 2) NOT NULL DEFAULT 0,
  do_day NUMERIC(18, 2) NOT NULL DEFAULT 0,
  do_dai NUMERIC(18, 2) NOT NULL DEFAULT 0,
  so_khoi NUMERIC(18, 6) NOT NULL DEFAULT 0,
  don_gia NUMERIC(18, 2) NOT NULL DEFAULT 0,
  cong_no_dau NUMERIC(18, 2) NOT NULL DEFAULT 0,
  thanh_tien NUMERIC(18, 2) NOT NULL DEFAULT 0,
  so_tien_da_tra NUMERIC(18, 2) NOT NULL DEFAULT 0,
  cong_no NUMERIC(18, 2) NOT NULL DEFAULT 0,
  con_lai NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ghi_chu TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phieu_ban_ngay_ban ON phieu_ban (ngay_ban DESC);
CREATE INDEX IF NOT EXISTS idx_phieu_ban_khach_hang_id ON phieu_ban (khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_phieu_ban_created_at ON phieu_ban (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'phieu_ban_cong_no_check'
  ) THEN
    ALTER TABLE phieu_ban
      ADD CONSTRAINT phieu_ban_cong_no_check
      CHECK (
        so_bo >= 0 AND
        so_to >= 0 AND
        do_rong >= 0 AND
        do_day >= 0 AND
        do_dai >= 0 AND
        so_khoi >= 0 AND
        don_gia >= 0 AND
        cong_no_dau >= 0 AND
        thanh_tien >= 0 AND
        so_tien_da_tra >= 0 AND
        cong_no >= 0 AND
        con_lai >= 0
      );
  END IF;
END;
$$;