import { NextRequest, NextResponse } from 'next/server';

import { calculateDailySalaryDetails } from '@/lib/salary/calculateDailySalary';
import { createClient } from '@/lib/supabase/server';

function parseWorkerId(raw: string | null) {
  const parsed = Number(raw ?? '');
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function isValidMonth(value: string | null) {
  return !!value && /^\d{4}-\d{2}$/.test(value);
}

async function ensureManagerAccess() {
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

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập chức năng tính lương' };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const workerId = parseWorkerId(url.searchParams.get('workerId'));
  const monthParam = url.searchParams.get('month');

  if (!workerId) {
    return NextResponse.json({ error: 'workerId không hợp lệ' }, { status: 400 });
  }

  if (!monthParam || !isValidMonth(monthParam)) {
    return NextResponse.json({ error: 'month không hợp lệ, định dạng đúng là YYYY-MM' }, { status: 400 });
  }

  try {
    const payload = await calculateDailySalaryDetails(workerId, monthParam);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tải chi tiết lương công nhân' },
      { status: 500 },
    );
  }
}
