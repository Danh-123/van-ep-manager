# Hướng dẫn Kỹ thuật - Kiến trúc & Mở rộng

**Dành cho:** Developers, Technical Lead  
**Phiên bản:** 1.0  
**Cập nhật:** Tháng 3, 2026

---

## 📋 Mục lục

1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Tech stack](#tech-stack)
3. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
4. [Database schema](#database-schema)
5. [Server Actions (API)](#server-actions-api)
6. [Mở rộng module mới](#mở-rộng-module-mới)
7. [Debugging & testing](#debugging--testing)

---

## 🏗️ Tổng quan kiến trúc

### High-level Architecture

```
┌─────────────────────────────────────┐
│     Browser (Client)                │
│  ├─ React 19.2.4 Components         │
│  ├─ TailwindCSS + Radix UI          │
│  └─ Client-side state (hooks)       │
└────────────┬────────────────────────┘
             │ HTTP/HTTPS
             ↓
┌─────────────────────────────────────┐
│   Next.js 15.5.14 (App Router)      │
│  ├─ Server Components (SSR)         │
│  ├─ Server Actions                  │
│  ├─ Middleware (auth, role check)   │
│  └─ API Routes (if needed)          │
└────────────┬────────────────────────┘
             │ PostgreSQL Wire Protocol
             ↓
┌─────────────────────────────────────┐
│  Supabase Backend                   │
│  ├─ PostgreSQL Database             │
│  ├─ Row-Level Security (RLS)        │
│  ├─ Triggers (auto recalc)          │
│  ├─ Auth (Supabase Auth)            │
│  └─ Real-time (subscriptions)       │
└─────────────────────────────────────┘
```

### Request Flow Example

**User action: Update chấm công**

```
1. User clicks "Sửa" on cham_cong form
   ↓
2. React component calls updateAttendance() (Server Action)
   ↓
3. Server Action validates & sanitizes input
   ↓
4. Call Supabase: supabase.from('cham_cong').update(data)
   ↓
5. Database RLS checks: User role ✓ Permission ✓
   ↓
6. UPDATE statement executes
   ↓
7. Trigger activates: on UPDATE, call recalculate_luong_ngay()
   ↓
8. Recalculation runs:
   - Get all cham_cong for that date
   - Get tong_tien_cong_ngay
   - Distribute salary per person
   - Update tong_tien_cong_ngay & cham_cong.don_gia
   ↓
9. Result returned to client
   ↓
10. Client revalidatePath() to refresh UI
```

---

## 🛠️ Tech stack

### Frontend
```
Framework:      Next.js 15.5.14 (React 19.2.4)
CSS:            TailwindCSS 4.0
UI Components:  Radix UI (tabs, dialogs, dropdown)
Icons:          Lucide React 1.0
Forms:          React Hook Form 7.72 + Zod 4.3
State:          React hooks (useState, useReducer)
Date handling:  date-fns 4.1
Excel export:   ExcelJS 4.4 + file-saver 2.0
Charts:         Recharts 3.8 (optional)
```

### Backend
```
Runtime:        Node.js (Vercel)
Framework:      Next.js 15.5.14
Database:       PostgreSQL (via Supabase)
ORM:            Manual SQL + Supabase Client
Validation:     Zod 4.3
Auth:           Supabase Auth (JWT)
Monitoring:     Vercel Analytics
CI/CD:          GitHub Actions
```

### Database
```
Engine:         PostgreSQL 14+
Hosting:        Supabase
Features:       RLS, Triggers, Functions
Authentication: Supabase JWT (auth.uid())
```

---

## 📂 Cấu trúc thư mục

```
van-ep-manager/
├── app/
│   ├── (dashboard)/          # Protected routes (require auth)
│   │   ├── layout.tsx        # Dashboard layout + sidebar
│   │   ├── page.tsx          # Dashboard homepage
│   │   ├── import/
│   │   │   ├── page.tsx      # Import UI
│   │   │   └── actions.ts    # Import server actions
│   │   ├── audit-log/
│   │   │   └── page.tsx      # Audit log page
│   │   ├── my-salary/
│   │   │   └── page.tsx      # Viewer personal salary
│   │   ├── my-attendance/
│   │   │   └── page.tsx      # Viewer personal attendance
│   │   └── dev/              # Dev-only routes (guarded)
│   │       └── test-recalculation/
│   │           ├── page.tsx
│   │           ├── actions.ts
│   │           └── TestRecalculationClient.tsx
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
│
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx       # Navigation menu
│   │   └── UserMenu.tsx
│   ├── import/
│   │   └── ImportManager.tsx # Import UI component
│   ├── audit/
│   │   ├── AuditTable.tsx
│   │   └── JsonViewer.tsx
│   ├── viewer/
│   │   ├── PersonalSalaryTable.tsx
│   │   └── PersonalCalendar.tsx
│   └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Supabase client creation
│   │   ├── server.ts         # Server-side client
│   │   └── middleware.ts     # Auth middleware
│   ├── import/
│   │   └── validator.ts      # Import validation logic
│   ├── viewer/
│   │   └── personal.ts       # Viewer data mapping
│   ├── testing/
│   │   ├── seedData.ts       # Test data generators
│   │   ├── verifyRecalculation.ts
│   │   └── recalculation.test.ts
│   └── utils.ts              # Utilities (formatting, etc.)
│
├── middleware.ts             # Next.js middleware (auth)
├── schema.sql                # Database schema + triggers
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
└── tsconfig.json             # TypeScript config
```

---

## 🗄️ Database schema

### Core Tables

**1. profiles (Users)**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role VARCHAR(20) NOT NULL 
    CHECK (role IN ('Admin', 'KeToan', 'Viewer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. cong_nhan (Employees)**
```sql
CREATE TABLE cong_nhan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_cong_nhan TEXT UNIQUE NOT NULL,         -- Employee ID (CN001)
  ho_ten TEXT NOT NULL,                      -- Full name
  so_dien_thoai TEXT,
  dia_chi TEXT,
  user_id UUID REFERENCES profiles(id),      -- Link to Supabase user
  created_at TIMESTAMP DEFAULT NOW()
);
```

**3. cham_cong (Attendance)**
```sql
CREATE TABLE cham_cong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cong_nhan UUID NOT NULL REFERENCES cong_nhan(id),
  ngay DATE NOT NULL,                        -- Date
  trang_thai VARCHAR(20) NOT NULL            -- CoMat/Nghi/NghiPhep/LamThem
    CHECK (trang_thai IN ('CoMat', 'Nghi', 'NghiPhep', 'LamThem')),
  so_luong DECIMAL(10,2),                    -- Quantity (1 for CoMat, 0 for Nghi)
  don_gia DECIMAL(15,2),                     -- Salary per person
  thanh_tien DECIMAL(15,2),                  -- Total = so_luong * don_gia
  ghi_chu JSONB,                             -- {status, bonus, penalty, note}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_cong_nhan, ngay)                 -- One record per person per day
);
```

**4. tong_tien_cong_ngay (Daily Total Salary)**
```sql
CREATE TABLE tong_tien_cong_ngay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay DATE NOT NULL UNIQUE,                 -- Date
  tong_tien DECIMAL(15,2) NOT NULL,          -- Total salary budget for day
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**5. phieu_can (Weighing Tickets)**
```sql
CREATE TABLE phieu_can (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cong_nhan UUID NOT NULL REFERENCES cong_nhan(id),
  ngay_can DATE NOT NULL,
  loai_van_ep TEXT NOT NULL,                 -- Type (Sẽ, Khoai, ...)
  khoi_luong DECIMAL(10,2) NOT NULL,         -- Weight (kg)
  don_gia DECIMAL(15,2) NOT NULL,            -- Price per kg
  tong_tien DECIMAL(15,2) GENERATED ALWAYS AS 
    (khoi_luong * don_gia) STORED,           -- Auto calculated
  ghi_chu TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**6. luong_thang (Monthly Salary)**
```sql
CREATE TABLE luong_thang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cong_nhan UUID NOT NULL REFERENCES cong_nhan(id),
  thang VARCHAR(7) NOT NULL,                 -- YYYY-MM format
  tong_tien DECIMAL(15,2) NOT NULL,
  da_thanh_toan BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_cong_nhan, thang)
);
```

**7. lich_su_thanh_toan (Payment History)**
```sql
CREATE TABLE lich_su_thanh_toan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cong_nhan UUID NOT NULL REFERENCES cong_nhan(id),
  id_luong_thang UUID REFERENCES luong_thang(id),
  so_tien DECIMAL(15,2) NOT NULL,
  hinh_thuc VARCHAR(20) NOT NULL             -- TienMat/ChuyenKhoan/Khac
    CHECK (hinh_thuc IN ('TienMat', 'ChuyenKhoan', 'Khac')),
  ngay_thanh_toan DATE NOT NULL,
  ghi_chu TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**8. audit_log (Change Audit Trail)**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,                  -- Table changed
  record_id UUID,                            -- Record ID
  action VARCHAR(10) NOT NULL                -- INSERT/UPDATE/DELETE
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_value JSONB,                           -- Before update
  new_value JSONB,                           -- After update
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Database Functions

**1. recalculate_luong_ngay() - Salary Recalculation**
```sql
CREATE OR REPLACE FUNCTION recalculate_luong_ngay(p_ngay DATE)
RETURNS void AS $$
DECLARE
  v_tong_tien DECIMAL;
  v_present_count INT;
  v_per_person DECIMAL;
  v_record RECORD;
BEGIN
  -- Get total salary for day
  SELECT tong_tien INTO v_tong_tien 
  FROM tong_tien_cong_ngay 
  WHERE ngay = p_ngay;
  
  -- Count present workers
  SELECT COUNT(*) INTO v_present_count 
  FROM cham_cong 
  WHERE ngay = p_ngay 
  AND trang_thai IN ('CoMat', 'LamThem');
  
  -- Calculate per person
  IF v_present_count > 0 THEN
    v_per_person := v_tong_tien / v_present_count;
    
    -- Update all present/extra workers
    UPDATE cham_cong 
    SET don_gia = v_per_person,
        thanh_tien = so_luong * v_per_person,
        updated_at = NOW()
    WHERE ngay = p_ngay 
    AND trang_thai IN ('CoMat', 'LamThem');
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**2. write_audit_log() - Audit Trigger**
```sql
CREATE OR REPLACE FUNCTION write_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log UPDATE and DELETE (not INSERT)
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log 
    (table_name, record_id, action, old_value, new_value, changed_by)
    VALUES 
    (TG_TABLE_NAME, NEW.id, 'UPDATE', 
     row_to_json(OLD), row_to_json(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log 
    (table_name, record_id, action, old_value, changed_by)
    VALUES 
    (TG_TABLE_NAME, OLD.id, 'DELETE', 
     row_to_json(OLD), auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### RLS Policies (Row-Level Security)

**Example: cham_cong table**
```sql
-- Admin can do anything
CREATE POLICY "admin_all" ON cham_cong
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- KeToan can read/write all
CREATE POLICY "ketoan_all" ON cham_cong
  FOR ALL USING (auth.jwt() ->> 'role' = 'KeToan')
  WITH CHECK (auth.jwt() ->> 'role' = 'KeToan');

-- Viewer can only see own
CREATE POLICY "viewer_personal" ON cham_cong
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cong_nhan
      WHERE cong_nhan.id = cham_cong.id_cong_nhan
      AND cong_nhan.user_id = auth.uid()
    )
  );
```

---

## ⚡ Server Actions (API)

### What are Server Actions?

Server Actions = Type-safe async functions that run on server.

**Benefits:**
- ✓ No explicit API routes needed
- ✓ Direct database access
- ✓ Automatic serialization
- ✓ Built-in security

### Usage Pattern

**1. Define in actions.ts:**
```typescript
// app/import/actions.ts
'use server'

export async function importAttendance(data: ImportData) {
  const supabase = createServerClient()
  
  // Validate
  const validated = validateAttendanceRows(data.rows)
  
  // Import
  const { error } = await supabase
    .from('cham_cong')
    .insert(validated.rows)
  
  if (error) throw error
  
  return { success: true, rowsInserted: validated.rows.length }
}
```

**2. Call from Client Component:**
```typescript
// components/SomeComponent.tsx
'use client'

import { importAttendance } from '@/app/import/actions'

export function ImportForm() {
  const [loading, setLoading] = useState(false)
  
  async function handleImport(data: ImportData) {
    setLoading(true)
    try {
      const result = await importAttendance(data)
      console.log('Imported:', result.rowsInserted)
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return <button onClick={() => handleImport(data)}>Import</button>
}
```

### Common Server Actions in Project

| Function | File | Purpose |
|----------|------|---------|
| `importAttendance` | app/import/actions.ts | Import chấm công |
| `importTickets` | app/import/actions.ts | Import phiếu cân |
| `importSalary` | app/import/actions.ts | Import lương |
| `importDebt` | app/import/actions.ts | Import công nợ |
| `runScenarioA-D` | app/dev/test-recalculation/actions.ts | Test recalculation |

### Error Handling Patterns

**Pattern 1: Try-catch with Zod validation**
```typescript
'use server'

import { z } from 'zod'

const InputSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive()
})

export async function updateSalary(input: unknown) {
  try {
    const validated = InputSchema.parse(input)
    
    const supabase = createServerClient()
    const { error } = await supabase
      .from('luong_thang')
      .update({ tong_tien: validated.amount })
      .eq('id', 'some-id')
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.errors }
    }
    return { success: false, error: error.message }
  }
}
```

**Pattern 2: Admin guard**
```typescript
'use server'

export async function dangerousAdminAction() {
  const supabase = createServerClient()
  const user = await supabase.auth.getUser()
  
  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.data.user.id)
    .single()
  
  if (profile?.role !== 'Admin') {
    throw new Error('Unauthorized: Admin only')
  }
  
  // Proceed with dangerous operation
  // ...
}
```

---

## 🔌 Mở rộng module mới

### Thêm module "Hưởng lương bổ sung"

**Step 1: Create database table**
```sql
CREATE TABLE huong_luong_bo_sung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cong_nhan UUID NOT NULL REFERENCES cong_nhan(id),
  loai_huong TEXT NOT NULL,              -- BaoHiem, KPLLD, ...
  so_tien DECIMAL(15,2) NOT NULL,
  thang VARCHAR(7) NOT NULL,
  du_kien_cap DATE,
  ghi_chu TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_cong_nhan, loai_huong, thang)
);

-- Add RLS
ALTER TABLE huong_luong_bo_sung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON huong_luong_bo_sung
  FOR ALL USING (auth.jwt() ->> 'role' = 'Admin');

CREATE POLICY "ketoan_all" ON huong_luong_bo_sung
  FOR ALL USING (auth.jwt() ->> 'role' = 'KeToan');
```

**Step 2: Validation (lib/import/validator.ts)**
```typescript
export function validateSupplementaryRows(rows: any[]) {
  const schema = z.object({
    ma_cong_nhan: z.string(),
    ho_ten: z.string(),
    loai_huong: z.enum(['BaoHiem', 'KPLLD', 'VatDung']),
    so_tien: z.coerce.number().positive(),
    thang: z.string().regex(/^\d{4}-\d{2}$/) // YYYY-MM
  })
  
  const validated: any[] = []
  const errors: ValidationError[] = []
  
  rows.forEach((row, idx) => {
    try {
      validated.push(schema.parse(row))
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.push({ rowIndex: idx, error: e.errors })
      }
    }
  })
  
  return { validated, errors }
}
```

**Step 3: Server Action**
```typescript
// app/supplementary/actions.ts
'use server'

