import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

async function ensureAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Bạn chưa đăng nhập' };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role !== 'Admin') {
    return { ok: false as const, status: 403, error: 'Chỉ Admin mới có quyền truy cập chức năng này' };
  }

  return { ok: true as const, supabase };
}

export async function GET() {
  const access = await ensureAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const workersResult = await access.supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai')
    .is('user_id', null)
    .order('created_at', { ascending: false });

  if (workersResult.error) {
    return NextResponse.json({ success: false, error: workersResult.error.message }, { status: 500 });
  }

  const data = ((workersResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    id: Number(row.id ?? 0),
    maCongNhan: String(row.ma_cong_nhan ?? ''),
    hoTen: String(row.ho_ten ?? ''),
    soDienThoai: String(row.so_dien_thoai ?? ''),
  }));

  return NextResponse.json({ success: true, data });
}
