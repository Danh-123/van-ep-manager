'use client';

import { Building2, Link, User } from 'lucide-react';
import { LinkedTo } from '@/types/user';

interface LinkBadgeProps {
  linkedTo: LinkedTo | null;
}

export default function LinkBadge({ linkedTo }: LinkBadgeProps) {
  if (linkedTo?.type === 'worker') {
    const badgeText = `Công nhân: ${linkedTo.name} (${linkedTo.code})`;
    return (
      <div className="group relative inline-flex">
        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: '#10B981' }}>
          <User className="h-3.5 w-3.5" />
          <span>Công nhân</span>
        </div>

        {/* Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
          {badgeText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      </div>
    );
  }

  if (linkedTo?.type === 'customer') {
    const badgeText = `Khách hàng: ${linkedTo.name} (${linkedTo.code})`;
    return (
      <div className="group relative inline-flex">
        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: '#8B5CF6' }}>
          <Building2 className="h-3.5 w-3.5" />
          <span>Khách hàng</span>
        </div>

        {/* Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
          {badgeText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative inline-flex">
      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: '#6B7280' }}>
        <Link className="h-3.5 w-3.5" />
        <span>Chưa liên kết</span>
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
        Chưa liên kết với công nhân hoặc khách hàng
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