export async function importSupplementary(rows: SupplementaryRow[]) {
  const supabase = createServerClient()
  
  // Check admin
  const user = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.data.user.id)
    .single()
  
  if (profile?.role !== 'Admin') {
    throw new Error('Unauthorized')
  }
  
  // Validate
  const { validated, errors } = validateSupplementaryRows(rows)
  
  if (errors.length > 0) {
    return { success: false, errors }
  }
  
  // Insert
  const { data, error } = await supabase
    .from('huong_luong_bo_sung')
    .insert(validated)
  
  if (error) throw error
  
  return { success: true, inserted: data.length }
}
```

**Step 4: Create Component**
```typescript
// components/supplementary/SupplementaryForm.tsx
'use client'

import { importSupplementary } from '@/app/supplementary/actions'
import { useState } from 'react'

export function SupplementaryForm() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  
  async function handleImport() {
    setLoading(true)
    try {
      const result = await importSupplementary(rows)
      if (result.success) {
        alert(`Imported ${result.inserted} records`)
      } else {
        alert(`Errors: ${result.errors.length}`)
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => {
          // Parse Excel file
        }}
      />
      <button onClick={handleImport} disabled={loading}>
        {loading ? 'Importing...' : 'Import'}
      </button>
    </div>
  )
}
```

**Step 5: Add Route**
```typescript
// app/(dashboard)/supplementary/page.tsx
import { SupplementaryForm } from '@/components/supplementary/SupplementaryForm'

