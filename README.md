# VanEpManager - Hệ thống Quản lý Công nhân

**VanEpManager** là một ứng dụng quản lý tòan diện dành cho công ty vận tải và doanh nghiệp kinh doanh gỗ, giúp quản lý công nhân, tính lương, theo dõi công nợ khách hàng, và xuất báo cáo.

**Phiên bản:** 0.1.0  
**Cập nhật:** Tháng 4, 2026

---

## 📋 Mục Lục

- [Tính Năng](#tính-năng)
- [Tech Stack](#tech-stack)
- [Yêu Cầu Trước Khi Cài Đặt](#yêu-cầu-trước-khi-cài-đặt)
- [Cài Đặt & Development](#cài-đặt--development)
- [Cấu Hình Environment](#cấu-hình-environment)
- [Chạy Ứng Dụng](#chạy-ứng-dụng)
- [Build & Deploy](#build--deploy)
- [Tài Liệu & Hướng Dẫn](#tài-liệu--hướng-dẫn)
- [Troubleshooting](#troubleshooting)
- [Hỗ Trợ & Liên Hệ](#hỗ-trợ--liên-hệ)

---

## ✨ Tính Năng

### Quản Lý Công Nhân
- ✅ Quản lý danh sách công nhân
- ✅ Chấm công hàng ngày
- ✅ Tính lương tự động dựa trên công ngày
- ✅ Phân phối tổng tiền công theo người làm

### Quản Lý Khách Hàng & Công Nợ
- ✅ Quản lý khách hàng và thông tin liên hệ
- ✅ Theo dõi công nợ của khách hàng
- ✅ Ghi nhận thanh toán tiền công nợ
- ✅ Cổng khách hàng để xem công nợ cá nhân

### Quản Lý Phiếu Cân
- ✅ Tạo và quản lý phiếu cân
- ✅ Theo dõi xe/hàng hóa
- ✅ Lịch sử quả cân đầy đủ

### Báo Cáo & Xuất Dữ Liệu
- ✅ Báo cáo lương theo tháng
- ✅ Báo cáo công nợ khách hàng
- ✅ Báo cáo doanh thu 7 ngày
- ✅ Xuất Excel các loại báo cáo
- ✅ Import dữ liệu từ file Excel

### Bảo Mật & Phân Quyền
- ✅ Phân quyền theo 3 vai trò: Admin, Kế toán, Công nhân
- ✅ Cổng riêng cho từng loại người dùng
- ✅ Audit Log theo dõi mọi thay đổi
- ✅ Row-Level Security (RLS) trên database

---

## 🛠️ Tech Stack

| Phần | Công Nghệ | Phiên Bản |
|------|-----------|----------|
| **Framework** | Next.js + React | 15.5.14 + 19.2.4 |
| **Language** | TypeScript | Latest |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Auth** | Supabase Auth | Latest |
| **UI Framework** | TailwindCSS + Radix UI | Latest |
| **State Management** | React Query (TanStack) | 5.95.2 |
| **Forms** | React Hook Form + Zod | Latest |
| **Charts** | Recharts | 3.8.0 |
| **Export** | ExcelJS | 4.4.0 |
| **Date Utils** | date-fns | 4.1.0 |
| **Icons** | Lucide React | 1.0.1 |
| **Deployment** | Vercel | Latest |

---

## 📋 Yêu Cầu Trước Khi Cài Đặt

### Phần Cứng
| Yêu Cầu | Tối Thiểu | Khuyến Nghị |
|---------|-----------|-----------|
| RAM | 2GB | 4GB+ |
| Disk Space | 1GB | 5GB+ |
| CPU | Dual core | Quad core+ |

### Phần Mềm
- ✅ **Node.js**: v18.17 trở lên (kiểm tra: `node --version`)
- ✅ **npm**: v8.0+ (kiểm tra: `npm --version`)
- ✅ **Git**: Để clone repository
- ✅ **GitHub account**: Nếu deploy qua Vercel
- ✅ **Supabase account**: Cho database (https://supabase.com)

### Kiểm Tra Cài Đặt

```bash
# Kiểm tra Node.js
node --version      # v18.17 hoặc cao hơn

# Kiểm tra npm
npm --version       # v8.0 hoặc cao hơn

# Kiểm tra Git
git --version       # 2.0 hoặc cao hơn
```

---

## 🚀 Cài Đặt & Development

### Bước 1: Clone Repository

```bash
# Clone project
git clone https://github.com/your-org/van-ep-manager.git

# Vào thư mục project
cd van-ep-manager
```

### Bước 2: Cài Đặt Dependencies

```bash
# Dùng npm (khuyến nghị)
npm install

# Hoặc dùng yarn (nếu thích)
yarn install
```

**Dự kiến thời gian:** 2-3 phút

### Bước 3: Cấu Hình Environment

Xem mục [Cấu Hình Environment](#cấu-hình-environment) bên dưới.

---

## ⚙️ Cấu Hình Environment

### Untuk Development

1. **Tạo tệp `.env.local` ở thư mục gốc:**

```bash
touch .env.local
```

2. **Thêm các biến sau vào `.env.local`:**

```env
# Supabase (Development Project)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_NAME=VanEpManager
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Danh sách đầy đủ biến môi trường:**

| Biến | Bắt Buộc | Mô Tả |
|------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key từ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | ❌ | URL ứng dụng (default: http://localhost:3000) |
| `NEXT_PUBLIC_APP_NAME` | ❌ | Tên ứng dụng (default: VanEpManager) |

### Lấy Keys từ Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. **Settings** → **API**
4. Copy các giá trị:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Service role key` → `SUPABASE_SERVICE_ROLE_KEY`

### Cảnh Báo ⚠️

- **KHÔNG** commit `.env.local` lên Git (nó trong `.gitignore`)
- **KHÔNG** share `SUPABASE_SERVICE_ROLE_KEY` công khai
- Server-side keys chỉ sử dụng trong Server Components/Actions

---

## 🔧 Chạy Ứng Dụng

### Development Mode

```bash
npm run dev
```

**Output:**
```
> van-ep-manager@0.1.0 dev
> next dev

  ▲ Next.js 15.5.14
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**Truy cập:** http://localhost:3000

**Hot Reload:** Ứng dụng sẽ tự reload khi file thay đổi.

### Chế độ Production (Local)

```bash
# Build ứng dụng
npm run build

# Chạy ứng dụng production
npm run start
```

**Truy cập:** http://localhost:3000

---

## 🏗️ Build & Deploy

### Build Local

Trước khi deploy, kiểm tra build local:

```bash
# Xóa cache cũ
rm -rf .next

# Build production
npm run build

# Output bình thường:
# ✓ Compiled successfully
# ✓ Auth page compiled
# ✓ Dashboard page compiled
# ...total X pages
```

**Kiểm tra lỗi:**

```bash
npm run lint
```

Nếu có lỗi, sửa trước khi deploy.

### Deploy lên Vercel

**Được khuyến nghị:** Dùng Vercel (tạo bởi tác giả Next.js, deploy FREE).

#### Bước 1: Chuẩn Bị Git

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Bước 2: Deploy

1. Truy cập https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import repository **van-ep-manager**
4. Vercel tự detect Next.js
5. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **"Deploy"**

**Thời gian deploy:** 2-5 phút

**Kết quả:** URL công cộng như `https://van-ep-manager.vercel.app`

### Custom Domain

Sau khi deploy, thêm custom domain:

1. **Vercel Dashboard** → Settings → Domains
2. Thêm domain (ví dụ: `app.van-ep-manager.vn`)
3. Cấu hình DNS ở registrar
4. Vercel sẽ tự xác minh

**Xem chi tiết:** [DEPLOY.md](./DEPLOY.md)

---

## 📚 Tài Liệu & Hướng Dẫn

| Tài Liệu | Dành Cho | Nội Dung |
|---------|---------|---------|
| [USER_GUIDE.md](./USER_GUIDE.md) | **Người dùng cuối** | Hướng dẫn sử dụng ứng dụng, chấm công, tính lương, xuất báo cáo |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | **Admin, Quản trị viên** | Quản lý người dùng, phân quyền, audit log, backup |
| [DEPLOY.md](./DEPLOY.md) | **DevOps, Tech Lead** | Hướng dẫn deploy lên Vercel, cấu hình Supabase production |
| [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) | **Developers** | Kiến trúc code, database schema, cách mở rộng module |
| [CI_CD_SETUP.md](./CI_CD_SETUP.md) | **DevOps** | Setup GitHub Actions, tự động deploy |
| [SUPABASE_PRODUCTION.md](./SUPABASE_PRODUCTION.md) | **DBA, Tech Lead** | Cấu hình production database, backup, monitoring |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | **Project Manager, Tech Lead** | Danh sách kiểm tra trước khi deploy |

---

## 🐛 Troubleshooting

### Lỗi: "Cannot find module '@supabase/supabase-js'"

**Nguyên nhân:** Dependencies chưa cài đủ

**Sửa:**
```bash
rm -rf node_modules
npm install
```

### Lỗi: "Environment variable not found"

**Nguyên nhân:** `.env.local` không đúng hoặc thiếu biến

**Sửa:**
1. Kiểm tra file `.env.local` có tồn tại ở **thư mục gốc**
2. Xác nhận các biến bắt buộc:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Restart dev server: `Ctrl+C` rồi `npm run dev`

### Lỗi: "Failed to build" trên Vercel

**Nguyên nhân:** TypeScript errors, missing variables

**Sửa:**
1. Kiểm tra build local: `npm run build`
2. Kiểm tra lỗi: `npm run lint`
3. Xác nhận Environment Variables trên Vercel Dashboard
4. Restart build trên Vercel

### Trang Trắng Sau Đăng Nhập

**Nguyên nhân:** Auth chưa kết nối hoặc role config sai

**Sửa:**
1. Kiểm tra Supabase connection
2. Xác nhận user có `profile` record với vai trò hợp lệ
3. Xem browser console (F12 → Console) để tìm lỗi

### Database Connection Timeout

**Nguyên nhân:** Supabase project bị sleep hoặc network issue

**Sửa:**
1. Kiểm tra Supabase dashboard: Project có chạy không?
2. Restart project: Supabase Dashboard → Restart Project
3. Kiểm tra internet connection

**Xem chi tiết:** [TECHNICAL_GUIDE.md → Debugging](./TECHNICAL_GUIDE.md#debugging--testing)

---

## 💬 Hỗ Trợ & Liên Hệ

### Báo Cáo Lỗi

Phát hiện bug? Tạo issue trên GitHub:
1. https://github.com/your-org/van-ep-manager/issues
2. Mô tả: Lỗi là gì?
3. Bước tái hiện: Cách bạn gặp lỗi?
4. Môi trường: OS, Node version, browser?

### Yêu Cầu Tính Năng

Đề xuất tính năng mới:
1. Tạo Discussion: https://github.com/your-org/van-ep-manager/discussions
2. Giải thích: Tính năng là gì? Tại sao cần?
3. Use case: Trường hợp sử dụng?

### Liên Hệ Kỹ Thuật

- **Email:** tech-team@company.com
- **Slack:** #van-ep-manager-tech
- **On-call:** [Phone/Pager]

---

## 📄 Giấy Phép

Dự án này sử dụng giấy phép nội bộ. Không được phép:
- ❌ Copy/Fork công khai
- ❌ Chia sẻ với bên thứ ba
- ❌ Modify mà không phép

**© 2024 Toàn Tâm Phát. All rights reserved.**

---

## 🗺️ Roadmap

| Tính Năng | Q2 2026 | Q3 2026 | Q4 2026 |
|-----------|---------|---------|---------|
| Cảnh báo công nợ quá hạn | ✅ | | |
| Mobile app (React Native) | | 🔄 | |
| Payment gateway integration | | | 🔄 |
| Advanced analytics | | 🔄 | ✅ |

---

**Cập nhật lần cuối:** Tháng 4, 2026
