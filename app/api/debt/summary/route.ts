import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type TicketRow = {
  id: number;
  ngay_can: string;
  thanh_tien: number | string;
  so_tien_da_tra: number | string | null;
  khach_hang_id: number | null;
  customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCustomerCode(customer: Record<string, unknown>, customerId: number) {
  return (
    (customer.ma_khach_hang as string | undefined) ??
    (customer.ma as string | undefined) ??
    (customer.code as string | undefined) ??
    `KH${String(customerId).padStart(3, '0')}`
  ).trim();
}

function resolveCustomerName(customer: Record<string, unknown>) {
  return (
    (customer.ten_khach_hang as string | undefined) ??
    (customer.ten as string | undefined) ??
    (customer.name as string | undefined) ??
    (customer.ho_ten as string | undefined) ??
    'Khach hang'
  ).trim();
}

function resolveCustomerPhone(customer: Record<string, unknown>) {
  return (
    (customer.so_dien_thoai as string | undefined) ??
    (customer.sdt as string | undefined) ??
    (customer.phone as string | undefined) ??
    ''
  ).trim();
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

export async function GET() {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const result = await access.supabase
      .from('phieu_can')
      .select('id, ngay_can, thanh_tien, so_tien_da_tra, khach_hang_id, customer:khach_hang_id(*)')
      .not('khach_hang_id', 'is', null)
      .order('ngay_can', { ascending: true })
      .order('id', { ascending: true });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    const summary = new Map<number, {
      id: number;
      ma_khach_hang: string;
      ten_khach_hang: string;
      so_dien_thoai: string;
      so_phieu: number;
      tong_no: number;
      previousRemain: number;
    }>();

    (result.data as TicketRow[] | null ?? []).forEach((row) => {
      if (!row.khach_hang_id) return;
      const customerRaw = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      if (!customerRaw) return;

      const current = summary.get(row.khach_hang_id) ?? {
        id: row.khach_hang_id,
        ma_khach_hang: resolveCustomerCode(customerRaw, row.khach_hang_id),
        ten_khach_hang: resolveCustomerName(customerRaw),
        so_dien_thoai: resolveCustomerPhone(customerRaw),
        so_phieu: 0,
        tong_no: 0,
        previousRemain: 0,
      };

      const thanhTien = Math.max(0, toNumber(row.thanh_tien));
      const daTra = Math.max(0, toNumber(row.so_tien_da_tra));
      const congNo = thanhTien + current.previousRemain;
      const conLai = Math.max(0, congNo - daTra);

      current.so_phieu += 1;
      current.tong_no += conLai;
      current.previousRemain = conLai;

      summary.set(row.khach_hang_id, current);
    });

    const data = Array.from(summary.values())
      .map((item) => ({
        id: item.id,
        ma_khach_hang: item.ma_khach_hang,
        ten_khach_hang: item.ten_khach_hang,
        so_dien_thoai: item.so_dien_thoai,
        so_phieu: item.so_phieu,
        tong_no: item.tong_no,
      }))
      .sort((a, b) => b.tong_no - a.tong_no);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Khong the tai tong hop cong no' },
      { status: 500 },
    );
  }
}