export default function SupplementaryPage() {
  return (
    <div>
      <h1>Hưởng lương bổ sung</h1>
      <SupplementaryForm />
    </div>
  )
}
```

**Step 6: Add to Sidebar**
```typescript
// components/dashboard/Sidebar.tsx
const ADMIN_MENU_ITEMS = [
  // ...
  {
    href: '/supplementary',
    label: 'Hưởng lương bổ sung',
    icon: Plus
  }
]
```

---

## 🧪 Debugging & Testing

### Local Development

```bash
# Start dev server
npm run dev

# Watch for build errors
npm run build

# Lint code
npm run lint

# View in browser
# http://localhost:3000
```

### Debug Mode

**Browser DevTools:**
```javascript
// F12 → Console tab

// Check Supabase client
console.log(window.supabaseClient)

// Check user auth
const { data: { user } } = await supabase.auth.getUser()
console.log(user)

// Test Supabase query
const { data, error } = await supabase
  .from('cong_nhan')
  .select('*')
  .limit(1)
console.log(data, error)
```

### Testing Server Actions

**Test in browser console:**
```javascript
// Import action
import { importAttendance } from '/app/import/actions.js'

// Call with test data
const result = await importAttendance({
  rows: [
    { maCongNhan: 'CN001', hoTen: 'Test', ngay: '2026-03-20', trangThai: 'CoMat' }
  ]
})

