-- ============================================
-- SCRIPT CLEANUP DỮ LIỆU TEST - PHIÊN BẢN AN TOÀN
-- (Xóa từng bước, có thể dừng lại nếu lỗi)
-- Ngày: 4/2026
-- ⚠️ BACKUP DATABASE TRƯỚC KHI CHẠY!
-- ============================================

-- ============ BƯỚC 1: BACKUP ĐỂ ROLLBACK ============

ECHO '💾 CẢI ĐẶTPOINT SAU KỲIMPORT DỮ LI...
-- Tạo savepoint để có thể rollback nếu có vấn đề
SAVEPOINT before_cleanup;

-- ============ BƯỚC 2: KIỂM TRAbang có DỮ LIỆU TEST KHÔNG ============

ECHO '🔍 KIỂM TRA DỮ LI...UTEST:';

-- Đếm công nhân test
SELECT COUNT(*) as cong_nhan_test FROM cong_nhan 
WHERE ho_ten ILIKE '%test%' OR ho_ten ILIKE '%demo%';

-- Đếm khách hàng test
SELECT COUNT(*) as khach_hang_test FROM khach_hang 
WHERE ten_khach_hang ILIKE '%test%' OR ten_khach_hang ILIKE '%demo%';

-- ============ BƯỚC 3: DISABLE TRIGGERS ============
-- LƯUÝː CÓ THỂ SKIP NẾUKHÔNG MUỐN TỐC ĐỘ CAO

-- Disable trigger để tốc độ nhanh hơn
ALTER TABLE cham_cong DISABLE TRIGGER trigger_recalculate_luong;
ALTER TABLE tong_tien_cong_ngay DISABLE TRIGGER trigger_recalculate_luong_total;
ALTER TABLE phieu_can DISABLE TRIGGER trigger_calculate_cong_no;

-- ============ BƯỚC 4: XÓA TẦNG LƯƠNG (luong_thang) ============

ECHO '🗑️ Bước 1/6: Xóa dữ liệu lương từ công nhân test...';

DELETE FROM luong_thang
WHERE cong_nhan_id IN (
  SELECT id FROM cong_nhan 
  WHERE ho_ten ILIKE '%test%' 
     OR ho_ten ILIKE '%demo%'
     OR ma_cong_nhan ILIKE '%test%'
     OR ma_cong_nhan ILIKE '%demo%'
);

RAISE NOTICE '✓ Xóa thành công luong_thang';

-- ============ BƯỚC 5: XÓA PHIẾU CÂN (phieu_can) ============

ECHO '🗑️ Bước 2/6: Xóa phiếu cân của khách hàng test + ghi chú test...';

DELETE FROM phieu_can
WHERE khach_hang_id IN (
  SELECT id FROM khach_hang 
  WHERE ten_khach_hang ILIKE '%test%' 
     OR ten_khach_hang ILIKE '%demo%'
     OR ma_khach_hang ILIKE '%test%'
     OR ma_khach_hang ILIKE '%demo%'
)
OR ghi_chu ILIKE '%test%' 
OR ghi_chu ILIKE '%demo%';

RAISE NOTICE '✓ Xóa thành công phieu_can';

-- ============ BƯỚC 6: XÓA CHẤM CÔNG (cham_cong) ============

ECHO '🗑️ Bước 3/6: Xóa chấm công có ghi chú test hoặc của công nhân test...';

-- Xóa chấm công có ghi chú test/demo
DELETE FROM cham_cong
WHERE ghi_chu ILIKE '%test%' 
   OR ghi_chu ILIKE '%demo%';

-- Xóa chấm công của công nhân test/demo
DELETE FROM cham_cong
WHERE cong_nhan_id IN (
  SELECT id FROM cong_nhan 
  WHERE ho_ten ILIKE '%test%' 
     OR ho_ten ILIKE '%demo%'
     OR ma_cong_nhan ILIKE '%test%'
     OR ma_cong_nhan ILIKE '%demo%'
);

RAISE NOTICE '✓ Xóa thành công cham_cong';

-- ============ BƯỚC 7: XÓA TỔNG TIỀN CÔNG NGÀY (tong_tien_cong_ngay) ============

ECHO '🗑️ Bước 4/6: Xóa tổng tiền công ngày có ghi chú test...';

DELETE FROM tong_tien_cong_ngay
WHERE ghi_chu ILIKE '%test%' 
   OR ghi_chu ILIKE '%demo%';

