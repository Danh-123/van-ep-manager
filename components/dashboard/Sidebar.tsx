'use client';

import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  Layers3,
  ScrollText,
  Truck,
  Users,
  UserCog,
  WalletCards,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePermissions } from '@/hooks/usePermissions';
import { useMounted } from '@/hooks/useMounted';
import { vi } from '@/lib/translations/vi';

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
    | 'cham-cong'
    | 'tinh-luong'
    | 'xe-hang'
    | 'loai-van-ep'
    | 'cong-no'
    | 'bao-cao'
    | 'cong-nhan'
    | 'nguoi-dung';
};

const MENU_ITEMS: MenuItem[] = [
  { label: vi.nav.dashboard, href: '/dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { label: vi.nav.attendance, href: '/attendance', icon: ClipboardCheck, resource: 'cham-cong' },
  { label: vi.nav.salary, href: '/salary', icon: WalletCards, resource: 'tinh-luong' },
  { label: vi.nav.trucks, href: '/trucks', icon: Truck, resource: 'xe-hang' },
  { label: vi.nav.woodTypes, href: '/wood-types', icon: Layers3, resource: 'loai-van-ep' },
  { label: vi.nav.debt, href: '/debt', icon: WalletCards, resource: 'cong-no' },
  { label: vi.nav.reports, href: '/reports', icon: BarChart3, resource: 'bao-cao' },
  { label: vi.nav.importExcel, href: '/import', icon: FileUp, resource: 'nguoi-dung' },
  { label: vi.nav.auditLog, href: '/audit-log', icon: ScrollText, resource: 'nguoi-dung' },
  { label: vi.nav.employees, href: '/employees', icon: Users, resource: 'cong-nhan' },
  { label: vi.nav.users, href: '/users', icon: UserCog, resource: 'nguoi-dung' },
  { label: vi.nav.help, href: '/help', icon: HelpCircle, resource: 'dashboard' },
];

const VIEWER_MENU_ITEMS: Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { label: vi.nav.mySalary, href: '/my-salary', icon: WalletCards },
  { label: vi.nav.myAttendance, href: '/my-attendance', icon: CalendarCheck },
  { label: vi.nav.help, href: '/help', icon: HelpCircle },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { canView } = usePermissions(role);

  if (!mounted) {
    return <aside aria-hidden className="hidden w-72 shrink-0 bg-[#1B5E20] md:block" />;
  }

  const visibleItems =
    role === 'Viewer'
      ? VIEWER_MENU_ITEMS
      : MENU_ITEMS.filter((item) => canView(item.resource));

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
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1B5E20] text-white transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:z-auto`}
      >
        <div className="flex h-16 items-center justify-between border-b border-emerald-700/60 px-5">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold tracking-wide">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-300/20 text-sm font-bold text-emerald-100">
              VE
            </span>
            <span>VanEpManager</span>
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

        <nav className="px-3 py-4">
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
      </aside>
    </>
  );
}
