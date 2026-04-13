-- Migration: Thay đổi ON DELETE từ SET NULL/RESTRICT -> CASCADE
-- Mục đích: Cho phép xóa khách hàng/công nhân kèm toàn bộ dữ liệu liên quan
-- Ngày: 13/04/2026

-- 1. Phiếu cân: Từ SET NULL -> CASCADE
ALTER TABLE IF EXISTS phieu_can 
  DROP CONSTRAINT IF EXISTS phieu_can_khach_hang_id_fkey;

ALTER TABLE IF EXISTS phieu_can
  ADD CONSTRAINT phieu_can_khach_hang_id_fkey 
  FOREIGN KEY (khach_hang_id) 
  REFERENCES khach_hang(id) 
  ON DELETE CASCADE;

-- 2. Phiếu bán: Từ RESTRICT -> CASCADE
ALTER TABLE IF EXISTS phieu_ban
  DROP CONSTRAINT IF EXISTS phieu_ban_khach_hang_id_fkey;

ALTER TABLE IF EXISTS phieu_ban
  ADD CONSTRAINT phieu_ban_khach_hang_id_fkey
  FOREIGN KEY (khach_hang_id)
  REFERENCES khach_hang(id)
  ON DELETE CASCADE;
