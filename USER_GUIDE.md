# Hướng dẫn Sử dụng Hệ Thống Quản lý Công nhân

**Phiên bản:** 1.0  
**Cập nhật lần cuối:** Tháng 3, 2026  
**Dành cho:** Công nhân, Quản lý, Kế toán

---

## 📋 Mục lục

1. [Đăng nhập](#đăng-nhập)
2. [Giao diện chính](#giao-diện-chính)
3. [Chấm công hàng ngày](#chấm-công-hàng-ngày)
4. [Nhập tổng tiền công ngày](#nhập-tổng-tiền-công-ngày)
5. [Tạo phiếu cân](#tạo-phiếu-cân)
6. [Thanh toán lương](#thanh-toán-lương)
7. [Xuất báo cáo Excel](#xuất-báo-cáo-excel)
8. [Import dữ liệu cũ](#import-dữ-liệu-cũ)
9. [Backdate & sửa ngày cũ](#backdate--sửa-ngày-cũ)
10. [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)

---

## 🔐 Đăng nhập

### Bước 1: Truy cập trang web
```
Công ty: https://van-ep-manager.vercel.app
Địa chỉ IP nội bộ: https://192.168.x.x (nếu có)
```

### Bước 2: Nhập thông tin đăng nhập
1. Trang đăng nhập sẽ hiển thị form nhập email & mật khẩu
2. **Email**: Địa chỉ email được cấp bởi IT
3. **Mật khẩu**: Mật khẩu cá nhân (do Admin gửi lần đầu)
4. Nhấp **"Đăng nhập"**

```
Lỗi thường gặp:
✗ "Email hoặc mật khẩu sai" → Kiểm tra lại thông tin
✗ "Tài khoản chưa được kích hoạt" → Liên hệ Admin
✗ "Quá nhiều lần đăng nhập sai" → Chờ 15 phút rồi thử lại
```

### Bước 3: Thay đổi mật khẩu (Lần đầu)
1. Sau khi đăng nhập lần đầu, hệ thống sẽ yêu cầu thay đổi mật khẩu
2. **Mật khẩu mới** phải:
   - Tối thiểu 10 ký tự
   - Bao gồm: chữ hoa + chữ thường + số + ký tự đặc biệt
   - Không giống mật khẩu cũ
3. Nhấp **"Cập nhật"**

### Quên mật khẩu?
1. Trang đăng nhập → Click **"Quên mật khẩu?"**
2. Nhập email → Hệ thống gửi link reset
3. Check email (kiểm tra thư rác nếu không thấy)
4. Click link → Nhập mật khẩu mới
5. Đăng nhập lại

---

## 🏠 Giao diện chính

### Menu bên lề (Sidebar)
Tuỳ theo vai trò, bạn sẽ thấy các menu khác nhau:

**Công nhân (Viewer):**
```
├─ Lương của tôi          → Xem lương cá nhân
└─ Chấm công của tôi      → Xem chấm công lịch sử
```

**Kế toán (KeToan):**
```
├─ Dashboard              → Tổng quan báo cáo
├─ Chấm công              → Quản lý chấm công
├─ Phiếu cân              → Quản lý phiếu cân
├─ Lương tháng            → Quản lý lương
├─ Thanh toán             → Quản lý thanh toán
└─ Lịch sử thanh toán     → Xem lịch sử
```

**Admin:**
```
├─ [Tất cả menu Kế toán]
├─ Import du liệu         → Import Excel cũ
├─ Audit log              → Xem nhật ký thay đổi
├─ Quản lý người dùng     → Thêm/sửa users
└─ Cấu hình hệ thống      → Settings
```

### Các nút chức năng chung
- 🔍 **Search**: Tìm kiếm nhanh
- ⚙️ **Settings**: Cấu hình cá nhân
- 🔔 **Notifications**: Thông báo
- 👤 **Profile**: Thông tin cá nhân
- 🚪 **Logout**: Đăng xuất

---

## 👤 Công nhân - Xem Lương Cá nhân

### Lương của tôi (My Salary)

**Vào menu:** Sidebar → **"Lương của tôi"**

**Thông tin hiển thị:**
```
Họ tên:        [Tên công nhân]
Mã công nhân:  [Mã CN]
Số điện thoại: [SĐT]
```

**Xem lương theo tháng:**
1. Chọn tháng từ dropdown: "Chọn tháng"
2. Có thể xem:
   - Tháng hiện tại
   - 12 tháng trước đó
3. Sau khi chọn, bảng lương sẽ cập nhật

**Chi tiết lương hàng ngày:**

| Cột | Ý nghĩa | 
|-----|---------|
| **Ngày** | Ngày chấm công (DD/MM/YYYY) |
| **Trạng thái** | CoMat = Có mặt, Nghi = Nghỉ, NghiPhep = Nghỉ phép, LamThem = Làm thêm |
| **Lương ngày** | Tiền lương cho ngày làm việc |
| **Thưởng** | Tiền thưởng (nếu có) |
| **Phạt** | Tiền phạt (nếu có) |
| **Tổng cộng** | Tổng tiền = Lương + Thưởng - Phạt |

**Ví dụ:**
```
Ngày: 20/03/2026
Trạng thái: CoMat
Lương ngày: 300,000 VND
Thưởng: 50,000 VND
Phạt: 0 VND
Tổng: 350,000 VND
```

**Xuất báo cáo Excel:**
1. Chọn tháng cần xuất
2. Nhấp nút **"Xuất Excel"** (icon 📥)
3. File sẽ download về máy tính: `Luong_[Thang]_[Nam].xlsx`
4. Mở file bằng Excel/Google Sheets để xem chi tiết

---

## 👤 Công nhân - Xem Chấm công

### Chấm công của tôi (My Attendance)

**Vào menu:** Sidebar → **"Chấm công của tôi"**

**Chọn tháng:**
1. Dropdown "Chọn tháng" → chọn tháng cần xem
2. Lịch sẽ cập nhật hiển thị toàn bộ ngày trong tháng

**Xem lịch (Calendar View):**
```
  Thứ Hai | Thứ Ba | Thứ Tư | Thứ Năm | Thứ Sáu | Thứ Bảy | Chủ Nhật
     1    |   2    |   3    |   4    |    5    |   6    |    7
  [CoMat] | [CoMat]| [Nghi] | [CoMat]| [CoMat] | [Nghi] | [Nghi]
```

**Màu sắc trên lịch:**
```
🟩 Xanh lá   = CoMat (Có mặt)
⬜ Trắng    = Nghi (Nghỉ làm)
🟦 Xanh dương = NghiPhep (Nghỉ phép)
🟨 Vàng    = LamThem (Làm thêm)
```

**Click vào ngày để xem chi tiết:**
```
Ngày: 20/03/2026
Trạng thái: CoMat (Có mặt)
Giờ vào: 08:00
Giờ ra: 17:00
Ghi chú: Làm việc bình thường
```

**Bảng danh sách (Table View):**
- Hiển thị tất cả ngày trong tháng dưới dạng bảng
- Dễ export hoặc copy dữ liệu

---

## 📝 Quản lý - Chấm công hàng ngày

*Dành cho: Kế toán, Admin*

### Truy cập chấm công
**Menu:** Sidebar → **"Chấm công"** (hoặc Dashboard)

### Thêm chấm công mới

1. **Nhấp nút "Thêm chấm công"** (+ icon)
2. **Form nhập liệu:**
   ```
   Công nhân:    [Dropdown - chọn tên]
   Ngày:         [Chọn từ lịch]
   Trạng thái:   [Dropdown - CoMat/Nghi/NghiPhep/LamThem]
   Giờ vào:      [HH:MM - optional]
   Giờ ra:       [HH:MM - optional]
   Ghi chú:      [Text - optional]
   ```
3. **Nhấp "Lưu"** để lưu bản ghi

### Sửa chấm công

1. **Tìm bản ghi** trong bảng (dùng Search nếu cần)
2. **Click vào hàng** để mở form chỉnh sửa
3. **Sửa các trường** cần thay đổi
4. **Nhấp "Cập nhật"** để lưu

**Ví dụ sửa:**
```
Lúc đầu: CoMat
Sửa thành: LamThem (vì làm thêm)
→ Lương sẽ tự động tính lại
```

### Xóa chấm công

1. **Click vào bản ghi** cần xóa
2. **Nhấp nút "Xóa"** (🗑 icon)
3. **Xác nhận** trong dialog
4. Bản ghi bị xóa (có thể xem trong Audit Log)

### Tìm kiếm chấm công

**Tìm theo:**
- 📅 **Ngày**: Nhập ngày hoặc khoảng ngày
- 👤 **Công nhân**: Chọn từ dropdown
- 🏷️ **Trạng thái**: CoMat / Nghi / NghiPhep / LamThem
- 📄 **Ghi chú**: Tìm text trong ghi chú

**Ví dụ:** Tìm tất cả ngày "LamThem" của "Nguyễn Văn A" vào tháng 3
```
Công nhân: Nguyễn Văn A ✓
Trạng thái: LamThem ✓
Ngày từ: 01/03/2026
Ngày đến: 31/03/2026
→ Nhấp "Tìm kiếm"
```

---

## 💰 Quản lý - Nhập tổng tiền công ngày

### Truy cập tổng tiền công
**Menu:** Sidebar → **"Lương tháng"** → Tab **"Tổng tiền công ngày"**

### Cách thức tính lương

**Hệ thống tự động tính:**
```
Tổng tiền công ngày × Số công nhân có mặt = Tiền/người

Ví dụ:
- Tổng tiền công: 3,000,000 VND
- Số người CoMat: 3
- Lương/người: 3,000,000 ÷ 3 = 1,000,000 VND
```

### Nhập tổng tiền công

1. **Chọn ngày** từ lịch
2. **Nhập "Tổng tiền công ngày"**: (VND)
   ```
   Ví dụ: 3000000 (hoặc 3,000,000)
   ```
3. **Nhấp "Lưu"**
4. **Hệ thống sẽ:**
   - Tính toán lương từng người
   - Cập nhật bảng lương
   - Log thay đổi vào Audit Log

### Xem kết quả phân bổ lương

**Bảng kết quả:**
```
Công nhân      | Trạng thái | Lương ngày  | Ghi chú
---|
Nguyễn Văn A   | CoMat      | 1,000,000   | ✓
Trần Thị B     | CoMat      | 1,000,000   | ✓
Phạm Văn C     | CoMat      | 1,000,000   | ✓
Lê Văn D       | Nghi       | 0           | Không nhận
```

### Sửa tổng tiền công

1. **Tìm ngày** cần sửa
2. **Click vào bản ghi**
3. **Sửa số tiền**
4. **Nhấp "Cập nhật"**
5. **Lương sẽ tính lại tự động**

**⚠️ Lưu ý:** Sửa tổng tiền sẽ ảnh hưởng tới lương tháng!

---

## 📋 Quản lý - Tạo phiếu cân

### Phiếu cân là gì?
Phiếu cân ghi lại khối lượng hàng hoá được cân tại cân (Ví dụ: cân hàng nông sản).

### Truy cập phiếu cân
**Menu:** Sidebar → **"Phiếu cân"**

### Thêm phiếu cân mới

1. **Nhấp "Thêm phiếu cân"** (+ icon)
2. **Form nhập:**
   ```
   Công nhân:      [Dropdown - chọn người]
   Ngày cân:       [Chọn từ lịch]
   Loại van EP:    [Dropdown - Sẽ, Khoai, Cà chua, ...]
   Khối lượng (kg): [Số - ví dụ: 150.5]
   Đơn giá (VND):  [Số - ví dụ: 5000]
   Tổng tiền:      [Tự tính = Khối lượng × Đơn giá]
   Ghi chú:        [Optional - ví dụ: Hạng A]
   ```
3. **Nhấp "Lưu"**

### Ví dụ tạo phiếu cân

```
Công nhân: Nguyễn Văn A
Ngày cân: 20/03/2026
Loại van EP: Sẽ
Khối lượng: 100 kg
Đơn giá: 5,000 VND/kg
→ Tổng tiền tự động: 500,000 VND
```

### Sửa phiếu cân
1. Click vào phiếu cần sửa
2. Sửa các trường
3. Nhấp "Cập nhật"

### Xóa phiếu cân
1. Click chọn phiếu
2. Nhấp "Xóa" (🗑 icon)
3. Xác nhận

### Tìm kiếm phiếu cân
- **Công nhân**: Tên/mã
- **Ngày**: Khoảng ngày
- **Loại van EP**: Chọn từ dropdown
- **Khối lượng**: Min-Max (kg)

---

## 💳 Quản lý - Thanh toán lương

### Cách thức thanh toán

Hệ thống hỗ trợ 3 hình thức:
```
💵 Tiền mặt (TienMat)
🏦 Chuyển khoản (ChuyenKhoan)
💳 Khác (Khac)
```

### Truy cập thanh toán
**Menu:** Sidebar → **"Thanh toán"** (hoặc **"Lịch sử thanh toán"**)

### Tạo phiếu thanh toán

1. **Nhấp "Tạo thanh toán"** (+ icon)
2. **Form nhập:**
   ```
   Công nhân:      [Dropdown]
   Tháng lương:    [Chọn tháng]
   Số tiền:        [VND - tự fill từ tính lương]
   Hình thức:      [TienMat / ChuyenKhoan / Khac]
   Ngày thanh toán:[Chọn từ lịch]
   Ghi chú:        [ví dụ: Thanh toán lương 3/2026]
   ```
3. **Nhấp "Xác nhận thanh toán"**

### Ví dụ thanh toán

```
Công nhân: Trần Thị B
Tháng: Tháng 3/2026
Số tiền: 5,500,000 VND (tính từ bảng lương)
Hình thức: ChuyenKhoan
Ngày thanh toán: 28/03/2026
Ghi chú: Chuyển khoản MB Bank
→ Lưu thành công
→ Hệ thống gửi xác nhận cho công nhân
```

### Xem lịch sử thanh toán

**Menu:** → **"Lịch sử thanh toán"**

**Bảng hiển thị:**
```
Công nhân      | Tháng     | Tiền lương | Hình thức      | Ngày TT   | Trạng thái
---|
Trần Thị B     | 3/2026    | 5,500,000  | Chuyển khoản   | 28/03/26  | ✓ Đã TT
Phạm Văn C     | 3/2026    | 4,200,000  | Tiền mặt       | 27/03/26  | ✓ Đã TT
```

### Tìm kiếm thanh toán
- **Công nhân**: Tên/mã
- **Tháng**: Chọn tháng
- **Hình thức**: TienMat / ChuyenKhoan / Khac
- **Trạng thái**: Đã TT / Chờ TT / Từ chối

---

## 📊 Xuất báo cáo Excel

### Xuất báo cáo lương tháng

1. **Menu:** Sidebar → **"Lương tháng"** → Tab **"Báo cáo"**
2. **Chọn tháng** cần xuất
3. **Nhấp "Xuất Excel"** (icon 📥)
4. **File sẽ download:** `BaoCao_Luong_[Thang]_[Nam].xlsx`

**File Excel có chứa:**
- ✓ Bảng lương chi tiết (tất cả công nhân)
- ✓ Tổng cộng lương tháng
- ✓ Tính năng filter & sort
- ✓ Định dạng VND (tiền tệ)

### Xuất báo cáo phiếu cân

1. **Menu:** → **"Phiếu cân"** → Nút **"Xuất Excel"**
2. **Chọn khoảng ngày** (từ - đến)
3. **Nhấp "Xuất"**
4. **File:** `PhieuCan_[NgayBatDau]_[NgayKetThuc].xlsx`

### Xuất báo cáo thanh toán

1. **Menu:** → **"Lịch sử thanh toán"** → **"Xuất Excel"**
2. **Filter nếu cần** (tháng, công nhân, hình thức)
3. **Nhấp "Xuất"**
4. **File:** `ThanhToan_[NgayXuat].xlsx`

### Định dạng Excel

**Mỗi file Excel có:**
```
Sheet 1: Dữ liệu chính
  - Cột giãn cách để dễ đọc
  - Footer tính toán tổng cộng
  - Định dạng tiền VND tự động

Sheet 2: Ghi chú / Hướng dẫn (nếu có)
```

**Mở file Excel:**
- ✓ Microsoft Excel 2016+
- ✓ Google Sheets (upload file)
- ✓ LibreOffice Calc

---

## 📥 Import dữ liệu cũ

### Khi nào dùng Import?
- Migrate dữ liệu từ hệ thống cũ
- Import data lịch sử (lương, chấm công tháng trước)
- Bulk update dữ liệu

### Bước 1: Chuẩn bị file Excel

**File Excel phải có format:**

**Sheet "Chấm công":**
```
Cột A: Mã công nhân (ví dụ: CN001)
Cột B: Họ tên            (ví dụ: Nguyễn Văn A)
Cột C: Ngày               (ví dụ: 01/03/2026)
Cột D: Trạng thái         (ví dụ: CoMat, Nghi, NghiPhep, LamThem)
Cột E: Giờ vào           (Optional - ví dụ: 08:00)
Cột F: Giờ ra            (Optional - ví dụ: 17:00)
Cột G: Ghi chú           (Optional)
```

**Sheet "Lương":**
```
Cột A: Mã công nhân
Cột B: Họ tên
Cột C: Tháng lương       (ví dụ: 2026-03)
Cột D: Tổng lương        (ví dụ: 5000000)
```

**Sheet "Phiếu cân":**
```
Cột A: Mã công nhân
Cột B: Họ tên
Cột C: Ngày cân
Cột D: Loại van EP       (Sẽ, Khoai, Cà chua, ...)
Cột E: Khối lượng (kg)
Cột F: Đơn giá (VND)
```

### Bước 2: Truy cập Import
**Menu:** Sidebar → **"Import du liệu"** (Admin only)

### Bước 3: Upload file

1. **Chọn tab** (Chấm công / Lương / Phiếu cân / Công nợ)
2. **Drag-drop file Excel** vào khu vực upload
   - Hoặc nhấp để chọn file
3. File sẽ upload tự động

### Bước 4: Mapping cột

**Hệ thống sẽ:**
- Tự detect cột (nếu tên trùng khớp)
- Yêu cầu map cột nếu tên khác

**Ví dụ mapping:**
```
File Excel có:         → Map tới:
Mã CN                  → Mã công nhân ✓
Nhân viên               → Họ tên ✓
Ngày công               → Ngày ✓
Loại công               → Trạng thái ✓
```

**Cách mapping:**
1. Dropdown cột Excel
2. Chọn cột hệ thống
3. Repeats cho tất cả cột

### Bước 5: Preview & Validate

1. **Nhấp "Xác thực"** (Validate)
2. **Hệ thống sẽ kiểm tra:**
   - ✓ Định dạng dữ liệu (date, number, text)
   - ✓ Công nhân có tồn tại?
   - ✓ Dữ liệu có bị trùng?
   - ✓ Lỗi định dạng

3. **Kết quả:**
   ```
   ✓ Hợp lệ: 95 hàng
   ⚠ Cảnh báo: 2 hàng (lỗi định dạng)
   ✗ Lỗi: 1 hàng (công nhân không tìm thấy)
   ```

### Bước 6: Xử lý lỗi (nếu có)

**Lỗi định dạng ngày:**
```
Lỗi: 01-03-2026 (sai format)
Fix:  01/03/2026 (đúng format)
```

**Lỗi công nhân không tìm thấy:**
```
Hàng 5: Nguyễn Văn Z (không tồn tại trong hệ thống)
→ Sửa lại tên trong file Excel
→ Re-upload file
```

### Bước 7: Dry-run (Khô)

**Trước import thực:**
1. **Nhấp "Xem trước"** (Dry-run)
2. Hệ thống sẽ:
   - Kiểm tra toàn bộ dữ liệu
   - Không lưu vào database
   - Hiển thị kết quả sẽ import
3. **Review kết quả:**
   - Số hàng sẽ insert (thêm mới)
   - Số hàng sẽ update (cập nhật)
   - Số hàng sẽ skip (bỏ qua)

### Bước 8: Import thực

1. **Đảm bảo dữ liệu là chính xác**
2. **Chọn chế độ lỗi:**
   ```
   ⭕ Dừng ngay (Stop on error) - [Recommended]
      Nếu có lỗi, sẽ dừng import
   
   ⭕ Tiếp tục (Continue on error)
      Bỏ qua hàng lỗi, tiếp tục import
   ```
3. **Chọn chế độ trùng lặp:**
   ```
   ⭕ Cập nhật (Update if exists) - [Default]
      Nếu dữ liệu đã tồn tại, sẽ cập nhật
   
   ⭕ Bỏ qua (Skip if exists)
      Nếu đã tồn tại, bỏ qua
   ```
4. **Nhấp "Import"**

### Bước 9: Xác nhận kết quả

```
✓ Import thành công!

Kết quả:
- Thêm mới: 50 hàng
- Cập nhật: 30 hàng
- Bỏ qua: 5 hàng
- Lỗi: 0 hàng

Total: 85/85 hàng

⏱ Thời gian: 2.3 giây
```

### Xem lại import lịch sử

**Menu:** → **"Audit log"** để xem tất cả import đã làm

---

## 🔄 Backdate & sửa ngày cũ

### Backdate là gì?
Sửa lại dữ liệu của ngày đã qua (ví dụ: sửa lương tháng trước).

### Khi nào dùng Backdate?

```
✓ Sửa chấm công ngày trước
✓ Sửa lương tháng trước
✓ Nhập dữ liệu muộn (quên nhập)
✓ Fix lỗi tính toán lương
```

### Bước 1: Tìm dữ liệu cần sửa

**Menu:** → Tìm module cần sửa (Chấm công / Lương / Phiếu cân)

**Cách tìm:**
1. Gõ ngày trong search: **"01/03/2026"**
2. Hoặc scroll tìm tay
3. Click vào bản ghi cần sửa

### Bước 2: Sửa dữ liệu

**Ví dụ 1: Sửa chấm công 5 ngày trước**
```
Ngày: 15/03/2026 (5 ngày trước)
Trạng thái cũ: CoMat
Trạng thái mới: LamThem (sửa vì ghi nhầm)
→ Nhấp "Cập nhật"
```

**Ví dụ 2: Sửa tổng tiền công ngày**
```
Ngày: 20/03/2026
Tiền cũ: 2,000,000 VND
Tiền mới: 3,000,000 VND (boss yêu cầu tăng)
→ Nhấp "Cập nhật"
→ Hệ thống tự động tính lại lương từng người
```

### Bước 3: Hệ thống tự động tính lại (Recalculation)

**Khi sửa chấm công hoặc tiền công, hệ thống sẽ:**

1. ✓ Cập nhật record
2. ✓ Tính lại lương ngày đó
3. ✓ Tính lại lương tháng
4. ✓ Cập nhật bảng lương tháng

**Ví dụ flow:**
```
Sửa chấm công (15/03): CoMat → LamThem
  ↓
Hệ thống cap nhật cham_cong table
  ↓
Gọi recalculate_luong_ngay('2026-03-15')
  ↓
Tính lại lương ngày 15/3 (LamThem = lương cao hơn)
  ↓
Update bảng luong_thang tháng 3/2026
  ↓
Công nhân sẽ thấy lương tăng
```

### Bước 4: Kiểm tra lại

1. **Xem chấm công** → Verify ngày đã sửa
2. **Xem lương tháng** → Verify tổng lương chính xác
3. **Check Audit log** → Xem ai sửa, lúc nào

---

## ❓ Câu hỏi thường gặp

### Q1: Quên mật khẩu phải làm sao?

**A:** 
1. Trang login → Click "Quên mật khẩu?"
2. Nhập email
3. Kiểm tra email (kể cả thư rác)
4. Click link → Reset mật khẩu

### Q2: Làm sao để xuất báo cáo lương nhiều tháng?

**A:** Xuất từng tháng riêng biệt:
1. Tháng 1: Xuất Excel
2. Tháng 2: Xuất Excel
3. ...
4. Mở tất cả file, copy-paste vào 1 file Excel tổng hợp

### Q3: Sửa dữ liệu cũ có ảnh hưởng tổng lương không?

**A:** Có. Sửa ngày cũ sẽ tính lại tổng lương tháng đó tự động.

### Q4: Có thể xóa chấm công không?

**A:** Có, admin & kế toán có thể. Khi xóa:
- Lương sẽ tính lại
- Thao tác được log trong Audit Log

### Q5: Import dữ liệu sai có sửa được không?

**A:** Có. Sau import sai:
1. Login Admin
2. Vào module cần sửa
3. Edit từng record
4. Hoặc xóa hết và re-import

### Q6: Làm sao để backup dữ liệu?

**A:**
- Admin → Settings → Backup
- Hoặc xuất toàn bộ Excel (chấm công, lương, phiếu cân)
- Lưu files an toàn

### Q7: Công nhân có thể sửa lương của họ không?

**A:** Không. Công nhân (Viewer) chỉ xem được lương. Chỉ Admin & Kế toán mới sửa được.

### Q8: Tính lương đơn vị nào?

**A:** Tiền Việt Nam Đồng (VND)
- Ví dụ: 1,000,000 VND = 1 triệu đồng

### Q9: Làm thêm được tính lương cao hơn không?

**A:** Tùy cấu hình của công ty. Hỏi admin về quy định lương làm thêm.

### Q10: Phiếu cân dùng để làm gì?

**A:** Ghi lại khối lượng hàng hoá cân. Công ty dùng để:
- Quản lý sản lượng
- Tính lương theo sản lượng
- Audit hàng hoá

---

## 📞 Hỗ trợ

**Có vấn đề hoặc câu hỏi?**

```
☎️  Số điện thoại IT:    [Sẽ cập nhật]
📧 Email hỗ trợ:       [Sẽ cập nhật]
💬 Chat Teams/Slack:   [Sẽ cập nhật]
```

**Giờ làm việc:**
- Thứ Hai - Thứ Sáu: 08:00 - 17:00
- Thứ Bảy: 08:00 - 12:00
- Chủ Nhật: Nghỉ

**Response time:**
- Vấn đề khẩn cấp: < 1 giờ
- Câu hỏi thường: < 24 giờ

---

**Phiên bản tài liệu:** 1.0  
**Cập nhật:** Tháng 3, 2026  
**Tác giả:** IT Team
