-- ============================================
-- SCRIPT KIỂM TRA DỮ LIỆU SAU KHI XÓA TEST
-- Ngày: 4/2026
-- Chạy sau script cleanup-test-data.sql
-- ============================================

-- ============ PHẦN 1: KIỂM TRA CÓ DỮ LIỆU TEST CÒNLẠI ============

ECHO '📋 KIỂM TRA: Còn công nhân/khách hàng test?'
ECHO '-------------------------------------------'

SELECT 
  'Công nhân test' AS loai,
  COUNT(*) as so_luong 
FROM cong_nhan 
WHERE ho_ten ILIKE '%test%' 
   OR ho_ten ILIKE '%demo%'
   OR ma_cong_nhan ILIKE '%test%'
   OR ma_cong_nhan ILIKE '%demo%'
UNION ALL
SELECT 
  'Khách hàng test' AS loai,
  COUNT(*) as so_luong 
FROM khach_hang 
WHERE ten_khach_hang ILIKE '%test%' 
   OR ten_khach_hang ILIKE '%demo%'
   OR ma_khach_hang ILIKE '%test%'
   OR ma_khach_hang ILIKE '%demo%'
UNION ALL
SELECT 
  'Chấm công test' AS loai,
  COUNT(*) as so_luong 
FROM cham_cong 
WHERE ghi_chu ILIKE '%test%' 
   OR ghi_chu ILIKE '%demo%'
UNION ALL
SELECT 
  'Phiếu cân test' AS loai,
  COUNT(*) as so_luong 
FROM phieu_can 
WHERE ghi_chu ILIKE '%test%' 
   OR ghi_chu ILIKE '%demo%'
UNION ALL
SELECT 
  'Tổng tiền công test' AS loai,
  COUNT(*) as so_luong 
FROM tong_tien_cong_ngay 
WHERE ghi_chu ILIKE '%test%' 
   OR ghi_chu ILIKE '%demo%';

-- ============ PHẦN 2: THỐNG KÊ TỔNG DỮ LIỆU ============

ECHO '📊 THỐNG KÊ DỮ LIỆU HIỆN TẠI:'
ECHO '-------------------------------------------'

SELECT 
  (SELECT COUNT(*) FROM cong_nhan) as "Tổng Công nhân",
  (SELECT COUNT(*) FROM khach_hang) as "Tổng Khách hàng",
  (SELECT COUNT(*) FROM cham_cong) as "Tổng Chấm công",
  (SELECT COUNT(*) FROM phieu_can) as "Tổng Phiếu cân",
  (SELECT COUNT(*) FROM luong_thang) as "Tổng Lương tháng",
  (SELECT COUNT(*) FROM tong_tien_cong_ngay) as "Tổng Tiền công ngày";

-- ============ PHẦN 3: KIỂM TRA RÍ RẠNG (Referential Integrity) ============

ECHO '🔗 KIỂM TRA TÍNH TÒN TẠI CỦA FOREIGN KEYS:'
ECHO '-------------------------------------------'

-- Kiểm tra cham_cong.cong_nhan_id có tồn tại trong cong_nhan
SELECT 
  'cham_cong với cong_nhan_id không tồn tại' as loi,
  COUNT(*) as so_luong
FROM cham_cong cc
LEFT JOIN cong_nhan cn ON cc.cong_nhan_id = cn.id
WHERE cn.id IS NULL;

-- Kiểm tra luong_thang.cong_nhan_id có tồn tại trong cong_nhan
SELECT 
  'luong_thang với cong_nhan_id không tồn tại' as loi,
  COUNT(*) as so_luong
FROM luong_thang lt
LEFT JOIN cong_nhan cn ON lt.cong_nhan_id = cn.id
WHERE cn.id IS NULL;

-- Kiểm tra phieu_can.khach_hang_id có tồn tại trong khach_hang
SELECT 
  'phieu_can với khach_hang_id không tồn tại' as loi,
  COUNT(*) as so_luong
FROM phieu_can pc
LEFT JOIN khach_hang kh ON pc.khach_hang_id = kh.id
WHERE pc.khach_hang_id IS NOT NULL
  AND kh.id IS NULL;

