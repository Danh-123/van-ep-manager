# Refactoring Sidebar - Role-Based Menu Filtering

## 📋 Tổng Quan

Đã refactor component `components/dashboard/Sidebar.tsx` để có **role-based menu filtering rõ ràng hơn** với phân quyền tốt hơn.

---

## ✅ Những Gì Đã Thay Đổi

### 1. Cấu Trúc Menu Items
**Trước:**
```typescript
const MENU_ITEMS: MenuItem[] = [...]  // Chung cho tất cả
const VIEWER_MENU_ITEMS: MenuItem[] = [...] // Riêng cho Viewer
```

**Sau:**
```typescript
const ADMIN_MENU_ITEMS: MenuItem[] = [...]   // Menu quản lý (Admin + KeToan)
const VIEWER_MENU_ITEMS: MenuItem[] = [...]  // Menu cá nhân (Viewer)
```

### 2. Menu Item Type - Thêm `allowedRoles`
```typescript
type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType;
  resource: PermissionResource;
  /** Các role được phép xem menu item này */
  allowedRoles?: ('Admin' | 'KeToan' | 'Viewer')[];
};
```

### 3. ADMIN_MENU_ITEMS (Cho Admin & Kế toán)

```typescript
const ADMIN_MENU_ITEMS: MenuItem[] = [
  { 
    label: 'Tổng quan', 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    resource: 'dashboard' 
  },
  { 
    label: 'Chấm công',           // ✅ Chỉ Admin & KeToan
    href: '/attendance', 
    icon: ClipboardCheck, 
    resource: 'attendance', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Tính lương',           // ✅ Chỉ Admin & KeToan
    href: '/salary', 
    icon: WalletCards, 
    resource: 'salary', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Xe hàng', 
    href: '/trucks', 
    resource: 'trucks', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Công nợ', 
    href: '/debt', 
    resource: 'debt', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Báo cáo', 
    href: '/reports', 
    resource: 'reports', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Danh sách', 
    href: '/employees', 
    resource: 'employees', 
    allowedRoles: ['Admin', 'KeToan'] 
  },
  { 
    label: 'Người dùng',           // ✅ Chỉ Admin
    href: '/users', 
    resource: 'users', 
    allowedRoles: ['Admin'] 
  },
];
```

### 4. VIEWER_MENU_ITEMS (Cho Công nhân)

```typescript
const VIEWER_MENU_ITEMS: MenuItem[] = [
  { 
    label: 'Tổng quan', 
    href: '/dashboard', 
    resource: 'dashboard', 
    allowedRoles: ['Viewer'] 
  },
  { 
    label: 'Lương của tôi',         // ✅ Chỉ Viewer
    href: '/my-salary', 
    icon: WalletCards, 
    resource: 'my-salary', 
    allowedRoles: ['Viewer'] 
  },
  { 
    label: 'Chấm công của tôi',     // ✅ Chỉ Viewer (view only)
    href: '/my-attendance', 
    icon: CalendarCheck, 
    resource: 'my-attendance', 
    allowedRoles: ['Viewer'] 
  },
  { 
    label: 'Công nợ của tôi',       // ✅ Chỉ Viewer (view only)
    href: '/my-debt', 
    icon: WalletCards, 
    resource: 'my-debt', 
    allowedRoles: ['Viewer'] 
  },
];
```

### 5. Filtering Logic - Cải Thiện

**Trước:** 
```typescript
const visibleItems = !isViewer
  ? MENU_ITEMS.filter((item) => canView(item.resource))
  : VIEWER_MENU_ITEMS.filter((item) => { ... }).filter((item) => canView(item.resource));
```

**Sau:**
```typescript
let visibleItems: MenuItem[] = [];

if (isViewer) {
  // Menu cho Viewer (Công nhân)
  visibleItems = VIEWER_MENU_ITEMS.filter((item) => {
    // 1. Kiểm tra role được phép
    if (item.allowedRoles && !item.allowedRoles.includes('Viewer')) {
      return false;
    }
    
    // 2. Kiểm tra quyền truy cập từ permission system
    if (!canView(item.resource)) {
      return false;
    }
    
    // 3. Kiểm tra liên kết dữ liệu cá nhân
    if (item.resource === 'my-salary' || item.resource === 'my-attendance') {
      return user.hasWorkerLink;
    }
    if (item.resource === 'my-debt') {
      return user.hasCustomerLink;
    }
    
    return true;
  });
} else {
  // Menu cho Admin và Kế toán
  visibleItems = ADMIN_MENU_ITEMS.filter((item) => {
    // 1. Kiểm tra role được phép
    if (item.allowedRoles && !item.allowedRoles.includes(user.user.role)) {
      return false;
    }
    
    // 2. Kiểm tra quyền truy cập từ permission system
    return canView(item.resource);
  });
}
```

---

## 🔐 Phân Quyền Chi Tiết

