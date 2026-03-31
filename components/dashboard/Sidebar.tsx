'use client';

import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Truck,
  Users,
  UserCog,
  WalletCards,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { signOut } from '@/app/login/actions';
import { usePermissions } from '@/hooks/usePermissions';
import { useMounted } from '@/hooks/useMounted';

import { useSidebar } from './SidebarContext';

type SidebarProps = {
  role: string | null;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  resource:
    | 'dashboard'
    | 'attendance'
    | 'salary'
    | 'trucks'
    | 'debt'
    | 'reports'
    | 'employees'
    | 'users'
    | 'my-salary'
    | 'my-attendance'
    | 'my-debt';
  /** Các role được phép xem menu item này */
  allowedRoles?: ('Admin' | 'KeToan' | 'Viewer')[];
};

/**
 * Menu items cho Admin và Kế toán
 * - Chấm công: chỉ Admin và Kế toán
 * - Tính lương: chỉ Admin và Kế toán
 */
const ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { label: 'Chấm công', href: '/attendance', icon: ClipboardCheck, resource: 'attendance', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Tính lương', href: '/salary', icon: WalletCards, resource: 'salary', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Xe hàng', href: '/trucks', icon: Truck, resource: 'trucks', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Công nợ', href: '/debt', icon: WalletCards, resource: 'debt', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Báo cáo', href: '/reports', icon: BarChart3, resource: 'reports', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Danh sách', href: '/employees', icon: Users, resource: 'employees', allowedRoles: ['Admin', 'KeToan'] },
  { label: 'Người dùng', href: '/users', icon: UserCog, resource: 'users', allowedRoles: ['Admin'] },
];

/**
 * Menu items cho Viewer (Công nhân)
 * - Lương của tôi: chỉ Viewer (với điều kiện liên kết)
 * - Chấm công của tôi: chỉ Viewer (với điều kiện liên kết)
 * - Công nợ của tôi: chỉ Viewer (với điều kiện liên kết)
 */
const VIEWER_MENU_ITEMS: MenuItem[] = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard, resource: 'dashboard', allowedRoles: ['Viewer'] },
  { label: 'Lương của tôi', href: '/my-salary', icon: WalletCards, resource: 'my-salary', allowedRoles: ['Viewer'] },
  { label: 'Chấm công của tôi', href: '/my-attendance', icon: CalendarCheck, resource: 'my-attendance', allowedRoles: ['Viewer'] },
  { label: 'Công nợ của tôi', href: '/my-debt', icon: WalletCards, resource: 'my-debt', allowedRoles: ['Viewer'] },
];

type SidebarUserState = {
  user: {
    role: 'Admin' | 'KeToan' | 'Viewer';
  };
  hasWorkerLink: boolean;
  hasCustomerLink: boolean;
  checkingLinks: boolean;
};

function normalizeRole(role: string | null | undefined): 'Admin' | 'KeToan' | 'Viewer' {
  if (role === 'Admin' || role === 'KeToan' || role === 'Viewer') {
    return role;
  }

  return 'Viewer';
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function useUser(initialRole: string | null) {
  const role = normalizeRole(initialRole);
  const [userState, setUserState] = useState<SidebarUserState>({
    user: { role },
    hasWorkerLink: false,
    hasCustomerLink: false,
    checkingLinks: role === 'Viewer',
  });

  useEffect(() => {
    setUserState({
      user: { role },
      hasWorkerLink: false,
      hasCustomerLink: false,
      checkingLinks: role === 'Viewer',
    });

    if (role !== 'Viewer') {
      return;
    }

    let cancelled = false;

    const loadLinkedState = async () => {
      try {
        const month = getCurrentMonth();
        const [salaryRes, debtRes] = await Promise.all([
          fetch(`/api/my-salary?month=${month}`, { method: 'GET', cache: 'no-store' }),
          fetch('/api/my-debt', { method: 'GET', cache: 'no-store' }),
        ]);

        const salaryPayload = (await salaryRes.json().catch(() => ({}))) as { linked?: boolean };
        const debtPayload = (await debtRes.json().catch(() => ({}))) as { linked?: boolean };

        if (cancelled) return;

        setUserState({
          user: { role },
          hasWorkerLink: salaryPayload.linked === true,
          hasCustomerLink: debtPayload.linked === true,
          checkingLinks: false,
        });
      } catch {
        if (cancelled) return;
        setUserState({
          user: { role },
          hasWorkerLink: false,
          hasCustomerLink: false,
          checkingLinks: false,
        });
      }
    };

    void loadLinkedState();

    return () => {
      cancelled = true;
    };
  }, [role]);

  return userState;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const user = useUser(role);
  const [isSigningOut, startSignOut] = useTransition();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { canView, isViewer } = usePermissions(user.user.role);

  if (!mounted) {
    return <aside aria-hidden className="hidden w-72 shrink-0 bg-[#1B5E20] md:block" />;
  }

  /**
   * Xác định danh sách menu items dựa trên role
   * - Viewer: Chỉ xem Lương của tôi, Chấm công của tôi, Công nợ của tôi
   * - Admin/KeToan: Xem tất cả menu quản lý
   */
  let visibleItems: MenuItem[] = [];

  if (isViewer) {
    // Menu cho Viewer (Công nhân)
    visibleItems = VIEWER_MENU_ITEMS.filter((item) => {
      // Kiểm tra role được phép
      if (item.allowedRoles && !item.allowedRoles.includes('Viewer')) {
        return false;
      }

      // Kiểm tra quyền truy cập từ permission system
      if (!canView(item.resource)) {
        return false;
      }

      // Kiểm tra nếu menu liên quan đến dữ liệu cá nhân, cần có liên kết
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
      // Kiểm tra role được phép
      if (item.allowedRoles && !item.allowedRoles.includes(user.user.role)) {
        return false;
      }

      // Kiểm tra quyền truy cập từ permission system
      return canView(item.resource);
    });
  }

  const handleSignOut = () => {
    startSignOut(async () => {
      const result = await signOut();
      if (!result.success) {
        return;
      }

      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1B5E20] text-white transition-transform duration-300 md:top-0 md:h-screen md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-emerald-700/60 px-5">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold tracking-wide">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-300/20 text-sm font-bold text-emerald-100">
              TT
            </span>
            <span>Toàn Tâm Phát</span>
          </Link>

          <button
            type="button"
            className="rounded-md p-1.5 text-emerald-100 hover:bg-emerald-800/70 md:hidden"
            onClick={closeSidebar}
            aria-label="Đóng thanh điều hướng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col">
          <nav className="px-3 py-4">
            {isViewer && !user.checkingLinks && !user.hasWorkerLink && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-100/95 px-3 py-2 text-xs font-medium text-amber-900">
                Chưa liên kết tài khoản. Vui lòng liên hệ Admin.
              </div>
            )}
          <ul className="space-y-1.5">
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-[#1B5E20]'
                        : 'text-emerald-50 hover:bg-emerald-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#1B5E20]' : 'text-emerald-200'}`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          </nav>

          <div className="mt-auto border-t border-emerald-700/60 p-3">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-50 hover:bg-emerald-800/70 hover:text-white disabled:opacity-60"
            >
              <LogOut className="h-4 w-4 text-emerald-200" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
