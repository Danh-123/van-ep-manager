import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  user_id: z.string().uuid('user_id khong hop le'),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function ensureManagerAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen cap nhat lien ket' };
  }

  return { ok: true as const, supabase };
}

function parseEmployeeId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { id: rawId } = await context.params;
  const employeeId = parseEmployeeId(rawId);

  if (!employeeId) {
    return NextResponse.json({ success: false, error: 'ID cong nhan khong hop le' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' },
      { status: 400 },
    );
  }

  const currentLink = await access.supabase
    .from('cong_nhan')
    .select('id, user_id')
    .eq('id', employeeId)
    .maybeSingle();

  if (currentLink.error) {
    return NextResponse.json({ success: false, error: currentLink.error.message }, { status: 500 });
  }

  if (!currentLink.data) {
    return NextResponse.json({ success: false, error: 'Khong tim thay cong nhan' }, { status: 404 });
  }

  const linkedElsewhere = await access.supabase
    .from('cong_nhan')
    .select('id, ho_ten')
    .eq('user_id', parsed.data.user_id)
    .neq('id', employeeId)
    .maybeSingle();

  if (linkedElsewhere.error) {
    return NextResponse.json({ success: false, error: linkedElsewhere.error.message }, { status: 500 });
  }

  if (linkedElsewhere.data) {
    return NextResponse.json(
      { success: false, error: 'Tai khoan nay da duoc lien ket voi cong nhan khac' },
      { status: 409 },
    );
  }

  const updateResult = await access.supabase
    .from('cong_nhan')
    .update({ user_id: parsed.data.user_id })
    .eq('id', employeeId);

  if (updateResult.error) {
    return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { id: rawId } = await context.params;
  const employeeId = parseEmployeeId(rawId);

  if (!employeeId) {
    return NextResponse.json({ success: false, error: 'ID cong nhan khong hop le' }, { status: 400 });
  }

  const updateResult = await access.supabase
    .from('cong_nhan')
    .update({ user_id: null })
    .eq('id', employeeId);

  if (updateResult.error) {
    return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
