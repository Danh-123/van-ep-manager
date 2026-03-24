# Hướng dẫn Quản trị Hệ thống

**Dành cho:** Admin, Quản trị viên hệ thống  
**Phiên bản:** 1.0  
**Cập nhật:** Tháng 3, 2026

---

## 📋 Mục lục

1. [Truy cập Admin](#truy-cập-admin)
2. [Quản lý người dùng](#quản-lý-người-dùng)
3. [Phân quyền vai trò](#phân-quyền-vai-trò)
4. [Xem Audit Log](#xem-audit-log)
5. [Backup dữ liệu](#backup-dữ-liệu)
6. [Cấu hình hệ thống](#cấu-hình-hệ-thống)
7. [Import dữ liệu](#import-dữ-liệu)
8. [Troubleshooting](#troubleshooting)

---

## 🔐 Truy cập Admin

### Điều kiện tiên quyết
- ✓ Tài khoản Supabase với role = "Admin"
- ✓ Quyền truy cập database
- ✓ Quyền SSH (nếu deploy self-hosted)

### Truy cập Dashboard Admin

1. **Đăng nhập** với tài khoản Admin
   ```
   URL: https://van-ep-manager.vercel.app/login
   Email: admin@company.com
   Password: [Mật khẩu Admin]
   ```

2. **Sau đăng nhập:**
   - Hệ thống nhận diện role = Admin
   - Sidebar hiển thị full menu (bao gồm "Quản lý người dùng", "Cấu hình")
   - Có thể truy cập `/admin` endpoints

3. **Verify role**
   - Click icon 👤 (Profile) → Xem role: "Admin"

### Điểm cấp quyền

**Hệ thống hỗ trợ 3 role:**
```
Admin       - Toàn quyền (tạo user, backup, audit log)
KeToan      - Quản lý dữ liệu (import, chấm công, lương)
Viewer      - Xem personal data (lương + chấm công của họ)
```

---

## 👥 Quản lý người dùng

### Truy cập Quản lý người dùng

**Menu:** Sidebar → **"Quản lý người dùng"** (Admin only)

### Xem danh sách người dùng

**Bảng hiển thị:**
```
Email                | Họ tên              | Role      | Trạng thái | Hành động
---|
admin@company.com    | Trần Huy Admin      | Admin     | Active     | [⚙️ Sửa]
ketoan@company.com   | Phạm Thu Kế toán    | KeToan    | Active     | [⚙️ Sửa]
ngvanA@company.com   | Nguyễn Văn A        | Viewer    | Active     | [⚙️ Sửa][🗑 Xóa]
```

**Các cột:**
- **Email**: Địa chỉ email login
- **Họ tên**: Tên hiển thị
- **Role**: Vai trò (Admin/KeToan/Viewer)
- **Trạng thái**: Active/Inactive/Pending
- **Hành động**: Sửa/Xóa

### Thêm người dùng mới

1. **Nhấp "Thêm người dùng"** (+ icon)
2. **Form nhập:**
   ```
   Email:        [email@company.com]
   Họ tên:       [Tên hiển thị]
   Vai trò:      [Dropdown - Admin/KeToan/Viewer]
   Mật khẩu:     [Auto generate hoặc nhập]
   Phòng ban:    [Optional]
   Sđt:          [Optional]
   ```
3. **Nhấp "Tạo"**

### Kết quả tạo người dùng

```
✓ Tài khoản tạo thành công!

Chi tiết:
- Email: ngvanB@company.com
- Mật khẩu: Temp@Pass123!
- Link: [gửi email]

Hành động:
□ Gửi email mời đăng nhập
□ In mật khẩu tạm
```

**Gửi mật khẩu cho người dùng mới:**
1. Nhấp "Gửi email"
2. Người dùng sẽ nhận email với:
   - Link đặt lại mật khẩu
   - Hướng dẫn đăng nhập
3. Họ phải đổi mật khẩu lần đầu

### Sửa người dùng

1. **Tìm user** trong danh sách
2. **Click nút ⚙️ (Settings)**
3. **Sửa thông tin:**
   - Họ tên
   - Vai trò
   - Phòng ban
   - Số điện thoại
4. **Nhấp "Cập nhật"**

**Ví dụ:** Nâng cấp từ Viewer → KeToan
```
User: Nguyễn Văn A
Role cũ: Viewer
Role mới: KeToan ← [Dropdown]
→ Nhấp "Cập nhật"
→ Người dùng được quyền truy cập module KeToan
```

### Khóa/Mở khóa tài khoản

**Khóa tài khoản:**
1. Click vào user
2. Nhấp status: "Active" → "Inactive"
3. User không thể đăng nhập

**Lý do khóa:**
- Nghỉ việc
- Tạm ngừng
- Vi phạm bảo mật

**Mở khóa:**
1. Nhấp status: "Inactive" → "Active"
2. User có thể đăng nhập lại

### Xóa người dùng

```
⚠️ CẢNH BÁO: Xóa user sẽ:
- Xóa tài khoản login
- Dữ liệu của họ vẫn giữ lại (chấm công, lương)
- Không thể undo
```

**Cách xóa:**
1. Click user
2. Nhấp "Xóa" (🗑 icon)
3. Xác nhận: "Bạn chắc chắn?"
4. Nhấp "Xóa vĩnh viễn"

### Reset mật khẩu người dùng

1. **Tìm user** cần reset
2. **Nhấp "Reset mật khẩu"**
3. **Hệ thống sẽ:**
   - Gửi email link reset
   - User click link đặt mật khẩu mới
4. **Lưu ý:** Mật khẩu tạm được gửi email

### Tìm kiếm người dùng

- **Search email:** Gõ email (partial match)
- **Filter role:** Chọn Admin/KeToan/Viewer
- **Filter status:** Active/Inactive/Pending

**Ví dụ:**
```
Search "ngvan" → Tìm tất cả emails chứa "ngvan"
Role = "KeToan" → Chỉ hiển thị Kế toán
```

---

## 🔑 Phân quyền vai trò

### Các vai trò & quyền

**Admin**
```
✓ Quản lý người dùng (tạo, sửa, xóa)
✓ Import dữ liệu Excel cũ
✓ Xem Audit Log (tất cả)
✓ Backup/Restore dữ liệu
✓ Cấu hình hệ thống
✓ Thay đổi RLS policies
✓ Quản lý tất cả dữ liệu (chấm công, lương, v.v.)
```

**KeToan**
```
✓ Quản lý chấm công (create, read, update)
✓ Quản lý phiếu cân
✓ Quản lý lương tháng
✓ Quản lý thanh toán
✓ Xem Audit Log (limited)
✓ Xuất báo cáo
✗ Không thể import dữ liệu cũ
✗ Không thể quản lý người dùng
✗ Không thể xem cấu hình hệ thống
```

**Viewer (Công nhân)**
```
✓ Xem lương cá nhân
✓ Xem chấm công cá nhân
✓ Xuất báo cáo lương cá nhân
✗ Không thể xem dữ liệu người khác
✗ Không thể chỉnh sửa bất cứ gì
✗ Không thể xem Audit Log
```

### RLS (Row Level Security) Policy

RLS bảo mật dữ liệu cho từng role. Tất cả được cấu hình ở database level.

**Policies hiện tại:**

**1. Profiles Table**
```
Policy: admin_all
  Role: Admin
  Quyền: SELECT, INSERT, UPDATE, DELETE
  Điều kiện: Không có (Full access)

Policy: ketoan_read
  Role: KeToan
  Quyền: SELECT only (Read-only)
  
Policy: viewer_own
  Role: Viewer
  Quyền: SELECT own profile only
```

**2. Cong Nhan Table (Công nhân)**
```
Policy: admin_all
  Role: Admin
  Quyền: Full (SELECT/INSERT/UPDATE/DELETE)

Policy: ketoan_read
  Role: KeToan
  Quyền: SELECT (Read-only tất cả công nhân)

Policy: viewer_personal
  Role: Viewer
  Quyền: SELECT personal record only
```

**3. Cham Cong Table (Chấm công)**
```
Policy: admin_all
  Role: Admin
  Quyền: Full
  
Policy: ketoan_all
  Role: KeToan
  Quyền: SELECT, INSERT, UPDATE, DELETE (Full write)

Policy: viewer_personal
  Role: Viewer
  Quyền: SELECT personal attendance only
```

**4. Audit Log Table**
```
Policy: admin_all
  Role: Admin
  Quyền: Full (create/read/delete audit records)

Policy: ketoan_read
  Role: KeToan
  Quyền: SELECT (Read audit log)

Policy: viewer_none
  Role: Viewer
  Quyền: None (Cannot see audit at all)
```

### Thêm Role mới (Advanced)

Nếu công ty cần role mới (ví dụ: "Supervisor"):

```sql
-- 1. Thêm role vào profiles table constraint
ALTER TABLE profiles 
  DROP CONSTRAINT check_role,
  ADD CONSTRAINT check_role 
    CHECK (role IN ('Admin', 'KeToan', 'Viewer', 'Supervisor'));

-- 2. Tạo RLS policy cho role mới
CREATE POLICY "supervisor_read_all" ON cong_nhan
  FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'Supervisor');

-- 3. Cập nhật app code để support role này
-- Edit: lib/roles.ts, Sidebar menu, etc.
```

### Kiểm tra quyền người dùng

**Verify user có đúng quyền:**
1. Login as user
2. Thử truy cập page
3. Nếu không đủ quyền → Redirect

**Kiểm tra RLS:**
```sql
-- Xem policies trên table
SELECT * FROM pg_policies 
WHERE tablename IN ('profiles', 'cong_nhan', 'audit_log');

-- Kiểm tra user role
SELECT id, email, role FROM auth.users LIMIT 5;
```

---

## 📊 Xem Audit Log

### Audit Log là gì?
Ghi lại tất cả thay đổi dữ liệu trong hệ thống (update/delete).

**Thông tin lưu:**
- ✓ Người thực hiện (email)
- ✓ Bảng nào bị sửa
- ✓ Record ID
- ✓ Hành động (INSERT/UPDATE/DELETE)
- ✓ Giá trị cũ (old value)
- ✓ Giá trị mới (new value)
- ✓ Timestamp

### Truy cập Audit Log

**Menu:** Sidebar → **"Audit log"** (Admin & KeToan)

### Filters & Tìm kiếm

**Các filter available:**

1. **Ngày** (Date Range)
   ```
   Từ:  [01/03/2026]
   Đến: [31/03/2026]
   ```

2. **Bảng** (Table)
   ```
   Dropdown: TatCa, cong_nhan, cham_cong, luong_thang, 
            phieu_can, lich_su_thanh_toan, audit_log, ...
   ```

3. **Hành động** (Action)
   ```
   Dropdown: TatCa, INSERT, UPDATE, DELETE
   ```

4. **Người dùng** (User)
   ```
   Search: ketoan@company.com (partial match)
   ```

### Ví dụ tìm kiếm

**Tìm: Ai sửa lương tháng 3?**
```
Ngày từ:     01/03/2026
Ngày đến:    31/03/2026
Bảng:        luong_thang
Hành động:   UPDATE
Người dùng:  [Leave empty]
→ Nhấp "Tìm kiếm"
```

**Kết quả:**
```
Thời gian          | Người dùng            | Bảng        | Hành động | Record ID
---|
24/03 14:30:45     | ketoan@company.com    | luong_thang | UPDATE    | 125
24/03 10:15:20     | admin@company.com     | luong_thang | UPDATE    | 124
23/03 09:45:10     | ketoan@company.com    | luong_thang | INSERT    | 123
```

### Xem chi tiết thay đổi

1. **Click vào hàng** trong bảng
2. **Mở rộng "Old Value" & "New Value"**
3. **So sánh giá trị:**

```
Old Value:
{
  "id": 125,
  "id_cong_nhan": 5,
  "thang": "2026-03",
  "tong_tien": 5000000,
  "da_thanh_toan": false
}

New Value:
{
  "id": 125,
  "id_cong_nhan": 5,
  "thang": "2026-03",
  "tong_tien": 5500000,  ← Sửa thêm 500k
  "da_thanh_toan": false
}
```

### Xóa Audit Log (Archive)

**Lưu trữ log cũ:**
```sql
-- Archive records older than 90 days
DELETE FROM audit_log 
WHERE created_at < NOW() - INTERVAL '90 days'
RETURNING COUNT(*);
```

**Trước xóa, BACKUP:**
```bash
# Export audit log to CSV
psql $DATABASE_URL -c "
COPY audit_log TO '/tmp/audit_backup_2026.csv' 
WITH (FORMAT csv, HEADER);"
```

---

## 💾 Backup dữ liệu

### Loại Backup

**1. Automated Backup (Automatic)**
- Supabase tự động backup hàng ngày
- Retention: 7 ngày (free plan), 60 ngày (paid)
- Navigate: Supabase Dashboard → Backups

**2. Manual Backup (On-demand)**
- Admin tạo backup trước import dữ liệu lớn
- Admin tạo backup trước release mới

**3. Export Backup (CSV/Excel)**
- Export từng module: chấm công, lương, v.v.
- Lưu trong shared drive

### Tạo Manual Backup

**Via Supabase Dashboard:**
1. https://app.supabase.com
2. Chọn project → Settings → Backups
3. Nhấp "Create backup"
4. Chọn tên: "backup_before_import_2026_03"
5. Backup bắt đầu

**Via CLI:**
```bash
# Cách 1: Dump database
pg_dump --host db.supabase.co \
        --user postgres \
        --password \
        --database postgres > backup_2026_03.sql

# Cách 2: Supabase CLI
supabase db pull > backup_schema.sql
```

### Restore từ Backup

**⚠️ CẢNH BÁO: Restore sẽ thay thế toàn bộ database!**

**Before restore:**
1. Notify team: "System downtime 10 minutes"
2. Stop app (disable imports)
3. Backup current database

**Via Supabase Dashboard:**
1. Supabase Dashboard → Settings → Backups
2. Chọn backup cần restore
3. Nhấp "Restore"
4. Xác nhận: "This will overwrite current data"
5. Wait for completion (~5-10 min)

**Via SQL:**
```bash
# Restore từ backup file
psql $DATABASE_URL < backup_2026_03.sql
```

### Verify Backup

**Sau restore:**
```sql
-- Kiểm tra record count
SELECT COUNT(*) FROM cong_nhan;      -- Should match
SELECT COUNT(*) FROM cham_cong;      -- Should match
SELECT COUNT(*) FROM luong_thang;    -- Should match

-- Kiểm tra latest record
SELECT * FROM audit_log 
ORDER BY created_at DESC LIMIT 1;
```

### Point-in-Time Recovery (PITR)

Restore dữ liệu đến thời điểm cụ thể (không phải chỉ toàn bộ backup).

```sql
-- Restore tất cả changes sau ngày X
-- (Supabase auto-manages WAL logs)

-- Via dashboard:
1. Settings → Backups → PITR
2. Select date/time: "24/03/2026 10:30:00"
3. Restore
```

---

## ⚙️ Cấu hình hệ thống

### Cấu hình Cơ bản

**Menu:** Sidebar → **"Cấu hình"** (Admin only)

### Dữ liệu Công ty

```
Tên công ty:          [Van EP Manager Co., Ltd]
Địa chỉ:             [123 Đường A, TP.HCM]
Số điện thoại:       [028-123-4567]
Email:               [info@company.com]
Logo:                [Upload logo PNG/JPG]
```

### Cấu hình Lương

```
Loại tiền tệ:        VND (Vietnam Dong)
Định dạng số tiền:   1,000,000 (1 million VND = 1 day)
Lương tối thiểu:     [Trống]
Lương/ngày trung bình: Setting (auto-calc từ total)
```

### Cấu hình Làm thêm

```
Lương làm thêm:      [% tăng - ví dụ: 150% = lương x 1.5]
Số note mặc định:    "Làm thêm"
```

### Cấu hình Phép & Nghỉ

```
Số ngày phép/năm:    [Tùy loại hợp đồng]
Nghỉ lễ tết:         [Tự động tính từ calendar]
Hệ số lương nghi lễ: [100% hay 150%]
```

### Cấu hình Email Notification

```
SMTP Server:         smtp.gmail.com
Port:                587
Email gửi đi:        noreply@company.com
Mật khẩu:            [App password]
```

**Test email:**
1. Nhấp "Test email"
2. Nhập email nhận: admin@company.com
3. Nhấp "Gửi"
4. Check inbox (+ thư rác)

### Cấu hình Backup Tự động

```
Backup tự động:      ✓ Bật
Tần suất:            Daily (hàng ngày)
Giờ backup:          02:00 AM (tránh high traffic)
Retention:           30 days (giữ 30 ngày)
```

### Cấu hình Security

```
Require 2FA:         ☐ Enforce 2-factor auth
Password expiry:     ☐ Reset every 90 days
IP whitelist:        [Leave empty or add IPs]
Session timeout:     30 minutes
```

---

## 📥 Import dữ liệu

### Khi nào import?
- Migrate từ hệ thống cũ
- Import dữ liệu lịch sử
- Bulk update dữ liệu

### Bước chuẩn bị

**1. Chuẩn bị file Excel**
- Format: .xlsx hoặc .csv
- Mapping cột đúng (xem USER_GUIDE.md)
- Validate dữ liệu cơ bản

**2. Backup trước**
```bash
# Save current state
supabase db pull > backup_before_import.sql
```

**3. Test import**
- Import vào staging/dev trước
- Verify kết quả
- Fix lỗi nếu có

### Truy cập Import

**Menu:** Sidebar → **"Import du liệu"** (Admin only)

### Bước import

1. **Chọn tab** (Chấm công, Lương, Phiếu cân, Công nợ)
2. **Upload file** (.xlsx/.csv)
3. **Map cột** (Match file columns ↔ DB columns)
4. **Validate** (Check errors)
5. **Dry-run** (Preview without saving)
6. **Import** (Save to database)

**(Chi tiết xem USER_GUIDE.md section "Import dữ liệu cũ")**

### Xử lý lỗi import

**Bản ghi không valid:**
- ❌ Định dạng sai (date, number)
- ❌ Công nhân không tồn tại
- ❌ Cột bắt buộc bị thiếu

**Cách fix:**
1. Sửa file Excel
2. Re-upload
3. Map cột lại
4. Validate & import

### Rollback import sai

**Nếu import nhầm:**
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_import.sql

# Verify
SELECT COUNT(*) FROM cham_cong;  -- Should match old count
```

---

## 🐛 Troubleshooting

### 1. User không thể đăng nhập

**Kiểm tra:**
```sql
-- Status = Active?
SELECT id, email, role, status FROM profiles 
WHERE email = 'user@company.com';

-- Kết quả: status = 'Active'? Nếu không:
UPDATE profiles 
SET status = 'Active' 
WHERE email = 'user@company.com';
```

**Giải pháp:**
1. Reset mật khẩu user
2. Gửi email link reset
3. User click link & đặt mật khẩu mới

### 2. "Row level security policy perm denied"

**Nguyên nhân:**
- RLS policy không match user role
- Auth context không đúng

**Fix:**
```sql
-- 1. Verify user role
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- 2. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'cong_nhan';

-- 3. Temporary disable RLS for testing
ALTER TABLE cong_nhan DISABLE ROW LEVEL SECURITY;

-- 4. Test query works
SELECT * FROM cong_nhan WHERE id = 1;

-- 5. Re-enable RLS
ALTER TABLE cong_nhan ENABLE ROW LEVEL SECURITY;
```

### 3. Import dữ liệu slow/timeout

**Nguyên nhân:**
- File quá lớn (>10,000 rows)
- Network không ổn định
- Database đang busy

**Fix:**
1. Split file thành batch nhỏ (< 1,000 rows)
2. Import từng batch
3. Hoặc import vào DB trực tiếp via CLI:
   ```bash
   psql $DATABASE_URL < large_data.sql
   ```

### 4. Lương tính sai sau sửa

**Nguyên nhân:**
- Recalculation function không chạy
- Dữ liệu input sai (chấm công hoặc tiền công)

**Fix:**
```sql
-- Trigger recalpulation manually
SELECT recalculate_luong_ngay('2026-03-20');

-- Verify result
SELECT * FROM tong_tien_cong_ngay 
WHERE ngay = '2026-03-20';
```

### 5. Backup/Restore fail

**Log check:**
```bash
# Check backup status
supabase db backup check

# If backup corrupt, restore from different point
# Supabase Dashboard → Backups → Choose older backup
```

### 6. Permissions error saat deploy

**Issue:** "Permission denied" saat access database

**Fix:**
```bash
# 1. Verify Supabase URL & keys correct
echo $NEXT_PUBLIC_SUPABASE_URL

# 2. Check token expiry (if using JWT)
# 3. Verify user role in profiles table:
SELECT * FROM profiles WHERE email = 'admin@company.com';

# 4. Check if RLS is properly set:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 7. Audit Log queries slow

**Optimize:**
```sql
-- Add indexes
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(changed_by);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);

-- Run VACUUM ANALYZE
VACUUM ANALYZE audit_log;
```

---

## 📞 Support & Escalation

**Admin Support Contacts:**
- **Lead DBA**: [Name] ([email])
- **DevOps**: [Name] ([email])
- **On-call**: [Phone] (24/7)

**External Support:**
- **Supabase Issues**: https://supabase.com/support
- **Vercel Deployment**: https://vercel.com/support
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## ✅ Admin Checklist

### Daily
- [ ] Check Vercel deployments (no errors)
- [ ] Monitor database CPU/Memory
- [ ] Review new users created
- [ ] Check Audit Log for anomalies

### Weekly
- [ ] Verify backups completed
- [ ] Review slow queries
- [ ] Check for failed logins
- [ ] Update monitoring alerts

### Monthly
- [ ] Archive old Audit Logs (> 90 days)
- [ ] Performance analysis
- [ ] Security audit (new users, permissions)
- [ ] Disaster recovery test (restore 1 backup)

### Quarterly
- [ ] Full backup restoration test
- [ ] RLS policies review
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Team training update

---

**Phiên bản:** 1.0  
**Cập nhật:** Tháng 3, 2026  
**Reviewer:** IT Team
