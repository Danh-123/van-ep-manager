import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type DebtRow = {
  id: number;
  ngay: string;
  bien_so_xe: string;
  so_tan: number;
  don_gia: number;
  thanh_tien: number;
  cong_no: number;
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
        message: 'Tài khoản chưa được liên kết với khách hàng. Vui lòng liên hệ Admin.',
      },
      { status: 200 },
    );
  }

  const debtResult = await supabase
    .from('view_cong_no_ca_nhan')
    .select('id, ngay, bien_so_xe, so_tan, don_gia, thanh_tien, cong_no, thanh_toan, con_lai, ten_khach_hang')
    .eq('user_id', user.id)
    .order('ngay', { ascending: false })
    .order('id', { ascending: false });

  if (debtResult.error) {
    return NextResponse.json({ error: debtResult.error.message }, { status: 500 });
  }

  const rows: DebtRow[] = ((debtResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    id: toNumber(row.id),
    ngay: String(row.ngay ?? ''),
    bien_so_xe: String(row.bien_so_xe ?? '-'),
    so_tan: toNumber(row.so_tan),
    don_gia: toNumber(row.don_gia),
    thanh_tien: toNumber(row.thanh_tien),
    cong_no: toNumber(row.cong_no),
    thanh_toan: toNumber(row.thanh_toan),
    con_lai: toNumber(row.con_lai),
    ten_khach_hang: String(
      row.ten_khach_hang ?? (customerResult.data as { ten_khach_hang: string }).ten_khach_hang ?? 'Khach hang',
    ),
  }));

  return NextResponse.json({
    linked: true,
    customerName: (customerResult.data as { ten_khach_hang: string }).ten_khach_hang,
    data: rows,
  });
}