-- ============ PHẦN 4: KIỂM TRA DỮ LIỆU YÊU CẦU ============

ECHO '✅ KIỂM TRA DỮ LIỆU YÊU CẦU:'
ECHO '-------------------------------------------'

-- Công nhân phải có user_id hoặc tạo để link sau
SELECT 
  'Công nhân chưa link user' as kiểm_tra,
  COUNT(*) as so_luong
FROM cong_nhan
WHERE user_id IS NULL;

-- Khách hàng phải có user_id hoặc tạo để link sau
SELECT 
  'Khách hàng chưa link user' as kiểm_tra,
  COUNT(*) as so_luong
FROM khach_hang
WHERE user_id IS NULL;

-- ============ PHẦN 5: KIỂM TRA TÍNH NHẤT QUÁN LỮ LIỆU ============

ECHO '🔍 KIỂM TRA TÍNH NHẤT QUÁN:'
ECHO '-------------------------------------------'

-- Kiểm tra chấm công có ngày hợp lệ
SELECT 
  'Chấm công có ngày lỗi' as loi,
  COUNT(*) as so_luong
FROM cham_cong
WHERE ngay > CURRENT_DATE;

-- Kiểm tra phiếu cân có khối lượng > 0
SELECT 
  'Phiếu cân có khối lượng <= 0' as loi,
  COUNT(*) as so_luong
FROM phieu_can
WHERE khoi_luong_tan <= 0;

-- Kiểm tra phiếu cân có đơn giá > 0
SELECT 
  'Phiếu cân có đơn giá <= 0' as loi,
  COUNT(*) as so_luong
FROM phieu_can
WHERE don_gia_ap_dung <= 0;

-- Kiểm tra lương tháng có luong_co_ban >= 0
SELECT 
  'Lương tháng có luong_co_ban < 0' as loi,
  COUNT(*) as so_luong
FROM luong_thang
WHERE luong_co_ban < 0;

-- ============ PHẦN 6: BÁO CÁO CUỐI ============

ECHO '✅ KIỂM TRA HOÀN TẤT'
ECHO '-------------------------------------------'

-- Nếu tất cả COUNT(*) = 0 thì dữ liệu sạch sẽ
-- Nếu có COUNT(*) > 0 thì có vấn đề cần khắc phục

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM cong_nhan 
      WHERE ho_ten ILIKE '%test%' OR ho_ten ILIKE '%demo%' OR ma_cong_nhan ILIKE '%test%' OR ma_cong_nhan ILIKE '%demo%'
    ) = 0
    AND (
      SELECT COUNT(*) FROM khach_hang 
      WHERE ten_khach_hang ILIKE '%test%' OR ten_khach_hang ILIKE '%demo%' OR ma_khach_hang ILIKE '%test%' OR ma_khach_hang ILIKE '%demo%'
    ) = 0
    AND (
      SELECT COUNT(*) FROM cham_cong 
      WHERE ghi_chu ILIKE '%test%' OR ghi_chu ILIKE '%demo%'
    ) = 0
    AND (
      SELECT COUNT(*) FROM phieu_can 
      WHERE ghi_chu ILIKE '%test%' OR ghi_chu ILIKE '%demo%'
    ) = 0
    AND (
      SELECT COUNT(*) FROM tong_tien_cong_ngay 
      WHERE ghi_chu ILIKE '%test%' OR ghi_chu ILIKE '%demo%'
    ) = 0
    THEN '✅ DỮ LIỆU SẠCH SẼ - SẴN SÀNG DEPLOY!'
    ELSE '❌ VẪN CÒN DỮ LIỆU TEST - KIỂM TRA LẠI'
  END as trang_thai_cleanup;

-- ============================================
-- GHI CHÚ:
-- ============================================
-- - Nếu TRANG_THAI_CLEANUP = ✅ thì được deploy
-- - Nếu có lỗi ở PHẦN 3 hoặc PHẦN 5, hãy kiểm tra lại
-- - Lỗi về FK sẽ gây crash khi deploy
-- - Hãy chạy verify này sau cleanup để đảm bảo OK
-- ============================================
