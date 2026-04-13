import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const customerQuerySchema = z.object({
  loaiKhachHang: z.enum(['mua', 'ban']).optional(),
});

function resolveCustomerCode(customer: Record<string, unknown>) {
  return (
    (customer.ma_khach_hang as string | undefined) ??
    (customer.ma as string | undefined) ??
    (customer.code as string | undefined) ??
    `KH${String(customer.id ?? '').trim()}`
  );
}

function resolveCustomerName(customer: Record<string, unknown>) {
  return (
    (customer.ten_khach_hang as string | undefined) ??
    (customer.ten as string | undefined) ??
    (customer.name as string | undefined) ??
    (customer.ho_ten as string | undefined) ??
    ''
  );
}

async function ensureAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error || !profile.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profile.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen truy cap du lieu khach hang' };
  }

  return { ok: true as const, supabase };
}

export async function GET(request: Request) {
  const access = await ensureAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const filters = customerQuerySchema.safeParse({
    loaiKhachHang: url.searchParams.get('loaiKhachHang') ?? undefined,
  });

  if (!filters.success) {
    return NextResponse.json(
      { success: false, error: filters.error.issues[0]?.message ?? 'Tham số không hợp lệ' },
      { status: 400 },
    );
  }

  let query = access.supabase.from('khach_hang').select('*').order('ten_khach_hang', { ascending: true });

  if (filters.data.loaiKhachHang) {
    query = query.eq('loai_khach_hang', filters.data.loaiKhachHang);
  }

  const result = await query;

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
  }

  const data = (result.data ?? [])
    .map((row) => {
      const typed = row as Record<string, unknown>;
      const id = Number(typed.id);
      const code = resolveCustomerCode(typed).trim();
      const name = resolveCustomerName(typed).trim();

      if (!Number.isInteger(id) || id <= 0 || !name) {
        return null;
      }

      return { id, code, name };
    })
    .filter((row): row is { id: number; code: string; name: string } => row !== null);

  return NextResponse.json({ success: true, data });
}
