import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCustomerName(customer: Record<string, unknown>) {
  return (
    (customer.ten_khach_hang as string | undefined) ??
    (customer.ten as string | undefined) ??
    (customer.name as string | undefined) ??
    (customer.ho_ten as string | undefined) ??
    'Khach hang'
  );
}

async function ensureAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, status: 401, error: 'Ban chua dang nhap' };
  }

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile.error || !profile.data) {
    return { ok: false as const, status: 403, error: 'Khong the xac thuc quyen truy cap' };
  }

  if (profile.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Ban khong co quyen truy cap trang xe hang' };
  }

  return { ok: true as const, supabase };
}

export async function GET(request: NextRequest) {
  const access = await ensureAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const customerId = Number(request.nextUrl.searchParams.get('customerId') || 0);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return NextResponse.json({ success: false, error: 'customerId khong hop le' }, { status: 400 });
  }

  try {
    const result = await access.supabase
      .from('phieu_can')
      .select('id, ngay_can, thanh_tien, so_tien_da_tra, customer:khach_hang_id(*)')
      .eq('khach_hang_id', customerId)
      .order('ngay_can', { ascending: true })
      .order('id', { ascending: true });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    const rows = (result.data ?? []) as Array<{
      customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
      thanh_tien: number | string;
      so_tien_da_tra: number | string | null;
    }>;

    const firstCustomerRaw = rows[0]?.customer;
    const firstCustomer = Array.isArray(firstCustomerRaw) ? (firstCustomerRaw[0] ?? null) : (firstCustomerRaw ?? null);

    const customerName = firstCustomer ? resolveCustomerName(firstCustomer) : 'Khach hang';

    let remain = 0;
    rows.forEach((row) => {
      const thanhTien = Math.max(0, toNumber(row.thanh_tien));
      const daTra = Math.max(0, toNumber(row.so_tien_da_tra));
      const congNo = thanhTien + remain;
      remain = Math.max(0, congNo - daTra);
    });

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        customerName,
        con_lai: remain,
        isFirstTicket: rows.length === 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Khong the tai cong no phieu truoc' },
      { status: 500 },
    );
  }
}
