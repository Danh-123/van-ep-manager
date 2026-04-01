-- ============================================
-- SCRIPT XÓA DỮ LIỆU TEST TỪ VanEpManager
-- Ngày: 4/2026
-- ⚠️ BACKUP DATABASE TRƯỚC KHI CHẠY!
-- ============================================

-- Bước 1: Bật transaction để có thể rollback nếu có lỗi
BEGIN;

-- Bước 2: Disable triggers tạm thời để tốc độ xóa nhanh hơn
ALTER TABLE cham_cong DISABLE TRIGGER trigger_recalculate_luong;
ALTER TABLE tong_tien_cong_ngay DISABLE TRIGGER trigger_recalculate_luong_total;
ALTER TABLE phieu_can DISABLE TRIGGER trigger_calculate_cong_no;

-- Bước 3: Xóa các record lương từ công nhân test/demo
DELETE FROM luong_thang
WHERE cong_nhan_id IN (
  SELECT id FROM cong_nhan 
  WHERE ho_ten ILIKE '%test%' OR ho_ten ILIKE '%demo%'
);

-- Bước 4: Xóa phiếu cân của khách hàng test/demo hoặc có ghi chú test/demo
DELETE FROM phieu_can
WHERE khach_hang_id IN (
  SELECT id FROM khach_hang 
  WHERE ten_khach_hang ILIKE '%test%' OR ten_khach_hang ILIKE '%demo%'
)
OR ghi_chu ILIKE '%test%' 
OR ghi_chu ILIKE '%demo%';

-- Bước 5: Xóa chấm công có ghi chú chứa 'test' hoặc 'demo'
DELETE FROM cham_cong
WHERE ghi_chu ILIKE '%test%' 
OR ghi_chu ILIKE '%demo%';

-- Bước 6: Xóa chấm công của công nhân test/demo
DELETE FROM cham_cong
WHERE cong_nhan_id IN (
  SELECT id FROM cong_nhan 
  WHERE ho_ten ILIKE '%test%' OR ho_ten ILIKE '%demo%'
);

-- Bước 7: Xóa tổng tiền công ngày có ghi chú chứa 'test' hoặc 'demo'
DELETE FROM tong_tien_cong_ngay
WHERE ghi_chu ILIKE '%test%' 
OR ghi_chu ILIKE '%demo%';

-- Bước 8: Xóa công nhân có tên hoặc mã chứa 'test' hoặc 'demo'
DELETE FROM cong_nhan
WHERE ho_ten ILIKE '%test%' 
OR ho_ten ILIKE '%demo%'
OR ma_cong_nhan ILIKE '%test%'
OR ma_cong_nhan ILIKE '%demo%';

-- Bước 9: Xóa khách hàng có tên hoặc mã chứa 'test' hoặc 'demo'
DELETE FROM khach_hang
WHERE ten_khach_hang ILIKE '%test%' 
OR ten_khach_hang ILIKE '%demo%'
OR ma_khach_hang ILIKE '%test%'
OR ma_khach_hang ILIKE '%demo%';

-- Bước 10: Bật lại các triggers
ALTER TABLE cham_cong ENABLE TRIGGER trigger_recalculate_luong;
ALTER TABLE tong_tien_cong_ngay ENABLE TRIGGER trigger_recalculate_luong_total;
ALTER TABLE phieu_can ENABLE TRIGGER trigger_calculate_cong_no;

-- Bước 11: Recalculate lương cho tất cả ngày còn lại
-- (Xóa lương cũ và tính lại từ chấm công)
DELETE FROM luong_thang 
WHERE id > 0;  -- Xóa tất cả

-- Bước 12: Tính lại lương từ dữ liệu chấm công còn lại
WITH dates AS (
  SELECT DISTINCT ngay FROM cham_cong ORDER BY ngay
)
SELECT recalculate_luong_ngay(ngay) FROM dates;

-- Bước 13: Commit transaction
COMMIT;

-- ============================================
-- KÍẾT QUẢ
-- ============================================
-- Nếu không có lỗi, script sẽ xóa:
-- ✓ Tất cả công nhân có tên/mã chứa 'test' hoặc 'demo'
-- ✓ Tất cả khách hàng có tên/mã chứa 'test' hoặc 'demo'
-- ✓ Chấm công của những người dùng trên
-- ✓ Chấm công có ghi chú chứa 'test' hoặc 'demo'
-- ✓ Phiếu cân của khách hàng trên hoặc có ghi chú 'test'/'demo'
-- ✓ Tổng tiền công ngày có ghi chú chứa 'test' hoặc 'demo'
-- ✓ Reset và tính lại lương tháng
--
-- Nếu có lỗi, dữ liệu sẽ ROLLBACK (không thay đổi)
-- ============================================
