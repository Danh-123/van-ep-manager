import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const updateTicketSchema = z.object({
  ngayCan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ (yyyy-MM-dd)'),
  bienSo: z.string().trim().min(3, 'Biển số xe là bắt buộc'),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  thanhToan: z.number().min(0, 'Thanh toán không được âm'),
  khachHangId: z.number().int().positive().optional(),
  khachHang: z.string().trim().min(2).optional(),
  ghiChu: z.string().trim().optional().or(z.literal('')),
}).refine((value) => Boolean(value.khachHangId) || Boolean(value.khachHang), {
  message: 'Khách hàng là bắt buộc',
  path: ['khachHangId'],
});

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUpdatePayload(body: unknown) {
  const typed = (body ?? {}) as Record<string, unknown>;

  return {
    ngayCan:
      (typed.ngay_can as string | undefined) ??
      (typed.ngayCan as string | undefined) ??
      (typed.ngay as string | undefined) ??
      '',
    bienSo:
      (typed.bien_so_xe as string | undefined) ??
      (typed.bienSo as string | undefined) ??
      '',
    soTan: toNumber((typed.khoi_luong_tan as unknown) ?? typed.soTan),
    donGia: toNumber((typed.don_gia_ap_dung as unknown) ?? typed.donGia),
    thanhToan: toNumber((typed.so_tien_da_tra as unknown) ?? typed.thanhToan),
    khachHangId: toNumber((typed.khach_hang_id as unknown) ?? typed.khachHangId) || undefined,
    khachHang:
      (typed.khach_hang as string | undefined) ??
      (typed.khachHang as string | undefined) ??
      undefined,
    ghiChu:
      (typed.ghi_chu as string | undefined) ??
      (typed.ghiChu as string | undefined) ??
      '',
  };
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

  const profileResult = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập trang xe hàng' };
  }

  return {
    ok: true as const,
    supabase,
  };
}

async function getOrCreateTruckId(supabase: Awaited<ReturnType<typeof createClient>>, bienSo: string) {
  const existing = await supabase.from('xe_hang').select('id').ilike('bien_so', bienSo).maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return (existing.data as { id: number }).id;
  }

  const inserted = await supabase
    .from('xe_hang')
    .insert({
      bien_so: bienSo,
      is_active: true,
    })
    .select('id')
    .single();

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  return (inserted.data as { id: number }).id;
}

async function resolveCustomerById(supabase: Awaited<ReturnType<typeof createClient>>, khachHangId: number) {
  const result = await supabase
    .from('khach_hang')
    .select('*')
    .eq('id', khachHangId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error('Không tìm thấy khách hàng đã chọn');
  }

  const typed = result.data as Record<string, unknown>;
  const name =
    (typed.ten as string | undefined) ??
    (typed.ten_khach_hang as string | undefined) ??
    (typed.name as string | undefined) ??
    (typed.ho_ten as string | undefined) ??
    '';

  if (!name.trim()) {
    throw new Error('Khách hàng không hợp lệ');
  }

  return {
    id: khachHangId,
    name: name.trim(),
  };
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteParams) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return NextResponse.json({ success: false, error: 'ID phiếu không hợp lệ' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const normalizedBody = normalizeUpdatePayload(body);
  const parsed = updateTicketSchema.safeParse(normalizedBody);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const truckId = await getOrCreateTruckId(access.supabase, parsed.data.bienSo);
    const customer = parsed.data.khachHangId
      ? await resolveCustomerById(access.supabase, parsed.data.khachHangId)
      : { id: null, name: parsed.data.khachHang ?? 'Khách lẻ' };
    const maxPay = parsed.data.soTan * parsed.data.donGia;
    const safePay = Math.min(parsed.data.thanhToan, maxPay);

    const update = await access.supabase
      .from('phieu_can')
      .update({
        ngay_can: parsed.data.ngayCan,
        xe_hang_id: truckId,
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        so_tien_da_tra: safePay,
        khach_hang_id: customer.id,
        khach_hang: customer.name,
        ghi_chu: parsed.data.ghiChu || null,
      })
      .eq('id', ticketId)
      .select('id, ngay_can')
      .maybeSingle();

    if (update.error) {
      return NextResponse.json({ success: false, error: update.error.message }, { status: 500 });
    }

    if (!update.data) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu cân cần sửa' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (update.data as { id: number }).id,
        ngay: (update.data as { ngay_can: string }).ngay_can,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể cập nhật phiếu cân' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return NextResponse.json({ success: false, error: 'ID phiếu không hợp lệ' }, { status: 400 });
  }

  try {
    const deleteHistory = await access.supabase
      .from('lich_su_thanh_toan')
      .delete()
      .eq('phieu_can_id', ticketId);

    if (deleteHistory.error) {
      return NextResponse.json({ success: false, error: deleteHistory.error.message }, { status: 500 });
    }

    const deleteTicket = await access.supabase
      .from('phieu_can')
      .delete()
      .eq('id', ticketId)
      .select('id')
      .maybeSingle();

    if (deleteTicket.error) {
      return NextResponse.json({ success: false, error: deleteTicket.error.message }, { status: 500 });
    }

    if (!deleteTicket.data) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu cân để xóa' }, { status: 404 });
    }

    // Optional RPC for DBs that provide global debt recalculation.
    const recalculate = await access.supabase.rpc('recalculate_all_debt');
    if (recalculate.error && recalculate.error.code !== '42883') {
      return NextResponse.json({ success: false, error: recalculate.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: ticketId } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xóa phiếu cân' },
      { status: 500 },
    );
  }
}
