import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

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

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await ensureAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { userId } = await context.params;
  if (!userId || userId.length < 10) {
    return NextResponse.json({ success: false, error: 'ID tài khoản không hợp lệ' }, { status: 400 });
  }

  const [workerClear, customerClear] = await Promise.all([
    access.supabase.from('cong_nhan').update({ user_id: null }).eq('user_id', userId),
    access.supabase.from('khach_hang').update({ user_id: null }).eq('user_id', userId),
  ]);

  if (workerClear.error) {
    return NextResponse.json({ success: false, error: workerClear.error.message }, { status: 500 });
  }

  if (customerClear.error) {
    return NextResponse.json({ success: false, error: customerClear.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Đã hủy liên kết tài khoản' });
}