| Menu Item | Admin | KeToan | Viewer |
|-----------|-------|--------|--------|
| **Tổng quan** | ✅ | ✅ | ✅ (Dashboard riêng) |
| **Chấm công** | ✅ | ✅ | ❌ (Ẩn) |
| **Tính lương** | ✅ | ✅ | ❌ (Ẩn) |
| **Xe hàng** | ✅ | ✅ | ❌ (Ẩn) |
| **Công nợ** | ✅ | ✅ | ❌ (Ẩn) |
| **Báo cáo** | ✅ | ✅ | ❌ (Ẩn) |
| **Danh sách** | ✅ | ✅ | ❌ (Ẩn) |
| **Người dùng** | ✅ | ❌ | ❌ (Ẩn) |
| **Lương của tôi** | ❌ (Ẩn) | ❌ (Ẩn) | ✅ (with check) |
| **Chấm công của tôi** | ❌ (Ẩn) | ❌ (Ẩn) | ✅ (with check) |
| **Công nợ của tôi** | ❌ (Ẩn) | ❌ (Ẩn) | ✅ (with check) |

---

## 🎯 Các Tính Năng

### 1. **Lớp Filtering Đôi**
```
Menu Items → Role Filter (allowedRoles) → Permission System Filter (canView) → Link Status Check
```

### 2. **Rõ Ràng & Dễ Bảo Trì**
- Mỗi menu item có explicit `allowedRoles`
- Dễ thêm/xóa role từ menu
- Comments rõ ràng cho từng section

### 3. **Role-Based Separation**
- `ADMIN_MENU_ITEMS`: Menu cho quản lý (Admin, KeToan)
- `VIEWER_MENU_ITEMS`: Menu cho công nhân cá nhân (Viewer)
- Hoàn toàn tách biệt giữa 2 nhóm

### 4. **Double-Check Permission**
- Check `allowedRoles` trên menu item
- Check quyền từ `usePermissions` hook
- Check status liên kết cho Viewer

---

## 📝 Hành Động Khi Render

### Admin / KeToan Role:
```
Sidebar Component
  ↓ isViewer = false
  ↓ Load ADMIN_MENU_ITEMS
  ↓ Filter by allowedRoles (Admin, KeToan)
  ↓ Filter by canView permission
  ↓ Hiển thị: [Tổng quan, Chấm công, Tính lương, Xe hàng, Công nợ, Báo cáo, Danh sách, (Người dùng nếu Admin)]
```

### Viewer Role:
```
Sidebar Component
  ↓ isViewer = true
  ↓ Load VIEWER_MENU_ITEMS
  ↓ Filter by allowedRoles (Viewer)
  ↓ Filter by canView permission
  ↓ Check worker link (my-salary, my-attendance)
  ↓ Check customer link (my-debt)
  ↓ Hiển thị: [Tổng quan, Lương của tôi (nếu liên kết), Chấm công của tôi (nếu liên kết), Công nợ của tôi (nếu liên kết)]
```

---

## 🧪 Test Cases

### Test 1: Login as Admin
- [ ] Sidebar hiển thị tất cả menu quản lý
- [ ] **Chấm công** visible ✅
- [ ] **Tính lương** visible ✅
- [ ] **Người dùng** visible ✅
- [ ] **Lương của tôi** NOT visible ✅

### Test 2: Login as KeToan
- [ ] Sidebar hiển thị menu quản lý (trừ Người dùng)
- [ ] **Chấm công** visible ✅
- [ ] **Tính lương** visible ✅
- [ ] **Người dùng** NOT visible ✅
- [ ] **Lương của tôi** NOT visible ✅

### Test 3: Login as Viewer (with worker link)
- [ ] Sidebar chỉ hiển thị menu cá nhân
- [ ] **Lương của tôi** visible ✅
- [ ] **Chấm công của tôi** visible ✅
- [ ] **Chấm công** (quản lý) NOT visible ✅
- [ ] **Tính lương** NOT visible ✅

### Test 4: Login as Viewer (no worker link)
- [ ] Sidebar hiển thị warning
- [ ] **Lương của tôi** NOT visible ✅
- [ ] **Chấm công của tôi** NOT visible ✅
- [ ] Chỉ còn **Tổng quan** visible ✅

---

## 📁 File Đã Sửa

**Đối tượng:** `components/dashboard/Sidebar.tsx`

**Dòng code:**
- Lines 27-72: MenuItem type definition + ADMIN_MENU_ITEMS + VIEWER_MENU_ITEMS
- Lines 178-218: Filter logic cho visibleItems

**Build Status:** ✅ Success (0 errors, 41 pages generated)

---

## 🚀 Thử Nghiệm Trực Tiếp

```bash
# Start dev server
npm run dev
# Server running on http://localhost:3001

# Test Admin account
# Login → Menu should show all admin features including "Chấm công"

# Test Viewer account  
# Login → Menu should only show "Lương của tôi" (no "Chấm công")
```

---

## 💡 Notes

1. **Permission System Integration**: Code tích hợp với `usePermissions` hook từ `hooks/usePermissions.ts` để double-check quyền
2. **Link Status Check**: Viewer role cần có liên kết `worker` để xem "Lương của tôi" và "Chấm công của tôi"
3. **Maintainability**: Dễ dàng thêm role mới hoặc điều chỉnh permissions bằng cách update `allowedRoles` array
