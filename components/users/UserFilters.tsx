'use client';

import { type LinkStatus, type RoleFilter } from '@/hooks/useUserFilters';

type UserFiltersProps = {
  search: string;
  role: RoleFilter;
  linkStatus: LinkStatus;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: RoleFilter) => void;
  onLinkStatusChange: (value: LinkStatus) => void;
  onClear: () => void;
};

export default function UserFilters({
  search,
  role,
  linkStatus,
  onSearchChange,
  onRoleChange,
  onLinkStatusChange,
  onClear,
}: UserFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo email hoặc họ tên..."
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />

        <select
          value={role}
          onChange={(event) => onRoleChange(event.target.value as RoleFilter)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Admin">Admin</option>
          <option value="KeToan">Kế toán</option>
          <option value="Viewer">Viewer</option>
        </select>

        <select
          value={linkStatus}
          onChange={(event) => onLinkStatusChange(event.target.value as LinkStatus)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        >
          <option value="all">Tất cả liên kết</option>
          <option value="linked">Đã liên kết</option>
          <option value="unlinked">Chưa liên kết</option>
        </select>

        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
      </div>
    </section>
  );
}
