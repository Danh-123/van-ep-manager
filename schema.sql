-- ============================================
-- VANEPMANAGER - DATABASE HIỆN TẠI (SAU KHI SỬA)
-- Dự án: Toàn Tâm Phát
-- Ngày: 30/03/2026
-- ============================================

-- 1. BẢNG CÔNG NHÂN
CREATE TABLE IF NOT EXISTS cong_nhan (
  id SERIAL PRIMARY KEY,
  ma_cong_nhan TEXT UNIQUE NOT NULL,
  ho_ten TEXT NOT NULL,
  so_dien_thoai TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trang_thai TEXT DEFAULT 'DangLam' CHECK (trang_thai IN ('DangLam', 'NghiViec')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. BẢNG KHÁCH HÀNG
CREATE TABLE IF NOT EXISTS khach_hang (
  id SERIAL PRIMARY KEY,
  ma_khach_hang TEXT UNIQUE NOT NULL,
  ten_khach_hang TEXT NOT NULL UNIQUE,
  so_dien_thoai TEXT,
  dia_chi TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BẢNG CHẤM CÔNG (ĐÃ SỬA - ĐƠN GIẢN)
CREATE TABLE IF NOT EXISTS cham_cong (
  id SERIAL PRIMARY KEY,
  ngay DATE NOT NULL,
  cong_nhan_id INTEGER NOT NULL REFERENCES cong_nhan(id) ON DELETE CASCADE,
  trang_thai TEXT NOT NULL DEFAULT 'CoMat' CHECK (trang_thai IN ('CoMat', 'Nghi', 'NghiPhep', 'LamThem')),
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ngay, cong_nhan_id)
);

-- 4. BẢNG TỔNG TIỀN CÔNG NGÀY (TỪ CAO SU + ĐIỀU)
CREATE TABLE IF NOT EXISTS tong_tien_cong_ngay (
  id SERIAL PRIMARY KEY,
  ngay DATE UNIQUE NOT NULL,
  cao_su_kg DECIMAL(15,2) DEFAULT 0,
  don_gia_cao_su DECIMAL(15,2) DEFAULT 0,
  dieu_kg DECIMAL(15,2) DEFAULT 0,
  don_gia_dieu DECIMAL(15,2) DEFAULT 0,
  tong_tien DECIMAL(15,2) GENERATED ALWAYS AS (
    (cao_su_kg * don_gia_cao_su) + (dieu_kg * don_gia_dieu)
  ) STORED,
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. BẢNG LƯƠNG THÁNG (TỰ ĐỘNG TÍNH TỪ CHẤM CÔNG)
CREATE TABLE IF NOT EXISTS luong_thang (
  id SERIAL PRIMARY KEY,
  thang DATE NOT NULL,
  cong_nhan_id INTEGER NOT NULL REFERENCES cong_nhan(id) ON DELETE CASCADE,
  luong_co_ban DECIMAL(15,2) DEFAULT 0,
  thuong DECIMAL(15,2) DEFAULT 0,
  phat DECIMAL(15,2) DEFAULT 0,
  tong_luong DECIMAL(15,2) GENERATED ALWAYS AS (luong_co_ban + thuong - phat) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thang, cong_nhan_id)
);

-- 6. BẢNG PHIẾU CÂN (CÔNG NỢ TÍCH LŨY THEO KHÁCH HÀNG)
CREATE TABLE IF NOT EXISTS phieu_can (
  id SERIAL PRIMARY KEY,
  ngay_can DATE DEFAULT CURRENT_DATE,
  so_phieu TEXT,
  khoi_luong_tan DECIMAL(15,2) NOT NULL CHECK (khoi_luong_tan > 0),
  don_gia_ap_dung DECIMAL(15,2) NOT NULL CHECK (don_gia_ap_dung > 0),
  thanh_tien DECIMAL(15,2) GENERATED ALWAYS AS (khoi_luong_tan * don_gia_ap_dung) STORED,
  so_tien_da_tra DECIMAL(15,2) DEFAULT 0,
  cong_no DECIMAL(15,2) DEFAULT 0,
  con_lai DECIMAL(15,2) GENERATED ALWAYS AS (cong_no - so_tien_da_tra) STORED,
  khach_hang_id INTEGER REFERENCES khach_hang(id) ON DELETE SET NULL,
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. BẢNG LOẠI VÁN ÉP
CREATE TABLE IF NOT EXISTS loai_van_ep (
  id SERIAL PRIMARY KEY,
  ten_loai TEXT UNIQUE NOT NULL,
  don_gia DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. BẢNG PROFILES (LIÊN KẾT AUTH)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Admin', 'KeToan', 'Viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. BẢNG AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  table_name TEXT NOT NULL,
  record_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. VIEW LƯƠNG CÁ NHÂN
CREATE OR REPLACE VIEW view_luong_ca_nhan WITH (security_invoker = true) AS
SELECT 
  lt.thang,
  lt.luong_co_ban,
  lt.thuong,
  lt.phat,
  lt.tong_luong,
  cn.ho_ten,
  cn.ma_cong_nhan,
  cn.user_id
FROM luong_thang lt
JOIN cong_nhan cn ON lt.cong_nhan_id = cn.id;

-- 11. VIEW CÔNG NỢ CÁ NHÂN
CREATE OR REPLACE VIEW view_cong_no_ca_nhan WITH (security_invoker = true) AS
SELECT 
  pc.id,
  pc.ngay_can AS ngay,
  pc.so_phieu,
  pc.khoi_luong_tan AS so_tan,
  pc.don_gia_ap_dung AS don_gia,
  pc.thanh_tien,
  pc.so_tien_da_tra AS thanh_toan,
  pc.con_lai,
  kh.ten_khach_hang,
  kh.user_id
FROM phieu_can pc
JOIN khach_hang kh ON pc.khach_hang_id = kh.id;

-- 12. HÀM TÍNH LẠI LƯƠNG
CREATE OR REPLACE FUNCTION recalculate_luong_ngay(p_ngay DATE)
RETURNS VOID AS $$
DECLARE
  v_tong_tien DECIMAL;
  v_so_nguoi_di_lam INTEGER;
  v_luong_co_ban DECIMAL;
  v_cong_nhan RECORD;
  v_thang DATE;
BEGIN
  SELECT tong_tien INTO v_tong_tien FROM tong_tien_cong_ngay WHERE ngay = p_ngay;
  IF NOT FOUND THEN RETURN; END IF;
  
  SELECT COUNT(*) INTO v_so_nguoi_di_lam 
  FROM cham_cong 
  WHERE ngay = p_ngay AND trang_thai = 'CoMat';
  
  IF v_so_nguoi_di_lam = 0 THEN RETURN; END IF;
  
  v_luong_co_ban := v_tong_tien / v_so_nguoi_di_lam;
  v_thang := DATE_TRUNC('month', p_ngay);
  
  FOR v_cong_nhan IN 
    SELECT cong_nhan_id FROM cham_cong 
    WHERE ngay = p_ngay AND trang_thai = 'CoMat'
  LOOP
    INSERT INTO luong_thang (thang, cong_nhan_id, luong_co_ban)
    VALUES (v_thang, v_cong_nhan.cong_nhan_id, v_luong_co_ban)
    ON CONFLICT (thang, cong_nhan_id) 
    DO UPDATE SET luong_co_ban = luong_thang.luong_co_ban + EXCLUDED.luong_co_ban;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 13. TRIGGER TỰ ĐỘNG TÍNH LƯƠNG
CREATE OR REPLACE FUNCTION auto_recalculate_luong()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_luong_ngay(OLD.ngay);
  ELSE
    PERFORM recalculate_luong_ngay(NEW.ngay);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_luong ON cham_cong;
CREATE TRIGGER trigger_recalculate_luong
  AFTER INSERT OR UPDATE OR DELETE ON cham_cong
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_luong();

DROP TRIGGER IF EXISTS trigger_recalculate_luong_total ON tong_tien_cong_ngay;
CREATE TRIGGER trigger_recalculate_luong_total
  AFTER INSERT OR UPDATE OR DELETE ON tong_tien_cong_ngay
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_luong();

-- 14. HÀM TÍNH CÔNG NỢ THEO KHÁCH HÀNG
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
    NEW.cong_no := NEW.thanh_tien;
  ELSE
    NEW.cong_no := NEW.thanh_tien + last_con_lai;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_cong_no ON phieu_can;
CREATE TRIGGER trigger_calculate_cong_no
  BEFORE INSERT ON phieu_can
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cong_no_by_customer();

-- 15. INDEXES
CREATE INDEX IF NOT EXISTS idx_cham_cong_ngay ON cham_cong(ngay);
CREATE INDEX IF NOT EXISTS idx_cham_cong_cong_nhan_id ON cham_cong(cong_nhan_id);
CREATE INDEX IF NOT EXISTS idx_luong_thang_thang ON luong_thang(thang);
CREATE INDEX IF NOT EXISTS idx_luong_thang_cong_nhan_id ON luong_thang(cong_nhan_id);
CREATE INDEX IF NOT EXISTS idx_phieu_can_khach_hang_id ON phieu_can(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_phieu_can_ngay_can ON phieu_can(ngay_can);