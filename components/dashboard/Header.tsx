'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, Menu, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';

import { signOut } from '@/app/login/actions';

import { useSidebar } from './SidebarContext';

type HeaderProps = {
  fullName: string;
  role: string;
};

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function Header({ fullName, role }: HeaderProps) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const initials = useMemo(() => buildInitials(fullName), [fullName]);

  const handleSignOut = () => {
    startTransition(async () => {
      const result = await signOut();
      if (!result.success) {
        return;
      }
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <p className="text-sm font-semibold text-slate-900">VanEpManager</p>
          <p className="text-xs text-slate-500">Dashboard</p>
        </div>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-2.5 py-1.5 text-left hover:bg-slate-50"
            type="button"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-[#1B5E20]">
              {initials}
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold text-slate-900">{fullName}</span>
              <span className="block text-xs text-slate-500">{role}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="end"
            className="z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-50"
              onSelect={() => router.push('/profile')}
            >
              <UserCircle2 className="h-4 w-4" />
              Thong tin ca nhan
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
            <DropdownMenu.Item
              disabled={isPending}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              onSelect={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Dang xuat
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
