# 🧹 Script Cleanup Dữ Liệu Test - VanEpManager

**Ngày:** Tháng 4, 2026  
**Dành cho:** DevOps, Tech Lead, DBA

---

## 📋 Mục Lục

1. [Các File Trong Thư Mục](#các-file-trong-thư-mục)
2. [Quy Trình Deploy An Toàn](#quy-trình-deploy-an-toàn)
3. [Hướng Dẫn Chạy Cleanup](#hướng-dẫn-chạy-cleanup)
4. [Hướng Dẫn Verify](#hướng-dẫn-verify)
5. [Rollback Nếu Có Lỗi](#rollback-nếu-có-lỗi)
6. [FAQ](#faq)

---

## 📂 Các File Trong Thư Mục

| File | Mục Đích | Chạy Khi Nào |
|------|---------|----------|
| **cleanup-test-data.sql** | Script xóa dữ liệu test (an toàn) | Bước 3 |
| **cleanup-test-data-safe.sql** | Phiên bản alternative (từng bước) | Bước 3 (nếu cần debug) |
| **verify-cleanup.sql** | Kiểm tra dữ liệu sau cleanup | Bước 4 |
| **BACKUP_INSTRUCTIONS.md** | Hướng dẫn backup database | Bước 1 |
| **README.md** | File này | Tham khảo |

---

## 🚀 Quy Trình Deploy An Toàn

```
┌─────────────────────────────────────┐
│ BƯỚC 1: BACKUP DATABASE             │
│ (Chạy BACKUP_INSTRUCTIONS.md)      │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ BƯỚC 2: ĐỢI BACKUP XONG             │
│ (Kiểm tra file backup tồn tại)     │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ BƯỚC 3: CHẠY CLEANUP-TEST-DATA.SQL  │
│ (Xóa dữ liệu test khỏi DB)          │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ BƯỚC 4: VERIFY DỮ LIỆU              │
│ (Chạy verify-cleanup.sql)          │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ BƯỚC 5: DEPLOY LÊN PRODUCTION       │
│ (npm run build && git push)         │
└─────────────────────────────────────┘
```

---

## 🔧 Hướng Dẫn Chạy Cleanup

### Bước 1: Backup Database

**Xem:** [BACKUP_INSTRUCTIONS.md](./BACKUP_INSTRUCTIONS.md)

**Tóm tắt:**
```bash
# Cách dễ nhất: Supabase UI
# 1. Vào https://app.supabase.com
# 2. Project → Backups → Create a backup
# 3. Đợi 5-10 phút
# 4. Download file backup
```

### Bước 2: Kiểm Tra Backup

```bash
# Xác nhận file backup tồn tại và có dung lượng
ls -lh ~/backups/van-ep-manager/backup-*.sql

# Phải hiển thị file có kích thước > 1MB
```

**Nếu không có backup → DỪNG, quay lại bước 1!**

### Bước 3: Chạy Cleanup Script

**Cách 1: Supabase SQL Editor (Dễ nhất)**

```
1. Đăng nhập: https://app.supabase.com
2. Project: van-ep-manager
3. SQL Editor → New query
4. Copy nội dung file: cleanup-test-data.sql
5. Định dính "RUN"
```

**Cách 2: psql CLI (Advanced)**

```bash
# Cú pháp: psql -h <host> -U <user> -d <database> < cleanup-test-data.sql
psql -h xxxxx.supabase.co -U postgres -d postgres < cleanup-test-data.sql

# Nhập mật khẩu khi được hỏi
```

**Cách 3: Docker (Nếu cài Docker)**

```bash
docker run --rm -v $PWD:/scripts postgres:15 \
  psql -h xxxxx.supabase.co -U postgres -d postgres < /scripts/cleanup-test-data.sql
```

### Bước 4: Chờ Cleanup Hoàn Tất

**Dung kỳ vọng:**
- Nhỏ (< 10k rows): < 1 phút
- Trung bình (10k-100k rows): 1-5 phút
- Lớn (> 100k rows): 5-15 phút

**Output bình thường:**
```
BEGIN
ALTER TABLE cham_cong DISABLE TRIGGER trigger_recalculate_luong;
ALTER TABLE tong_tien_cong_ngay DISABLE TRIGGER trigger_recalculate_luong_total;
ALTER TABLE phieu_can DISABLE TRIGGER trigger_calculate_cong_no;
DELETE X (rows affected)
...
COMMIT
```

**Nếu có ERROR:**
```
ERROR:  constraint violation ...
ERROR:  foreign key constraint...
```

→ Xem mục [Rollback Nếu Có Lỗi](#rollback-nếu-có-lỗi)

---

## ✅ Hướng Dẫn Verify (Kiểm Tra)

Sau cleanup, phải chạy verify để đảm bảo dữ liệu sạch.

### Bước 1: Chạy Verify Script

**Cách 1: Supabase SQL Editor**

```
1. SQL Editor → New query
2. Copy nội dung file: verify-cleanup.sql
3. Nhấp "RUN"
```

**Cách 2: CLI**

```bash
psql -h xxxxx.supabase.co -U postgres -d postgres < verify-cleanup.sql
```

### Bước 2: Kiểm Tra Output

**Output OK:**
```
📋 KIỂM TRA: Còn công nhân/khách hàng test?
-------------------------------------------
loai              | so_luong
------------------+----------
Công nhân test    |        0  ← PHẢI LÀ 0
Khách hàng test   |        0  ← PHẢI LÀ 0
Chấm công test    |        0  ← PHẢI LÀ 0
Phiếu cân test    |        0  ← PHẢI LÀ 0
Tổng tiền công... |        0  ← PHẢI LÀ 0

📊 THỐNG KÊ DỮ LIỆU HIỆN TẠI:
-------------------------------------------
Tổng CN | Tổng KH | Tổng CC | Tổng PC | Tổng LT | Tổng TTCN
--------|---------|---------|---------|---------|----------
   120  |    45   |  3,500  |   850   |  2,800  |   250

✅ KIỂM TRA HOÀN TẤT
-------------------------------------------
trang_thai_cleanup
✅ DỮ LIỆU SẠCH SẼ - SẴN SÀNG DEPLOY!
```

**Output LỖI:**
```
trang_thai_cleanup
❌ VẦN CÒN DỮ LIỆU TEST - KIỂM TRA LẠI
```

→ Xem mục [FAQ - Còn dữ liệu test](#faq)

---

## 🔄 Rollback Nếu Có Lỗi

**Nếu cleanup gặp lỗi:**

### Cách 1: Restore Từ Backup (Toàn Bộ Database)

```bash
# Supabase UI: Dashboard → Backups → Restore
# Hoặc CLI:
psql -h xxxxx.supabase.co -U postgres -d postgres < backup-cleanup-20260401-143500.sql
```

**Thời gian:** 10-20 phút

**Lưu ý:** Database sẽ offline trong quá trình restore.

### Cách 2: Manual Fix (Nếu rollback không được)

Liên hệ: tech-team@company.com với:
- Timestamp khi cleanup bị lỗi
- Error message chính xác
- Database state hiện tại

---

## ❓ FAQ

### Q: Bao lâu chạy cleanup?

**A:** Tùy dung lượng dữ liệu:
- Nhỏ (< 10k bản ghi): < 1 phút
- Trung bình (10k-100k): 1-5 phút
- Lớn (> 100k): 5-15 phút

### Q: Cleanup có xóa dữ liệu production?

**A:** KHÔNG. Cleanup chỉ xóa bản ghi có chứa từ "test" hoặc "demo" trong:
- Tên công nhân/khách hàng
- Ghi chú của bản ghi
- Mã công nhân/khách hàng

Dữ liệu thực tế (công nhân, khách hàng có tên bình thường) không bị xóa.

### Q: Có thể run cleanup nhiều lần không?

**A:** CÓ! An toàn chạy nhiều lần. Lần thứ 2 sẽ không xóa gì (vì không còn test data).

### Q: Cleanup có backup tự động?

**A:** CÓ! Script dùng `BEGIN...COMMIT` (transaction). Nếu lỗi, tất cả thay đổi sẽ **rollback** tự động.

### Q: Còn dữ liệu test sau verify?

**A:** Xử lý:

1. **Kiểm tra lại:** Chạy verify lần nữa

2. **Fix manual:** Nếu tìm thấy, chạy:
```sql
-- Xóa thủ công (thay XXXXX bằng tên thực tế)
DELETE FROM cong_nhan WHERE ho_ten ILIKE '%XXXXX%';
DELETE FROM cham_cong WHERE ghi_chu ILIKE '%XXXXX%';
```

3. **Liên hệ tech:** tech-team@company.com

### Q: Deploy sau cleanup bao lâu?

**A:** 
- Cleanup: 1-15 phút
- Verify: 1-2 phút
- Deploy Vercel: 2-5 phút
- **Tổng:** 5-25 phút

### Q: Rollback từ production có được không?

**A:** CÓ 2 cách:

1. **Rollback Database:** Restore từ backup (xem [Rollback Nếu Có Lỗi](#rollback-nếu-có-lỗi))
2. **Rollback Code:** `git revert` và push lên Vercel

Tốt nhất là chạy cleanup trên staging/dev trước, sau đó production.

### Q: Database connection timeout sao?

**A:** 
```
Nguyên nhân 1: Supabase project bị suspend
  → Vercel dashboard → Wake up project

Nguyên nhân 2: Network issue
  → Kiểm tra internet connection

Nguyên nhân 3: Cleanup quá lâu
  → Disable indexes tạm thời (nâng cao)
```

---

## 📞 Liên Hệ & Hỗ Trợ

**Nếu gặp vấn đề:**

1. Xem FAQ trên
2. Đọc file này kỹ lại
3. Liên hệ: **tech-team@company.com**

**Thông tin cần cung cấp:**
- Timestamp khi lỗi xảy ra
- Error message chính xác
- Output từ verify-cleanup.sql
- Có backup không?

---

## ✅ Checklist Trước Deploy

- [ ] Database backup thành công (file > 1MB)
- [ ] Verify backup file (xem nội dung OK)
- [ ] Chạy cleanup-test-data.sql (không có error)
- [ ] Chạy verify-cleanup.sql (output: ✅ SẠCH SẼ)
- [ ] Kiểm tra lại dữ liệu production (không bị xóa)
- [ ] Sẵn sàng deploy lên Vercel
- [ ] Backup đã lưu an toàn (folder, USB, cloud)

---

## 🎯 Checklist Sau Deploy

- [ ] Vercel build thành công
- [ ] Ứng dụng chạy OK (login, dashboard, functions)
- [ ] Dữ liệu production còn nguyên
- [ ] Không có error trong console
- [ ] Người dùng có thể sử dụng bình thường
- [ ] Backup lưu 30 ngày trở lên

---

`️⚠️ **CẢNH BÁO:** Chỉ DevOps/DBA được chạy script này. Bất cẩn có thể mất dữ liệu!`

---

**© 2026 Toàn Tâm Phát. All rights reserved.**