RAISE NOTICE '✓ Xóa thành công tong_tien_cong_ngay';

-- ============ BƯỚC 8: XÓA CÔNG NHÂN (cong_nhan) ============

ECHO '🗑️ Bước 5/6: Xóa công nhân có tên/mã test...';

DELETE FROM cong_nhan
WHERE ho_ten ILIKE '%test%' 
   OR ho_ten ILIKE '%demo%'
   OR ma_cong_nhan ILIKE '%test%'
   OR ma_cong_nhan ILIKE '%demo%';

RAISE NOTICE '✓ Xóa thành công cong_nhan';

-- ============ BƯỚC 9: XÓA KHÁCH HÀNG (khach_hang) ============

ECHO '🗑️ Bước 6/6: Xóa khách hàng có tên/mã test...';

DELETE FROM khach_hang
WHERE ten_khach_hang ILIKE '%test%' 
   OR ten_khach_hang ILIKE '%demo%'
   OR ma_khach_hang ILIKE '%test%'
   OR ma_khach_hang ILIKE '%demo%';

RAISE NOTICE '✓ Xóa thành công khach_hang';

-- ============ BƯỚC 10: ENABLE LẠI TRIGGERS ============

ECHO '🔌 Bật lại triggers...';

ALTER TABLE cham_cong ENABLE TRIGGER trigger_recalculate_luong;
ALTER TABLE tong_tien_cong_ngay ENABLE TRIGGER trigger_recalculate_luong_total;
ALTER TABLE phieu_can ENABLE TRIGGER trigger_calculate_cong_no;

RAISE NOTICE '✓ Bật lại triggers thành công';

-- ============ BƯỚC 11: RECALCULATE LƯƠNG ============

ECHO '🧮 Tính lại lương tháng từ chấm công...';

-- Xóa tất cả lương cũ
DELETE FROM luong_thang WHERE id > 0;

-- Tính lại lương từ tất cả chấm công còn lại
DO $$
DECLARE
  v_ngay DATE;
BEGIN
  FOR v_ngay IN 
    SELECT DISTINCT ngay FROM cham_cong ORDER BY ngay ASC
  LOOP
    PERFORM recalculate_luong_ngay(v_ngay);
  END LOOP;
  RAISE NOTICE '✓ Tính lại lương thành công cho % ngày', 
    (SELECT COUNT(DISTINCT ngay) FROM cham_cong);
END $$;

-- ============ BƯỚC 12: KIỂM TRA KẾT QUẢ ============

ECHO '📊 KIỂM TRA KẾT QUẢ:';

SELECT 
  (SELECT COUNT(*) FROM cong_nhan) as "Tổng CN",
  (SELECT COUNT(*) FROM khach_hang) as "Tổng KH",
  (SELECT COUNT(*) FROM cham_cong) as "Tổng CC",
  (SELECT COUNT(*) FROM phieu_can) as "Tổng PC",
  (SELECT COUNT(*) FROM luong_thang) as "Tổng LT",
  (SELECT COUNT(*) FROM tong_tien_cong_ngay) as "Tổng TTCN"
AS "📈 Thống kê dữ liệu sau cleanup";

-- ============ BƯỚC 13: THỐNG KÊ XÓA ============

ECHO '🗑️ THỐNG KÊ XÓA:';

-- Ghi lại số lượng xóa được
SELECT 
  'Xóa dữ liệu test thành công!' as trang_thai,
  CURRENT_TIMESTAMP as thoi_gian;

-- ============ FINAL: RELEASE SAVEPOINT ============

RELEASE SAVEPOINT before_cleanup;

RAISE NOTICE '✅ CLEANUP HOÀN TẤT - SẴN SÀNG DEPLOY!';
RAISE NOTICE '⚠️  Nếu có lỗi, chạy: ROLLBACK TO SAVEPOINT before_cleanup;';

-- ============================================
-- HƯỚNG DẪN SỬ DỤNG:
-- ============================================
-- 1. Backup DB trước (xem BACKUP_INSTRUCTIONS.md)
-- 2. Chạy script này từ Supabase SQL Editor hoặc psql
-- 3. Nếu OK: tiếp tục deploy
-- 4. Nếu lỗi: Kiểm tra tin nhắn lỗi, fix, chạy lại
-- 5. Chạy verify-cleanup.sql để đôi kiểm tra
-- ============================================
