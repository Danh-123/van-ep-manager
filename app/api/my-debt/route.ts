import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type DebtRow = {
  id: number;
  ngay: string;
  so_phieu: string;
  so_tan: number;
  don_gia: number;
  thanh_tien: number;
  thanh_toan: number;
  con_lai: number;
  ten_khach_hang: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
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
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: 'Khong the xac thuc quyen truy cap' }, { status: 403 });
  }

  if (profileResult.data.role !== 'Viewer') {
    return NextResponse.json({ error: 'Chi Viewer moi duoc xem cong no ca nhan' }, { status: 403 });
  }

  const workerResult = await supabase.from('cong_nhan').select('id').eq('user_id', user.id).limit(1).maybeSingle();

  if (workerResult.error) {
    return NextResponse.json({ error: workerResult.error.message }, { status: 500 });
  }

  if (workerResult.data) {
    return NextResponse.json(
      {
        linked: false,
        userType: 'worker',
        message: 'Tai khoan nay thuoc Cong nhan, vui long su dung man hinh Luong cua toi.',
        data: [],
        totalDebt: 0,
      },
      { status: 200 },
    );
  }

  const customerResult = await supabase
    .from('khach_hang')
    .select('id, ten_khach_hang')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (customerResult.error) {
    return NextResponse.json({ error: customerResult.error.message }, { status: 500 });
  }

  if (!customerResult.data) {
    return NextResponse.json(
      {
        data: [],
        linked: false,
        userType: 'unknown',
        totalDebt: 0,
        message: 'Tài khoản chưa được liên kết với khách hàng. Vui lòng liên hệ Admin.',
      },
      { status: 200 },
    );
  }

  const debtResult = await supabase
    .from('view_cong_no_ca_nhan')
    .select('id, ngay, so_phieu, so_tan, don_gia, thanh_tien, thanh_toan, con_lai, ten_khach_hang')
    .eq('user_id', user.id)
    .gt('con_lai', 0)
    .order('ngay', { ascending: false })
    .order('id', { ascending: false });

  if (debtResult.error) {
    return NextResponse.json({ error: debtResult.error.message }, { status: 500 });
  }

  const rows: DebtRow[] = ((debtResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    id: toNumber(row.id),
    ngay: String(row.ngay ?? ''),
    so_phieu: String(row.so_phieu ?? '-'),
    so_tan: toNumber(row.so_tan),
    don_gia: toNumber(row.don_gia),
    thanh_tien: toNumber(row.thanh_tien),
    thanh_toan: toNumber(row.thanh_toan),
    con_lai: toNumber(row.con_lai),
    ten_khach_hang: String(
      row.ten_khach_hang ?? (customerResult.data as { ten_khach_hang: string }).ten_khach_hang ?? 'Khach hang',
    ),
  }));

  const totalDebt = rows.reduce((sum, row) => sum + row.con_lai, 0);

  return NextResponse.json({
    linked: true,
    userType: 'customer',
    customerName: (customerResult.data as { ten_khach_hang: string }).ten_khach_hang,
    data: rows,
    totalDebt,
  });
}
