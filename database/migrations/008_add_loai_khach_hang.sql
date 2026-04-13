ALTER TABLE IF EXISTS khach_hang
  ADD COLUMN IF NOT EXISTS loai_khach_hang TEXT;

UPDATE khach_hang
SET loai_khach_hang = COALESCE(loai_khach_hang, 'mua')
WHERE loai_khach_hang IS NULL;

ALTER TABLE khach_hang
  ALTER COLUMN loai_khach_hang SET DEFAULT 'mua';

ALTER TABLE khach_hang
  ALTER COLUMN loai_khach_hang SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'khach_hang_loai_khach_hang_check'
  ) THEN
    ALTER TABLE khach_hang
      ADD CONSTRAINT khach_hang_loai_khach_hang_check
      CHECK (loai_khach_hang IN ('mua', 'ban'));
  END IF;
END;
$$;
