# Hướng dẫn Cấu hình Supabase Production

## 📋 Mục lục

1. [Tạo Project Production](#tạo-project-production)
2. [Migration Database](#migration-database)
3. [Cấu hình RLS Policies](#cấu-hình-rls-policies)
4. [Khôi phục Dữ liệu](#khôi-phục-dữ-liệu)
5. [Backup & Recovery](#backup--recovery)
6. [Monitoring & Performance](#monitoring--performance)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Tạo Project Production

### Bước 1: Tạo Organization

1. Đăng nhập [Supabase Dashboard](https://app.supabase.com)
2. Nhấp **"New Organization"**
3. Nhập tên: `van-ep-manager-prod`
4. Chọn plan: **Pro** (recommended cho production)
5. Cấu hình billing:
   - Thiết lập payment method
   - Xem pricing tại https://supabase.com/pricing

### Bước 2: Tạo Project

1. Nhấp **"New Project"**
2. Cấu hình:
   - **Database Name**: `van_ep_manager`
   - **Database Password**: Use strong password ✅
     ```
     Yêu cầu:
     - Tối thiểu 12 ký tự
     - Bao gồm: chữ hoa + chữ thường + số + ký tự đặc biệt
     - Ví dụ: P@ssw0rd_Secure!2024
     ```
   - **Region**: `Singapore (ap-southeast-1)` ← Gần Asia
   - **Billing Cycle**: Monthly

3. Nhấp **"Create new project"**
4. Wait for database initialization (~2-5 minutes)

### Bước 3: Lấy Connection Details

Vào **Settings → API**:

```
Project URL:      https://xxxxx.supabase.co
Anon Key:         eyJhbGc...  (Copy this)
Service Role Key: eyJhbGc...  (Copy this - KEEP SECRET!)
```

### Bước 4: Cấu hình SMTP (Email)

Nếu muốn dùng email service (optional):

1. Settings → Email Templates
2. Cấu hình custom SMTP hoặc dùng Supabase default

---

## 🗄️ Migration Database

### Option A: Dùng Supabase CLI (Recommended)

**Setup CLI:**
```bash
# Cài đặt
npm install -g supabase

# Login
supabase login
# Sẽ mở browser để authenticate

# Link project
supabase link --project-ref xxxxx
# Nhập password database
```

**Chạy Migration:**
```bash
# Push schema từ local
supabase db push

# Hoặc pull schema từ production
supabase db pull
```

### Option B: Manual SQL Upload (Nếu không có CLI)

**Bước 1: Chuẩn bị SQL**
1. Copy toàn bộ content từ `schema.sql`
2. Chia thành sections (tables → functions → triggers)

**Bước 2: Upload via Supabase Editor**
1. Vào dashboard → SQL Editor
2. Nhấp **"New Query"**
3. Dán SQL cho tables:
   ```sql
   -- Copy từ schema.sql (phần CREATE TABLE)
   CREATE TABLE profiles (
     ...
   );
   CREATE TABLE cong_nhan (
     ...
   );
   -- ... (tất cả tables)
   ```
4. Nhấp **"Run"**
5. Đợi completion

**Bước 3: Thêm Functions**
1. Tạo query mới
2. Dán SQL cho functions (recalculate_luong_ngay, write_audit_log)
3. Run

**Bước 4: Thêm Triggers**
1. Tạo query mới
2. Dán SQL cho triggers
3. Run

---

## 🔐 Cấu hình RLS Policies

### Tại sao RLS?
- Bảo mật: Chỉ users authorized mới xem dữ liệu của họ
- Data Isolation: Admin xem all, Viewer xem personal
- Compliance: Dễ audit + comply regulations

### Bước 1: Enable RLS trên Tất cả Tables

```sql
-- Run trong SQL Editor

-- 1. Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Công nhân
ALTER TABLE cong_nhan ENABLE ROW LEVEL SECURITY;

-- 3. Chấm công
ALTER TABLE cham_cong ENABLE ROW LEVEL SECURITY;

-- 4. Phiếu cân
ALTER TABLE phieu_can ENABLE ROW LEVEL SECURITY;

-- 5. Lương tháng
ALTER TABLE luong_thang ENABLE ROW LEVEL SECURITY;

-- 6. Lịch sử thanh toán
ALTER TABLE lich_su_thanh_toan ENABLE ROW LEVEL SECURITY;

-- 7. Audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 8. Các bảng master
ALTER TABLE loai_van_ep ENABLE ROW LEVEL SECURITY;
ALTER TABLE xe_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE tong_tien_cong_ngay ENABLE ROW LEVEL SECURITY;
```

### Bước 2: Tạo Policies

**Profile Policies:**
```sql
-- Admin: Full access
CREATE POLICY "admin_all" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- KeToan: Read-only
CREATE POLICY "ketoan_read" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'role' = 'KeToan')
  WITH CHECK (false);

-- Viewer: See own profile only
CREATE POLICY "viewer_own" ON profiles
  FOR SELECT USING (id = auth.uid());
```

**Công Nhân Policies:**
```sql
-- Admin: Full access
CREATE POLICY "admin_all" ON cong_nhan
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- KeToan: Full read, no write
CREATE POLICY "ketoan_read" ON cong_nhan
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('KeToan', 'Admin'));

-- Viewer: See personal record only
CREATE POLICY "viewer_personal" ON cong_nhan
  FOR SELECT USING (user_id = auth.uid());
```

**Chấm Công Policies:**
```sql
-- Admin: Full access
CREATE POLICY "admin_all" ON cham_cong
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- KeToan: Full read
CREATE POLICY "ketoan_read" ON cham_cong
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('KeToan', 'Admin'));

-- Viewer: See personal attendance
CREATE POLICY "viewer_personal" ON cham_cong
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cong_nhan
      WHERE cong_nhan.id = cham_cong.id_cong_nhan
      AND cong_nhan.user_id = auth.uid()
    )
  );
```

**Audit Log Policies:**
```sql
-- Admin: Full access
CREATE POLICY "audit_admin_all" ON audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- KeToan: Read-only
CREATE POLICY "audit_ketoan_read" ON audit_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'KeToan');
```

### Bước 3: Verify Policies

```sql
-- Kiểm tra policies được apply
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'cong_nhan', 'audit_log');
```

---

## 📥 Khôi phục Dữ liệu

### Nếu có Backup từ Dev/Staging

**Dùng Database Links:**
```bash
# Export từ dev database
pg_dump --host dev-db.supabase.co \
        --user postgres \
        --password \
        --database postgres > backup.sql

# Import vào production
psql --host prod-db.supabase.co \
     --user postgres \
     --password \
     --database postgres < backup.sql
```

**Hoặc dùng Supabase CLI:**
```bash
# Get connection string từ SSH keys
supabase db pull > prod-schema.sql

# Sửa import links nếu có
# Sau đó push lên
supabase db push
```

### Khôi phục Từ CSV (Nếu có dữ liệu structured)

**JavaScript:**
```javascript
// lib/supabase/import-data.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const supabase = createClient(URL, SERVICE_KEY);

const data = readFileSync('employees.csv', 'utf-8');
const records = parse(data, { columns: true });

// Insert batch
const { error } = await supabase
  .from('cong_nhan')
  .insert(records);

if (error) console.error(error);
```

---

## 💾 Backup & Recovery

### Enable Automated Backups

1. **Settings → Backups**
2. Enable:
   - ✅ Point-in-time Recovery (PITR)
   - ✅ Daily backups
   - ✅ Store in S3 (optional)

### Manual Backup

**Supabase UI:**
1. Settings → Backups
2. Click **"Create backup"**
3. Backup sẽ save automatically

**Command Line:**
```bash
# Get backup status
supabase db backup check

# Manual trigger
# (Recommend dùng UI)
```

### Restore from Backup

**Urgent Restore (RTO < 15 min):**
1. Settings → Backups
2. Find desired backup point
3. Click **"Restore"**
4. Confirm → Restore begins
5. Monitor restore progress

**Full Database Restore:**
```bash
# Export backup
supabase db pull --restore-point "2024-01-15T10:30:00"

# Review
cat backup.sql

# Apply (careful!)
supabase db push
```

---

## 📊 Monitoring & Performance

### Database Metrics

**Vào Settings → Analytics:**

| Metric | Target | Action if High |
|--------|--------|-----------------|
| CPU Usage | < 70% | Optimize queries, add indexes |
| Memory | < 80% | Upgrade plan or optimize |
| Connections | < max | Kill idle connections |
| Replication Lag | < 100ms | Check network, increase resources |

### Slow Query Log

```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;

-- Add indexes for slow queries
CREATE INDEX idx_cham_cong_ngay ON cham_cong(ngay);
CREATE INDEX idx_cham_cong_worker ON cham_cong(id_cong_nhan);
```

### Connection Monitoring

```sql
-- Check active connections
SELECT datname, usename, COUNT(*) as conn_count
FROM pg_stat_activity
GROUP BY datname, usename;

-- Kill idle connections (if needed)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '30 minutes';
```

### Setup Alerts

1. Settings → Alerts
2. Configure for:
   - CPU > 80%
   - Memory > 85%
   - Connections > 80 (default: 100)
   - Replication lag > 500ms

---

## 🔧 Troubleshooting

### Auth Issues

**Problem:** "Cannot authenticate"
```sql
-- Check users table
SELECT id, email, role FROM profiles LIMIT 5;

-- Verify tokens
SELECT * FROM auth.users LIMIT 5;
```

### RLS Denies Access

**Problem:** "row-level security policy perm denied"

**Solution 1: Verify Auth Context**
```javascript
const user = await supabase.auth.getUser();
console.log(user.data);
```

**Solution 2: Check Policy Logic**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM profiles;

-- Re-enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**Solution 3: Verify Role in JWT**
```sql
-- Check if role is in JWT
SELECT
  auth.jwt() ->> 'email' as email,
  auth.jwt() ->> 'role' as role;
```

### Database Connection

**Problem:** "FATAL: password authentication failed"

Solutions:
1. Verify password is correct in ENV vars
2. Reset database password: Settings → Database → Reset Password
3. Check firewall isn't blocking connection

**Problem:** "Connection timeout"

Solutions:
1. Verify database is running (Settings → Database)
2. Check regional connectivity
3. Use connection pooling (PgBouncer in Supabase)

### Performance Issues

**Queries slow (> 1000ms):**

```sql
-- Check query plan
EXPLAIN ANALYZE SELECT * FROM cham_cong WHERE ngay = '2024-01-15';

-- Add missing index
CREATE INDEX idx_cham_cong_ngay ON cham_cong(ngay);

-- Re-test
EXPLAIN ANALYZE SELECT * FROM cham_cong WHERE ngay = '2024-01-15';
```

**High memory usage:**
```sql
-- Find large tables
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename) DESC;

-- Consider archiving old data
DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 🔄 Maintenance Schedule

### Daily
```
- Monitor dashboards
- Check error logs
- Verify backups completed
```

### Weekly
```
- Review slow queries
- Check connection pool stats
- Analyze storage usage
```

### Monthly
```
- Review security logs (audit_log)
- Update statistics: ANALYZE;
- Optimize indexes
- Review RLS policies
```

### Quarterly
```
- Full backup restoration test (1 record only)
- Security audit
- Capacity planning
- Performance tuning
```

---

## ✅ Production Readiness Checklist

- [ ] Project created and configured
- [ ] Database schema migrated
- [ ] RLS policies enabled on all tables
- [ ] Backups configured and tested
- [ ] Monitoring alerts set up
- [ ] Connection pooling enabled
- [ ] Performance baseline established
- [ ] Disaster recovery procedure documented
- [ ] Team trained on procedures
- [ ] Runbook created for on-call

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Database Admin**: https://app.supabase.com
- **Status Page**: https://status.supabase.com
