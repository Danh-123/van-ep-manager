import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const updateTicketSchema = z.object({
  ngayCan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ (yyyy-MM-dd)'),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  congNoDau: z.number().min(0, 'Công nợ đầu không được âm').optional(),
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

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeUpdatePayload(body: unknown) {
  const typed = (body ?? {}) as Record<string, unknown>;

  return {
    ngayCan:
      (typed.ngay_can as string | undefined) ??
      (typed.ngayCan as string | undefined) ??
      (typed.ngay as string | undefined) ??
      '',
    soTan: toNumber((typed.khoi_luong_tan as unknown) ?? typed.soTan),
    donGia: toNumber((typed.don_gia_ap_dung as unknown) ?? typed.donGia),
    congNoDau: toOptionalNumber((typed.cong_no_dau as unknown) ?? typed.congNoDau),
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
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập trang mua hàng' };
  }

  return {
    ok: true as const,
    supabase,
  };
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
  const customerType = (typed.loai_khach_hang as string | undefined) ?? 'mua';
  const name =
    (typed.ten as string | undefined) ??
    (typed.ten_khach_hang as string | undefined) ??
    (typed.name as string | undefined) ??
    (typed.ho_ten as string | undefined) ??
    '';

  if (customerType !== 'mua') {
    throw new Error('Chỉ được chọn khách hàng loại Mua cho phiếu mua hàng');
  }

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
    const customer = parsed.data.khachHangId
      ? await resolveCustomerById(access.supabase, parsed.data.khachHangId)
      : { id: null, name: parsed.data.khachHang ?? 'Khách lẻ' };
    const maxPay = parsed.data.soTan * parsed.data.donGia;
    const safePay = Math.min(parsed.data.thanhToan, maxPay);

    const update = await access.supabase
      .from('phieu_can')
      .update({
        ngay_can: parsed.data.ngayCan,
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        cong_no_dau: Math.max(0, parsed.data.congNoDau ?? 0),
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
