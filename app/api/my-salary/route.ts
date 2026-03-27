import { addMonths, format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type SalaryRow = {
  thang: string;
  luong_co_ban: number;
  thuong: number;
  phat: number;
  tong_luong: number;
  ho_ten: string;
  ma_cong_nhan: string;
};

type EmployeeInfo = {
  ho_ten: string;
  ma_cong_nhan: string;
  so_dien_thoai: string;
  email: string;
  created_at: string;
};

function isValidMonth(value: string | null) {
  return !!value && /^\d{4}-\d{2}$/.test(value);
}

function monthStart(month: string) {
  return `${month}-01`;
}

function monthEndExclusive(month: string) {
  return format(addMonths(new Date(monthStart(month)), 1), 'yyyy-MM-dd');
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Ban chua dang nhap' }, { status: 401 });
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: 'Khong the xac thuc quyen truy cap' }, { status: 403 });
  }

  if (profileResult.data.role !== 'Viewer') {
    return NextResponse.json({ error: 'Chi Viewer moi duoc xem luong ca nhan' }, { status: 403 });
  }

  const workerResult = await supabase
    .from('cong_nhan')
    .select('id, ho_ten, ma_cong_nhan, so_dien_thoai, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (workerResult.error) {
    return NextResponse.json({ error: workerResult.error.message }, { status: 500 });
  }

  if (!workerResult.data) {
    return NextResponse.json(
      {
        data: [],
        linked: false,
        message: 'Tài khoản chưa được liên kết với công nhân. Vui lòng liên hệ Admin.',
      },
      { status: 200 },
    );
  }

  const worker = workerResult.data as {
    ho_ten: string;
    ma_cong_nhan: string;
    so_dien_thoai: string | null;
    created_at: string;
  };

  const employee: EmployeeInfo = {
    ho_ten: worker.ho_ten,
    ma_cong_nhan: worker.ma_cong_nhan,
    so_dien_thoai: worker.so_dien_thoai ?? '',
    email: (profileResult.data.email as string | null) ?? '',
    created_at: worker.created_at,
  };

  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  const fromMonth = url.searchParams.get('fromMonth');
  const toMonth = url.searchParams.get('toMonth');

  const hasSingleMonth = isValidMonth(month);
  const hasRange = isValidMonth(fromMonth) && isValidMonth(toMonth);

  if (!hasSingleMonth && !hasRange) {
    return NextResponse.json(
      { error: 'Can truyen month=YYYY-MM hoac fromMonth=YYYY-MM&toMonth=YYYY-MM' },
      { status: 400 },
    );
  }

  let fromStart = '';
  let toEndExclusive = '';

  if (hasSingleMonth && month) {
    fromStart = monthStart(month);
    toEndExclusive = monthEndExclusive(month);
  } else if (fromMonth && toMonth) {
    if (fromMonth > toMonth) {
      return NextResponse.json({ error: 'fromMonth phai nho hon hoac bang toMonth' }, { status: 400 });
    }

    fromStart = monthStart(fromMonth);
    toEndExclusive = monthEndExclusive(toMonth);
  }

  const salaryResult = await supabase
    .from('view_luong_ca_nhan')
    .select('thang, luong_co_ban, thuong, phat, tong_luong, ho_ten, ma_cong_nhan')
    .eq('user_id', user.id)
    .gte('thang', fromStart)
    .lt('thang', toEndExclusive)
    .order('thang', { ascending: true });

  if (salaryResult.error) {
    return NextResponse.json({ error: salaryResult.error.message }, { status: 500 });
  }

  const rows: SalaryRow[] = ((salaryResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    thang: String(row.thang ?? month ?? fromMonth ?? ''),
    luong_co_ban: toNumber(row.luong_co_ban),
    thuong: toNumber(row.thuong),
    phat: toNumber(row.phat),
    tong_luong: toNumber(row.tong_luong),
    ho_ten: String(row.ho_ten ?? worker.ho_ten),
    ma_cong_nhan: String(row.ma_cong_nhan ?? worker.ma_cong_nhan),
  }));

  return NextResponse.json({
    data: rows,
    total: rows.length,
    linked: true,
    ho_ten: worker.ho_ten,
    ma_cong_nhan: worker.ma_cong_nhan,
    employee,
  });
}
