import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { calculateDebt, type DebtInputRow } from '@/lib/trucks/debtCalculator';
import { createClient } from '@/lib/supabase/server';

const createTicketSchema = z.object({
  bienSo: z.string().trim().min(3, 'Biển số xe là bắt buộc'),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  thanhToan: z.number().min(0, 'Thanh toán không được âm'),
  khachHang: z.string().trim().min(2, 'Khách hàng là bắt buộc'),
  ghiChu: z.string().trim().optional().or(z.literal('')),
});

const updateTicketSchema = z.object({
  id: z.number().int().positive(),
  bienSo: z.string().trim().min(3, 'Biển số xe là bắt buộc'),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  thanhToan: z.number().min(0, 'Thanh toán không được âm'),
  khachHang: z.string().trim().min(2, 'Khách hàng là bắt buộc'),
  ghiChu: z.string().trim().optional().or(z.literal('')),
});

const deleteTicketSchema = z.object({
  id: z.number().int().positive(),
});

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
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập trang xe hàng' };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    fullName: profileResult.data.full_name?.trim() || user.email || 'Người dùng',
  };
}

async function getOrCreateTruckId(supabase: Awaited<ReturnType<typeof createClient>>, bienSo: string) {
  const existing = await supabase
    .from('xe_hang')
    .select('id')
    .ilike('bien_so', bienSo)
    .maybeSingle();

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

async function getDefaultWoodTypeId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const result = await supabase
    .from('loai_van_ep')
    .select('id')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error('Chưa có loại ván ép hoạt động. Vui lòng tạo loại ván ép trước khi thêm phiếu.');
  }

  return (result.data as { id: number }).id;
}

