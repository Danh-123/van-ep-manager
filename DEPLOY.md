# Hướng dẫn Deploy Ứng dụng Quản lý Công nhân

## 📋 Mục lục

1. [Chuẩn bị trước deploy](#chuẩn-bị-trước-deploy)
2. [Deploy lên Vercel](#deploy-lên-vercel)
3. [Cấu hình Supabase Production](#cấu-hình-supabase-production)
4. [Environment Variables](#environment-variables)
5. [Custom Domain](#custom-domain)
6. [Post-Deploy Checklist](#post-deploy-checklist)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Chuẩn bị trước deploy

### 1. Kiểm tra Build Local
```bash
# Xóa cache
rm -r .next

# Build production
npm run build

# Kiểm tra build thành công
npm run lint
```

### 2. Chuẩn bị Git Repository
```bash
# Đảm bảo tất cả changes đã commit
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 3. Yêu cầu Accounts
- ✅ GitHub account (để connect repository)
- ✅ Vercel account (https://vercel.com)
- ✅ Supabase project (production database)

---

## 🚀 Deploy lên Vercel

### Bước 1: Kết nối GitHub Repository
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com)
2. Nhấp **"Add New..."** → **"Project"**
3. Import repository **van-ep-manager**
4. Vercel sẽ tự detect Next.js framework
5. Nhấp **"Import"**

### Bước 2: Cấu hình Build Settings
Vercel sẽ tự detect cấu hình từ `next.config.js` và `vercel.json`:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Bước 3: Thêm Environment Variables
Trước khi deploy, thêm environment variables (xem phần [Environment Variables](#environment-variables)):

1. Vào **Settings** → **Environment Variables**
2. Thêm các biến cần thiết (SUPABASE_URL, SUPABASE_ANON_KEY, v.v.)
3. Chọn environments: **Production, Preview, Development**

### Bước 4: Deploy
1. Sau khi cấu hình xong, nhấp **"Deploy"**
2. Vercel sẽ:
   - Build ứng dụng
   - Chạy tests/lint
   - Deploy lên CDN
3. Wait for deployment to complete (~2-5 minutes)

### Bước 5: Verify Deployment
- Vercel sẽ cấp URL: `https://<project-name>.vercel.app`
- Kiểm tra ứng dụng hoạt động bình thường

---

## 🗄️ Cấu hình Supabase Production

### Bước 1: Tạo Production Database

#### Option A: Tạo Project Supabase Mới (Recommended)
1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Tạo organization mới (nếu cần)
3. Tạo project mới:
   - **Project Name**: `van-ep-manager-prod`
   - **Database Password**: Dùng strong password (lưu lại an toàn!)
   - **Region**: Chọn gần users nhất (ví dụ: Singapore)
4. Lấy **Project URL** và **Anon Key** từ Settings → API

#### Option B: Nâng cấp Existing Project
Nếu muốn dùng project hiện tại làm production:
1. Tắt realtime (nếu không cần)
2. Enable backup tự động: Settings → Backups
3. Cấu hình WAL (Write-Ahead Logging) cho recovery tốt hơn

### Bước 2: Chạy Migration SQL

Sao chép tất cả SQL từ `schema.sql`:

```bash
# Với Supabase CLI (recommended)
supabase db push

# Hoặc manual: 
# 1. Đăng nhập Supabase Dashboard
# 2. SQL Editor → New Query
# 3. Dán nội dung schema.sql
# 4. Nhấp "Run"
```

**Các bảng sẽ được tạo:**
- `profiles` - Người dùng
- `cong_nhan` - Công nhân
- `cham_cong` - Chấm công
- `phieu_can` - Phiếu cân
- `luong_thang` - Lương tháng
- `lich_su_thanh_toan` - Lịch sử thanh toán
- `audit_log` - Audit trail
- Các bảng master khác (loai_van_ep, xe_hang, v.v.)

### Bước 3: Cấu hình RLS (Row Level Security)

RLS policies đảm bảo dữ liệu bảo mật. Chạy SQL sau:

```sql
-- Profile RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Chính sách cho Admin
CREATE POLICY profile_admin_all ON profiles
  USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- Chính sách cho KeToan (xem toàn bộ, sửa chỉnh trừ role)
CREATE POLICY profile_ketoan_read ON profiles
  USING (auth.jwt() ->> 'role' = 'KeToan')
  WITH CHECK (false);

-- Chính sách cho Viewer (xem chỉ user của họ)
CREATE POLICY profile_viewer_own ON profiles
  USING (id = auth.uid())
  WITH CHECK (false);

-- Audit Log RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_admin_all ON audit_log
  USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

CREATE POLICY audit_ketoan_read ON audit_log
  USING (auth.jwt() ->> 'role' = 'KeToan')
  WITH CHECK (false);

-- Công nhân RLS
ALTER TABLE cong_nhan ENABLE ROW LEVEL SECURITY;

CREATE POLICY cong_nhan_admin_all ON cong_nhan
  USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

CREATE POLICY cong_nhan_ketoan_all ON cong_nhan
  USING (auth.jwt() ->> 'role' IN ('KeToan', 'Admin'))
  WITH CHECK (false);

CREATE POLICY cong_nhan_viewer_personal ON cong_nhan
  USING (user_id = auth.uid())
  WITH CHECK (false);

-- Chấm công RLS
ALTER TABLE cham_cong ENABLE ROW LEVEL SECURITY;

CREATE POLICY cham_cong_admin_all ON cham_cong
  USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

CREATE POLICY cham_cong_ketoan_all ON cham_cong
  USING (auth.jwt() ->> 'role' IN ('KeToan', 'Admin'))
  WITH CHECK (false);

CREATE POLICY cham_cong_viewer_personal ON cham_cong
  USING (EXISTS (
    SELECT 1 FROM cong_nhan
    WHERE cong_nhan.id = cham_cong.id_cong_nhan
    AND cong_nhan.user_id = auth.uid()
  ))
  WITH CHECK (false);
```

### Bước 4: Cấu hình Backups

**Settings → Backups:**
- Enable Point-in-time Recovery (PITR)
- Thiết lập daily backups
- Lưu backup lên S3 hoặc storage khác

### Bước 5: Enable Monitoring

**Analytics → Database:**
- Theo dõi CPU, Memory, Connections
- Thiết lập alerts cho anomalies
- Kiểm tra slow queries regularly

---

## 🔐 Environment Variables

### Tạo `.env.production.local` (Local cho production testing)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Next.js
NODE_ENV=production

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id

# Optional: Error Tracking
SENTRY_DSN=your_sentry_dsn
```

### Thêm vào Vercel

**Dashboard → Settings → Environment Variables:**

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[Anon Key from Supabase]` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Service Role Key from Supabase]` | Production only |

**⚠️ BẢNG:** Không commit `.env.production.local` vào Git!

---

## 🌐 Custom Domain

### Bước 1: Mua Domain
- Platforms: Namecheap, GoDaddy, Domains.com, v.v.

### Bước 2: Cấu hình DNS tại Domain Provider

Vercel cung cấp DNS records. Vào **Settings → Domains**:

```
Type    | Name              | Value
--------|-------------------|----------------------------------------
A       | @                 | 76.76.19.132
CNAME   | www               | cname.vercel-dns.com
CNAME   | ...               | vị trí ứng dụng trên Vercel CDN
```

### Bước 3: Thêm Domain vào Vercel

1. **Settings → Domains**
2. **Add Domain**
3. Nhập domain (ví dụ: `quanly.company.com`)
4. Cập nhật DNS records
5. Vercel sẽ validate và cấp SSL certificate

### Bước 4: Verify SSL

```bash
# Kiểm tra SSL certificate
curl -I https://quanly.company.com

# Output sẽ có: HTTP/2 200 OK
```

---

## ✅ Post-Deploy Checklist

### Week 1: Monitoring & Validation

- [ ] **Login & Authentication**
  ```bash
  curl -X POST https://app-url/api/auth/callback/email \
    -H "Content-Type: application/json"
  ```
  - Kiểm tra login page tải đúng
  - Test login với test account
  - Test logout
  - Test role-based redirects

- [ ] **API Endpoints**
  - Verify import endpoints respond: `POST /import`
  - Verify audit log endpoint: `GET /audit-log`
  - Verify salary endpoints: `GET /salary`
  - Check response times < 500ms

- [ ] **Excel Export**
  - Login as Viewer
  - Vào My Salary → Export
  - Verify file downloads correctly
  - Open .xlsx file, check formatting
  - Kiểm tra số tiền hiển thị đúng

- [ ] **Database Connectivity**
  ```sql
  -- Chạy từ Supabase SQL Editor
  SELECT COUNT(*) FROM profiles;
  SELECT COUNT(*) FROM cong_nhan;
  ```
  - Verify tables exist
  - Check RLS policies enabled

- [ ] **Backdate & Recalculation**
  - Login as Admin
  - Import sample attendance data
  - Vào dev/test-recalculation
  - Run 4 scenarios → All should PASS
  - Kiểm tra salary recalculation correct

### Week 2-4: Performance & Security

- [ ] **Performance**
  - Monitor Vercel Analytics
  - Check Core Web Vitals
  - Response times < 500ms
  - Database queries < 100ms

- [ ] **Security**
  - Enable HTTPS redirect
  - Set Security Headers (HSTS, CSP)
  - Enable Rate Limiting công ty
  - Check Supabase audit log for suspicious activity

- [ ] **Backups**
  - Verify daily backups running
  - Test restore process
  - Document recovery procedure

- [ ] **Error Tracking**
  - Setup Sentry (optional)
  - Configure error notifications
  - Review first week errors
  - Fix high-priority bugs

---

## 🐛 Troubleshooting

### Build Failure

```bash
# Clear Vercel cache
vercel env pull  # Verify env vars pulled correctly

# Local test
npm run build  # Replicate build locally
npm run lint   # Check linting issues
```

**Common Issues:**
- ❌ `Cannot find module '@supabase/supabase-js'` → Run `npm install`
- ❌ TypeScript errors → Check `tsconfig.json`, run `npm run build`
- ❌ Environment variables not set → Verify in Vercel Settings

### Lambda/Runtime Errors

```
Error: Cannot connect to Supabase
```

**Solutions:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` format: `https://xxxx.supabase.co`
2. Check Supabase project is active
3. Verify ANON_KEY is correct
4. Check Supabase region hasn't changed

### RLS Denies Access

```
Error: row-level security policy perm denied
```

**Solutions:**
1. Verify user is authenticated
2. Check `auth.uid()` matches record owner
3. Check policy syntax is correct
4. Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```

### Slow Database Queries

**Optimization:**
```sql
-- Add indexes
CREATE INDEX idx_cham_cong_id_nhan ON cham_cong(id_cong_nhan);
CREATE INDEX idx_cham_cong_ngay ON cham_cong(ngay);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(changed_by);
```

### Domain Issues

| Problem | Solution |
|---------|----------|
| Domain não pointing to Vercel | Check DNS A record pointing to Vercel IP |
| SSL certificate not issuing | Wait 24 hours, then check Vercel console |
| Custom domain not working | Verify domain registered & DNS propagated (check DNS propagation tools) |

---

## 📊 Monitoring & Alerting

### Vercel Analytics
- Dashboard → Analytics
- Monitor:
  - Page Response Times
  - Web Core Vitals (LCP, FID, CLS)
  - Error Rate
  - Function Duration

### Supabase Monitoring
- Dashboard → Analytics
- Monitor:
  - Database CPU & Memory
  - Active Connections
  - Query Performance
  - Realtime Connections (if used)

### Setup Alerts

**Vercel Alerts:**
- Go to Settings → Alerts
- Configure alerts for:
  - Build failures
  - High error rates
  - Slow response times

**Supabase Alerts:**
- Settings → Alerts
- Configure alerts for:
  - High CPU usage (>80%)
  - High memory usage (>85%)
  - Connection limit reached

---

## 🔄 CI/CD Pipeline

Xem file `.github/workflows/deploy.yml` để thiết lập GitHub Actions auto-deploy.

**Workflow:**
- GitHub push → Tests run → Build verified → Deploy to Vercel

---

## 📞 Support & Documentation

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Project Repo**: https://github.com/your-org/van-ep-manager

---

## ✨ Success Checklist

✅ All environment variables set in Vercel
✅ Custom domain configured and SSL working
✅ Database migrated and RLS enabled
✅ All post-deploy tests passing
✅ Monitoring and alerts configured
✅ Backups enabled and tested
✅ Team trained on deployment process
✅ Documentation updated

**Deployment is complete and ready for production use!** 🎉
