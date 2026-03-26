import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type TicketRow = {
  id: number;
  ngay_can: string;
  khoi_luong_tan: number | string;
  thanh_tien: number | string;
  so_tien_da_tra: number | string | null;
  ghi_chu: string | null;
  xe_hang?: { bien_so?: string } | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ensureManagerAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profileResult = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen truy cap cong no' };
  }

  return {
    ok: true as const,
    supabase,
  };
}

type RouteParams = {
  params: Promise<{ customerId: string }>;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { customerId } = await context.params;
  const id = Number(customerId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, error: 'customerId khong hop le' }, { status: 400 });
  }

  try {
    const result = await access.supabase
      .from('phieu_can')
      .select('id, ngay_can, khoi_luong_tan, thanh_tien, so_tien_da_tra, ghi_chu, xe_hang:xe_hang_id(bien_so)')
      .eq('khach_hang_id', id)
      .order('ngay_can', { ascending: true })
      .order('id', { ascending: true });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    let previousRemain = 0;

    const data = ((result.data as TicketRow[] | null) ?? []).map((row) => {
      const thanhTien = Math.max(0, toNumber(row.thanh_tien));
      const daTra = Math.max(0, toNumber(row.so_tien_da_tra));
      const congNo = thanhTien + previousRemain;
      const conLai = Math.max(0, congNo - daTra);
      previousRemain = conLai;

      return {
        id: row.id,
        ngay_can: row.ngay_can,
        bien_so_xe: row.xe_hang?.bien_so ?? '-',
        khoi_luong_tan: Math.max(0, toNumber(row.khoi_luong_tan)),
        thanh_tien: thanhTien,
        so_tien_da_tra: daTra,
        cong_no: congNo,
        con_lai: conLai,
        ghi_chu: row.ghi_chu ?? '',
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Khong the tai chi tiet cong no' },
      { status: 500 },
    );
  }
}
