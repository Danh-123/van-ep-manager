import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const bodySchema = z
  .object({
    type: z.enum(['worker', 'customer']),
    targetId: z.number().int().positive(),
  })
  .strict();

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

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await ensureAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { userId } = await context.params;
  if (!userId || userId.length < 10) {
    return NextResponse.json({ success: false, error: 'ID tài khoản không hợp lệ' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  const profileResult = await access.supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json({ success: false, error: profileResult.error.message }, { status: 500 });
  }

  if (!profileResult.data) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy tài khoản' }, { status: 404 });
  }

  const clearOpposite = async () => {
    if (parsed.data.type === 'worker') {
      const clearCustomers = await access.supabase.from('khach_hang').update({ user_id: null }).eq('user_id', userId);
      return clearCustomers.error?.message ?? null;
    }

    const clearWorkers = await access.supabase.from('cong_nhan').update({ user_id: null }).eq('user_id', userId);
    return clearWorkers.error?.message ?? null;
  };

  const clearError = await clearOpposite();
  if (clearError) {
    return NextResponse.json({ success: false, error: clearError }, { status: 500 });
  }

  if (parsed.data.type === 'worker') {
    const targetCheck = await access.supabase
      .from('cong_nhan')
      .select('id, user_id')
      .eq('id', parsed.data.targetId)
      .maybeSingle();

    if (targetCheck.error) {
      return NextResponse.json({ success: false, error: targetCheck.error.message }, { status: 500 });
    }

    if (!targetCheck.data) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy công nhân để liên kết' }, { status: 404 });
    }

    const typedTarget = targetCheck.data as { user_id: string | null };
    if (typedTarget.user_id && typedTarget.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Công nhân này đã liên kết với tài khoản khác' }, { status: 409 });
    }

    const detachOldWorker = await access.supabase.from('cong_nhan').update({ user_id: null }).eq('user_id', userId);
    if (detachOldWorker.error) {
      return NextResponse.json({ success: false, error: detachOldWorker.error.message }, { status: 500 });
    }

    const updateWorker = await access.supabase
      .from('cong_nhan')
      .update({ user_id: userId })
      .eq('id', parsed.data.targetId);

    if (updateWorker.error) {
      return NextResponse.json({ success: false, error: updateWorker.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Liên kết tài khoản với công nhân thành công' });
  }

  const targetCheck = await access.supabase
    .from('khach_hang')
    .select('id, user_id')
    .eq('id', parsed.data.targetId)
    .maybeSingle();

  if (targetCheck.error) {
    return NextResponse.json({ success: false, error: targetCheck.error.message }, { status: 500 });
  }

  if (!targetCheck.data) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng để liên kết' }, { status: 404 });
  }

  const typedTarget = targetCheck.data as { user_id: string | null };
  if (typedTarget.user_id && typedTarget.user_id !== userId) {
    return NextResponse.json({ success: false, error: 'Khách hàng này đã liên kết với tài khoản khác' }, { status: 409 });
  }

  const detachOldCustomer = await access.supabase.from('khach_hang').update({ user_id: null }).eq('user_id', userId);
  if (detachOldCustomer.error) {
    return NextResponse.json({ success: false, error: detachOldCustomer.error.message }, { status: 500 });
  }

  const updateCustomer = await access.supabase
    .from('khach_hang')
    .update({ user_id: userId })
    .eq('id', parsed.data.targetId);

  if (updateCustomer.error) {
    return NextResponse.json({ success: false, error: updateCustomer.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Liên kết tài khoản với khách hàng thành công' });
}