async function generateTicketNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const key = format(new Date(), 'yyyyMMdd');
  const prefix = `PC${key}`;

  const result = await supabase
    .from('phieu_can')
    .select('so_phieu')
    .ilike('so_phieu', `${prefix}%`)
    .order('so_phieu', { ascending: false })
    .limit(200);

  if (result.error) {
    throw new Error(result.error.message);
  }

  let maxSeq = 0;
  (result.data ?? []).forEach((row) => {
    const code = (row as { so_phieu?: string }).so_phieu ?? '';
    const matched = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!matched) return;
    maxSeq = Math.max(maxSeq, Number(matched[1]));
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

async function fetchTickets(supabase: Awaited<ReturnType<typeof createClient>>) {
  const result = await supabase
    .from('phieu_can')
    .select('id, ngay_can, khoi_luong_tan, don_gia_ap_dung, so_tien_da_tra, khach_hang, ghi_chu, xe_hang:xe_hang_id(bien_so)')
    .order('ngay_can', { ascending: true })
    .order('id', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows: DebtInputRow[] = (result.data ?? []).map((row) => {
    const typed = row as {
      id: number;
      ngay_can: string;
      khoi_luong_tan: number | string;
      don_gia_ap_dung: number | string;
      so_tien_da_tra: number | string;
      khach_hang: string | null;
      ghi_chu: string | null;
      xe_hang?: { bien_so?: string } | null;
    };

    return {
      id: typed.id,
      ngay: typed.ngay_can,
      bienSo: typed.xe_hang?.bien_so ?? '-',
      soTan: Number(typed.khoi_luong_tan) || 0,
      donGia: Number(typed.don_gia_ap_dung) || 0,
      thanhToan: Number(typed.so_tien_da_tra) || 0,
      khachHang: typed.khach_hang ?? 'Khách lẻ',
      ghiChu: typed.ghi_chu ?? '',
    };
  });

  return calculateDebt(rows);
}

export async function GET() {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const rows = await fetchTickets(access.supabase);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tải danh sách phiếu cân' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const truckId = await getOrCreateTruckId(access.supabase, parsed.data.bienSo);
    const woodTypeId = await getDefaultWoodTypeId(access.supabase);
    const soPhieu = await generateTicketNo(access.supabase);
    const thanhTien = parsed.data.soTan * parsed.data.donGia;
    const soTienDaTra = Math.min(parsed.data.thanhToan, thanhTien);

    const insertTicket = await access.supabase
      .from('phieu_can')
      .insert({
        so_phieu: soPhieu,
        ngay_can: format(new Date(), 'yyyy-MM-dd'),
        xe_hang_id: truckId,
        loai_van_ep_id: woodTypeId,
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        so_tien_da_tra: soTienDaTra,
        khach_hang: parsed.data.khachHang,
        ghi_chu: parsed.data.ghiChu || null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (insertTicket.error) {
      return NextResponse.json({ success: false, error: insertTicket.error.message }, { status: 500 });
    }

    if (soTienDaTra > 0) {
      const insertHistory = await access.supabase.from('lich_su_thanh_toan').insert({
        phieu_can_id: (insertTicket.data as { id: number }).id,
        ngay_thanh_toan: format(new Date(), 'yyyy-MM-dd'),
        so_tien: soTienDaTra,
        nguoi_thu: access.fullName,
        phuong_thuc: 'TienMat',
        ghi_chu: 'Thanh toán khi tạo phiếu',
        created_by: access.userId,
      });

      if (insertHistory.error) {
        return NextResponse.json({ success: false, error: insertHistory.error.message }, { status: 500 });
      }
    }

    const rows = await fetchTickets(access.supabase);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tạo phiếu cân' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const target = await access.supabase
      .from('phieu_can')
      .select('id, thanh_tien, so_tien_da_tra')
      .eq('id', parsed.data.id)
      .maybeSingle();

    if (target.error) {
      return NextResponse.json({ success: false, error: target.error.message }, { status: 500 });
    }

    if (!target.data) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu cân cần sửa' }, { status: 404 });
    }

    const typedTarget = target.data as { id: number; thanh_tien: number | string; so_tien_da_tra: number | string };
    const truckId = await getOrCreateTruckId(access.supabase, parsed.data.bienSo);
    const maxPay = parsed.data.soTan * parsed.data.donGia;
    const safePay = Math.min(parsed.data.thanhToan, maxPay);

    const update = await access.supabase
      .from('phieu_can')
      .update({
        xe_hang_id: truckId,
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        so_tien_da_tra: safePay,
        khach_hang: parsed.data.khachHang,
        ghi_chu: parsed.data.ghiChu || null,
      })
      .eq('id', parsed.data.id);

    if (update.error) {
      return NextResponse.json({ success: false, error: update.error.message }, { status: 500 });
    }

    if (safePay !== Number(typedTarget.so_tien_da_tra || 0)) {
      const insertHistory = await access.supabase.from('lich_su_thanh_toan').insert({
        phieu_can_id: parsed.data.id,
        ngay_thanh_toan: format(new Date(), 'yyyy-MM-dd'),
        so_tien: safePay,
        nguoi_thu: access.fullName,
        phuong_thuc: 'TienMat',
        ghi_chu: 'Cập nhật thanh toán từ màn hình xe hàng',
        created_by: access.userId,
      });

      if (insertHistory.error) {
        return NextResponse.json({ success: false, error: insertHistory.error.message }, { status: 500 });
      }
    }

    const rows = await fetchTickets(access.supabase);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể cập nhật phiếu cân' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const deleteHistory = await access.supabase
      .from('lich_su_thanh_toan')
      .delete()
      .eq('phieu_can_id', parsed.data.id);

    if (deleteHistory.error) {
      return NextResponse.json({ success: false, error: deleteHistory.error.message }, { status: 500 });
    }

    const deleteTicket = await access.supabase.from('phieu_can').delete().eq('id', parsed.data.id);

    if (deleteTicket.error) {
      return NextResponse.json({ success: false, error: deleteTicket.error.message }, { status: 500 });
    }

    const rows = await fetchTickets(access.supabase);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể xóa phiếu cân' },
      { status: 500 },
    );
  }
}
