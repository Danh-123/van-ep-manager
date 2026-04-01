# 💾 Hướng Dẫn Backup Database Trước Deploy

**Ngày:** Tháng 4, 2026  
**Dành cho:** DevOps, Tech Lead, Admin

---

## 📋 Mục Lục

1. [Tại Sao Cần Backup?](#tại-sao-cần-backup)
2. [Các Phương Pháp Backup](#các-phương-pháp-backup)
3. [Backup Supabase (UI)](#backup-supabase-ui)
4. [Backup Supabase (CLI)](#backup-supabase-cli)
5. [Backup PostgreSQL SQL Dump](#backup-postgresql-sql-dump)
6. [Kiểm Tra Backup](#kiểm-tra-backup)
7. [Restore Từ Backup](#restore-từ-backup)

---

## ❓ Tại Sao Cần Backup?

**Tình Huống:**
- Chạy script xóa dữ liệu test nhưng gặp lỗi
- Cần rollback lại dữ liệu cũ
- Database corruption hoặc data loss

**Giải Pháp:** Luôn backup trước deploy production!

---

## 🛠️ Các Phương Pháp Backup

| Phương Pháp | Tốc Độ | Dung Lượng | Dễ Restore | Khuyên Dùng |
|-----------|--------|----------|-----------|-----------|
| **UI Supabase** | Chậm | Nén | Dễ | ✅ Newbie |
| **Supabase CLI** | Nhanh | Nén | Dễ | ✅ Intermediate |
| **PG Dump** | Nhanh | Có thể lớn | Trung bình | ✅ Advanced |
| **Backup tự động** | N/A | Nén | Dễ | ✅ Production |

---

## 🔒 Backup Supabase (UI)

**Được khuyến nghị** cho người dùng không quen CLI.

### Bước 1: Đăng Nhập Supabase

1. Truy cập https://app.supabase.com
2. Chọn project VanEpManager
3. Nhập credentials

### Bước 2: Vào Phần Backup

1. Sidebar → **Backups**
2. Bên phải: **Backup Management**

### Bước 3: Tạo Backup

1. Nhấp **"Create a backup"**
2. Xác nhận lần cuối
3. Chờ 5-10 phút

**Tiến trình:**
```
Creating backup...    [████░░░░] 40%
Uploading...         [████████] 100% ✓
```

### Bước 4: Tải Xuống Backup

1. Trong bảng **Backups**, tìm backup mới tạo
2. Click menu `⋮` → **Download**
3. File sẽ tải xuống dạng `.sql` hoặc `.tar.gz`

**Lưu ý:** File có thể rất lớn (100MB - 1GB+)

### Bước 5: Lưu An Toàn

```bash
# Lưu vào thư mục an toàn
mkdir -p ~/backups/van-ep-manager
mv ~/Downloads/backup-*.sql ~/backups/van-ep-manager/

# Ghi nhận thời gian backup
echo "Backup: $(date)" >> ~/backups/van-ep-manager/backup-log.txt
```

---

## 🔧 Backup Supabase (CLI)

**Được khuyến nghị** cho người quen dùng terminal.

### Bước 1: Cài Đặt Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://cli.supabase.io/install.sh | bash

# Windows (PowerShell)
choco install supabase-cli
# Hoặc tải từ: https://github.com/supabase/cli/releases
```

### Bước 2: Login

```bash
supabase login
```

Sẽ mở browser, đăng nhập Supabase, chấp nhận.

### Bước 3: Lấy Project Ref

```bash
# Xem danh sách projects
supabase projects list

# Output:
# ref                  | name
# -------------------- | ---
# xxxxxxxxxxxxx        | van-ep-manager-prod
```

Ghi nhớ `ref` (ví dụ: `xxxxxxxxxxxxx`)

### Bước 4: Tạo Backup

```bash
# Cú pháp: supabase db pull --project-ref <ref>
supabase db pull --project-ref xxxxxxxxxxxxx

# Hoặc tạo backup file
supabase db pull --project-ref xxxxxxxxxxxxx > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Kết quả:**
```
Downloaded database schema successfully to 'supabase/migrations/...'
```

### Bước 5: Lưu Backup

```bash
# Lưu vào thư mục an toàn
mkdir -p ~/backups/van-ep-manager
cp backup-*.sql ~/backups/van-ep-manager/
```

---

## 🐘 Backup PostgreSQL SQL Dump

**Cách trực tiếp nhất** nếu có quyền database.

### Bước 1: Cài Đặt PostgreSQL Tools

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download từ: https://www.postgresql.org/download/windows/
```

### Bước 2: Chuẩn Bị Thông Tin Kết Nối

Lấy từ Supabase Dashboard → Settings → Database:

```
Host:     xxxxx.supabase.co
Port:     5432
Database: postgres
User:     postgres
Password: [your-password]
```

### Bước 3: Tạo Backup SQL

```bash
# Cú pháp
pg_dump -h <host> -U <user> -d <database> > backup.sql

# Ví dụ
pg_dump -h xxxxx.supabase.co -U postgres -d postgres > backup-$(date +%Y%m%d-%H%M%S).sql

# System sẽ prompt mật khẩu
# Password for user postgres: [Paste]
```

**Khi prompt mật khẩu:**
1. Dán mật khẩu từ Supabase
2. Nhấn Enter
3. Chờ export (vài phút)

### Bước 4: Xác Minh File

```bash
# Kiểm tra file có được tạo
ls -lh backup-*.sql

# Output:
# -rw-r--r-- 1 user group 245M Apr  1 14:35 backup-20260401-143500.sql

# Kiểm tra nội dung (phải là SQL)
head -20 backup-*.sql
```

### Bước 5: Lưu An Toàn

```bash
# Lưu vào thư mục an toàn
mkdir -p ~/backups/van-ep-manager
mv backup-*.sql ~/backups/van-ep-manager/
```

---

## 📦 Backup Tự Động (Production)

Supabase tự động backup hàng ngày. Xem:

1. Supabase Dashboard → **Backups**
2. Tab **Automatic Backups**
3. Chọn restore point nếu cần

**Giữ lại:** 7 ngày

---

## ✅ Kiểm Tra Backup

Sau khi backup, kiểm tra:

```bash
# 1. Kiểm tra file tồn tại
ls -lh ~/backups/van-ep-manager/backup-*.sql

# 2. Kiểm tra dung lượng (phải > 0)
du -h ~/backups/van-ep-manager/backup-*.sql

# 3. Kiểm tra nội dung (phải là SQL)
head -20 ~/backups/van-ep-manager/backup-*.sql

# Output phải trong:
# -- PostgreSQL database dump
# --
# SET statement_timeout = 0;
# ...
```

**Checklist:**
- ✅ File tồn tại
- ✅ Dung lượng > 1 MB (nên là 100+MB)
- ✅ Nội dung bắt đầu bằng `-- PostgreSQL database dump`
- ✅ Có câu lệnh CREATE TABLE, INSERT

---

## 🔄 Restore Từ Backup

**Nếu cleanup bị lỗi hoặc cần rollback:**

### Cách 1: Restore Qua Supabase UI

1. Supabase Dashboard → **Backups**
2. Chọn backup cần restore
3. Click **Restore** → Xác nhận
4. Chờ 10-15 phút

**Lưu ý:** Database sẽ offline trong quá trình restore.

### Cách 2: Restore Từ Dump File (CLI)

```bash
# Cú pháp: psql -h <host> -U <user> -d <database> < backup.sql
psql -h xxxxx.supabase.co -U postgres -d postgres < backup-20260401-143500.sql

# System sẽ prompt mật khẩu
# Password for user postgres: [Paste]
```

**Khi prompt mật khẩu:**
1. Dán mật khẩu
2. Nhấn Enter
3. Chờ restore (vài phút)

### Cách 3: Restore Một Table Cụ Thể

Nếu chỉ muốn restore một bảng:

```bash
# Extract bảng cụ thể từ backup
pg_restore -h xxxxx.supabase.co -U postgres -d postgres \
  -t cong_nhan backup-20260401-143500.sql
```

---

## 🗓️ Quy Tắc Lưu Backup

**Production:**
- ✅ Backup hàng ngày (tự động)
- ✅ Giữ 7 ngày
- ✅ Copy về local/S3/Google Drive

**Pre-Deploy:**
- ✅ Backup trước khi cleanup
- ✅ Giữ 30 ngày
- ✅ Đặt tên rõ ràng: `backup-cleanup-20260401-143500.sql`

**Naming Convention:**

```
backup-<action>-<YYYYMMDD>-<HHMMSS>.sql

Ví dụ:
- backup-cleanup-20260401-143500.sql
- backup-pre-deploy-20260401-140000.sql
- backup-daily-20260401-000000.sql
```

---

## 📝 Hướng Dẫn Deploy An Toàn

**Tiến Trình:**

```
1️⃣  Backup database (xem hướng dẫn trên)
     ↓
2️⃣  Kiểm tra backup (xác minh file)
     ↓
3️⃣  Chạy cleanup-test-data.sql
     ↓
4️⃣  Chạy verify-cleanup.sql
     ↓
5️⃣  Nếu OK → Deploy lên production
     ↓
6️⃣  Commit backup vào Git (optional)
     ↓
7️⃣  Lưu backup 30+ ngày
```

---

## ⚠️ Lưu Ý Bảo Mật

- **KHÔNG** commit password vào Git
- **KHÔNG** share backup file trên Slack/Email
- **KHÔNG** để backup trên desktop công cộng
- **CÓ** lưu backup vào USB/External drive
- **CÓ** mã hóa backup nếu chứa dữ liệu nhạy cảm
- **CÓ** test restore 1 lần/tháng

---

## 🆘 Troubleshooting

### Lỗi: "FATAL: password authentication failed"

**Nguyên nhân:** Mật khẩu sai  
**Sửa:**
1. Kiểm tra `postgres` password từ Supabase
2. Sao chép lại (có khoảng trắng?)
3. Thử lại

### Lỗi: "SSL connection error"

**Nguyên nhân:** SSL certificate issue  
**Sửa:**

```bash
# Thêm param --sslmode
pg_dump -h xxxxx.supabase.co -U postgres -d postgres \
  --sslmode=require > backup.sql
```

### Lỗi: "Connection timed out"

**Nguyên Nhân:** Network/firewall issue  
**Sửa:**
1. Kiểm tra internet connection
2. Kiểm tra VPN (nếu cần)
3. Thử từ máy khác

### Backup File Quá Lớn (>500MB)

**Nguyên nhân:** Dữ liệu lớn hoặc có attachment  
**Sửa:**

```bash
# Backup chỉ schema, không data
pg_dump -h xxxxx.supabase.co -U postgres -d postgres \
  --schema-only > backup-schema-only.sql

# Hoặc nén file
gzip backup-*.sql  # Kết quả: backup-*.sql.gz
```

---

## 📊 Thống Kê Backup

Theo dõi backups:

```bash
# Liệt kê tất cả backups
ls -lh ~/backups/van-ep-manager/ | sort -k6,6 -r

# Output:
# -rw-r--r-- 1 user group 245M Apr  1 14:35 backup-cleanup-20260401-143500.sql
# -rw-r--r-- 1 user group 242M Mar 31 10:20 backup-daily-20260331-000000.sql
# -rw-r--r-- 1 user group 240M Mar 29 08:45 backup-daily-20260329-000000.sql

# Tính tổng dung lượng
du -sh ~/backups/van-ep-manager/

# Output: 727M   /home/user/backups/van-ep-manager
```

---

## ✅ Checklist Pre-Deploy

- [ ] Backup database thành công
- [ ] Verify backup file (dung lượng > 1MB, nội dung OK)
- [ ] Test restore từ backup (opitonal nhưng recommended)
- [ ] Chạy cleanup-test-data.sql trên database copy
- [ ] Chạy verify-cleanup.sql → Kết quả: "✅ SẠCH SẼ"
- [ ] Deploy lên Vercel
- [ ] Test tính năng cơ bản
- [ ] Lưu backup 30 ngày

---

## 📞 Hỗ Trợ

Nếu có vấn đề:
1. Xem phần **Troubleshooting**
2. Kiểm tra logs: `supabase logs`
3. Liên hệ: tech-team@company.com

---

**© 2026 Toàn Tâm Phát. All rights reserved.**
