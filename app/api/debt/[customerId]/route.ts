import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type TicketRow = {
  id: number;
  ngay_can: string;
  khoi_luong_tan: number | string;
  thanh_tien: number | string;
  cong_no_dau: number | string | null;
  so_tien_da_tra: number | string | null;
  ghi_chu: string | null;
  xe_hang?: { bien_so?: string } | null;
  customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

type SaleTicketRow = {
  id: number;
  ngay_ban: string;
  so_khoi: number | string;
  thanh_tien: number | string;
  cong_no_dau: number | string | null;
  so_tien_da_tra: number | string | null;
  ghi_chu: string | null;
  customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCustomerType(customer: Record<string, unknown>) {
  return (customer.loai_khach_hang as string | undefined) === 'ban' ? 'ban' : 'mua';
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
  const loaiKhachHang = _request.nextUrl.searchParams.get('loaiKhachHang') ?? '';
  const selectedType = loaiKhachHang === 'ban' ? 'ban' : loaiKhachHang === 'mua' ? 'mua' : null;

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, error: 'customerId khong hop le' }, { status: 400 });
  }

  try {
    const useSales = selectedType === 'ban';

    let previousRemain = 0;

    const data = useSales
      ? await (async () => {
          const result = await access.supabase
            .from('phieu_ban')
            .select('id, ngay_ban, so_khoi, thanh_tien, cong_no_dau, so_tien_da_tra, ghi_chu, customer:khach_hang_id(*)')
            .eq('khach_hang_id', id)
            .order('ngay_ban', { ascending: true })
            .order('id', { ascending: true });

          if (result.error) {
            throw new Error(result.error.message);
          }

          return ((result.data as SaleTicketRow[] | null) ?? []).map((row) => {
            const customerRow = Array.isArray(row.customer) ? row.customer[0] : row.customer;
            if (!customerRow || resolveCustomerType(customerRow) !== 'ban') {
              return null;
            }

            const thanhTien = Math.max(0, toNumber(row.thanh_tien));
            const congNoDau = Math.max(0, toNumber(row.cong_no_dau));
            const daTra = Math.max(0, toNumber(row.so_tien_da_tra));
            const congNo = congNoDau + thanhTien + previousRemain;
            const conLai = Math.max(0, congNo - daTra);
            previousRemain = conLai;

            return {
              id: row.id,
              ngay_can: row.ngay_ban,
              bien_so_xe: 'Phiếu bán',
              khoi_luong_tan: Math.max(0, toNumber(row.so_khoi)),
              thanh_tien: thanhTien,
              so_tien_da_tra: daTra,
              cong_no: congNo,
              con_lai: conLai,
              ghi_chu: row.ghi_chu ?? '',
            };
          });
        })()
      : await (async () => {
          const result = await access.supabase
            .from('phieu_can')
            .select('id, ngay_can, khoi_luong_tan, thanh_tien, cong_no_dau, so_tien_da_tra, ghi_chu, xe_hang:xe_hang_id(bien_so), customer:khach_hang_id(*)')
            .eq('khach_hang_id', id)
            .order('ngay_can', { ascending: true })
            .order('id', { ascending: true });

          if (result.error) {
            throw new Error(result.error.message);
          }

          return ((result.data as TicketRow[] | null) ?? []).map((row) => {
            const customerRow = Array.isArray(row.customer) ? row.customer[0] : row.customer;
            if (selectedType && customerRow && resolveCustomerType(customerRow) !== selectedType) {
              return null;
            }

            const thanhTien = Math.max(0, toNumber(row.thanh_tien));
            const congNoDau = Math.max(0, toNumber(row.cong_no_dau));
            const daTra = Math.max(0, toNumber(row.so_tien_da_tra));
            const congNo = congNoDau + thanhTien + previousRemain;
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
        })();

    const filteredData = data.filter(
      (
        row,
      ): row is {
        id: number;
        ngay_can: string;
        bien_so_xe: string;
        khoi_luong_tan: number;
        thanh_tien: number;
        so_tien_da_tra: number;
        cong_no: number;
        con_lai: number;
        ghi_chu: string;
      } => row !== null,
    );

    return NextResponse.json({ success: true, data: filteredData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Khong the tai chi tiet cong no' },
      { status: 500 },
    );
  }
}