console.log(result)
```

### Database Debugging

**Supabase SQL Editor:**
```sql
-- Check data
SELECT COUNT(*) FROM cham_cong;

-- Check trigger execution
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;

-- Test RLS policy
SELECT * FROM profiles WHERE role = 'Admin';

-- Manual trigger call
SELECT recalculate_luong_ngay('2026-03-20');
```

### Performance Profiling

**Vercel Analytics:**
- Dashboard → Analytics tab
- View Web Core Vitals
- Track function duration

**Database Queries:**
```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;

-- Add indexes if needed
CREATE INDEX idx_cham_cong_ngay ON cham_cong(ngay);
```

### Testing Recalculation Logic

**Via dev page (manual):**
```
1. Navigate to /dev/test-recalculation
2. Click scenario buttons
3. Verify PASS/FAIL
```

**Via console (automated):**
```bash
# Import test helpers
import { seedScenarioA, verifyDistribution } from '@/lib/testing/seedData'
import { getDaySalaryRows } from '@/lib/testing/verifyRecalculation'

# Run scenario
await seedScenarioA()
const rows = await getDaySalaryRows(new Date('2026-03-20'))
const result = await verifyDistribution(rows, 3, 1000000)
console.log(result)
```

---

## 📚 API Reference - Server Actions

### Import Actions
```typescript
importAttendance(data: ImportData): Promise<ImportResult>
importTickets(data: ImportData): Promise<ImportResult>
importSalary(data: ImportData): Promise<ImportResult>
importDebt(data: ImportData): Promise<ImportResult>
```

### Test Actions
```typescript
runScenarioA(): Promise<ScenarioResult>
runScenarioB(): Promise<ScenarioResult>
runScenarioC(): Promise<ScenarioResult>
runScenarioD(): Promise<ScenarioResult>
```

### Types
```typescript
type ImportResult = {
  success: boolean
  message: string
  rowsInserted: number
  rowsUpdated: number
  rowsSkipped: number
  errors: ValidationError[]
}

type ScenarioResult = {
  name: string
  pass: boolean
  expectedPresentCount: number
  actualPresentCount: number
  expectedPerPerson: number
  rows: DaySalaryRow[]
  salaryMismatches: MismatchRecord[]
}

type DaySalaryRow = {
  cong_nhan_id: string
  ho_ten: string
  status: AttendanceStatus
  so_luong: number
  don_gia: number
  thanh_tien: number
}
```

---

## ✅ Development Checklist

When adding new feature:
- [ ] Create database table + RLS policies
- [ ] Add validation function
- [ ] Create server action
- [ ] Create React component
- [ ] Add route (page.tsx)
- [ ] Update sidebar menu
- [ ] Test locally (npm run dev)
- [ ] Test build (npm run build)
- [ ] Run lint (npm run lint)
- [ ] Add to DEPLOY.md if needs deployment steps
- [ ] Test in staging before production

---

**Phiên bản:** 1.0  
**Cập nhật:** Tháng 3, 2026  
**Maintainer:** Tech Lead
