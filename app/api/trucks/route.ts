import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const createTicketSchema = z.object({
  ngayCan: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  congNoDau: z.number().min(0, 'Công nợ đầu không được âm').optional(),
  thanhToan: z.number().min(0, 'Thanh toán không được âm'),
  khachHangId: z.number().int().positive('Khách hàng là bắt buộc'),
  ghiChu: z.string().trim().optional().or(z.literal('')),
});

const updateTicketSchema = z.object({
  id: z.number().int().positive(),
  soTan: z.number().positive('Số tấn phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  congNoDau: z.number().min(0, 'Công nợ đầu không được âm').optional(),
  thanhToan: z.number().min(0, 'Thanh toán không được âm'),
  khachHangId: z.number().int().positive().optional(),
  khachHang: z.string().trim().min(2).optional(),
  ghiChu: z.string().trim().optional().or(z.literal('')),
});

const deleteTicketSchema = z.object({
  id: z.number().int().positive(),
});

type TruckRawRow = {
  id: number;
  ngay_can: string;
  khoi_luong_tan: number | string;
  don_gia_ap_dung: number | string;
  cong_no_dau: number | string | null;
  so_tien_da_tra: number | string;
  khach_hang_id: number | null;
  khach_hang: string | null;
  ghi_chu: string | null;
  xe_hang?: { bien_so?: string } | null;
  customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

type CalculatedTruckRow = {
  id: number;
  customerId: number | null;
  customerCode: string;
  customerName: string;
  khachHang: string;
  ngay: string;
  bienSo: string;
  soTan: number;
  donGia: number;
  congNoDau: number;
  thanhTien: number;
  congNo: number;
  thanhToan: number;
  conLai: number;
  ghiChu: string;
  formulaText: string;
};

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
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập trang mua hàng' };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    fullName: profileResult.data.full_name?.trim() || user.email || 'Người dùng',
  };
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

function resolveCustomerCode(customer: Record<string, unknown> | null, customerId: number | null) {
  if (!customer) {
    return customerId ? `KH${String(customerId).padStart(3, '0')}` : 'KH-LE';
  }

  return (
    (customer.ma_khach_hang as string | undefined) ??
    (customer.ma as string | undefined) ??
    (customer.code as string | undefined) ??
    (customerId ? `KH${String(customerId).padStart(3, '0')}` : 'KH-LE')
  );
}

function resolveCustomerName(customer: Record<string, unknown> | null, fallbackName: string | null) {
  if (!customer) {
    return (fallbackName ?? 'Khach le').trim() || 'Khach le';
  }

  return (
    (customer.ten as string | undefined) ??
    (customer.ten_khach_hang as string | undefined) ??
    (customer.name as string | undefined) ??
    (customer.ho_ten as string | undefined) ??
    (fallbackName ?? 'Khach le')
  ).trim();
}

function normalizeCreatePayload(body: unknown) {
  const typed = (body ?? {}) as Record<string, unknown>;

  return {
    ngayCan:
      (typed.ngay_can as string | undefined) ??
      (typed.ngayCan as string | undefined),
    soTan: toNumber((typed.khoi_luong_tan as unknown) ?? typed.soTan),
    donGia: toNumber((typed.don_gia_ap_dung as unknown) ?? typed.donGia),
    congNoDau: toOptionalNumber((typed.cong_no_dau as unknown) ?? typed.congNoDau),
    thanhToan: toNumber((typed.so_tien_da_tra as unknown) ?? typed.thanhToan),
    khachHangId: toNumber((typed.khach_hang_id as unknown) ?? typed.khachHangId),
    ghiChu:
      (typed.ghi_chu as string | undefined) ??
      (typed.ghiChu as string | undefined) ??
      '',
  };
}

function calculateDebtByCustomer(rawRows: TruckRawRow[]) {
  const previousRemainByCustomer = new Map<string, number>();

  return rawRows.map((typed) => {
    const customerRow = Array.isArray(typed.customer) ? typed.customer[0] : typed.customer;
    const customerId = typed.khach_hang_id ?? null;
    const customerCode = resolveCustomerCode(customerRow ?? null, customerId).trim();
    const customerName = resolveCustomerName(customerRow ?? null, typed.khach_hang);
    const customerKey = customerId ? `id:${customerId}` : `name:${customerName.toLowerCase()}`;

    const previousRemain = previousRemainByCustomer.get(customerKey) ?? 0;
    const soTan = Math.max(0, toNumber(typed.khoi_luong_tan));
    const donGia = Math.max(0, toNumber(typed.don_gia_ap_dung));
    const congNoDau = Math.max(0, toNumber(typed.cong_no_dau));
    const thanhTien = soTan * donGia;
    const congNo = Math.max(0, congNoDau + thanhTien + previousRemain);
    const thanhToan = Math.max(0, toNumber(typed.so_tien_da_tra));
    const conLai = Math.max(0, congNo - thanhToan);

    previousRemainByCustomer.set(customerKey, conLai);

    const formulaText =
      previousRemain <= 0 && congNoDau <= 0
        ? `Cong no = ${thanhTien.toLocaleString('vi-VN')} (phieu dau tien cua khach hang ${customerName})`
        : `Cong no = ${congNoDau.toLocaleString('vi-VN')} + ${thanhTien.toLocaleString('vi-VN')} + ${previousRemain.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')}`;

    return {
      id: typed.id,
      customerId,
      customerCode,
      customerName,
      khachHang: customerName,
      ngay: typed.ngay_can,
      bienSo: typed.xe_hang?.bien_so ?? '-',
      soTan,
      donGia,
      congNoDau,
      thanhTien,
      congNo,
      thanhToan,
      conLai,
      ghiChu: typed.ghi_chu ?? '',
      formulaText,
    } satisfies CalculatedTruckRow;
  });
}

function buildCustomerDebts(rows: CalculatedTruckRow[]) {
  const map = new Map<number, { customerCode: string; customerName: string; totalDebt: number; ticketCount: number }>();

  rows.forEach((row) => {
    if (!row.customerId) return;

    const existing = map.get(row.customerId);
    if (!existing) {
      map.set(row.customerId, {
        customerCode: row.customerCode,
        customerName: row.customerName,
        totalDebt: row.conLai,
        ticketCount: 1,
      });
      return;
    }

    existing.totalDebt = row.conLai;
    existing.ticketCount += 1;
  });

  return Array.from(map.entries())
    .map(([customerId, value]) => ({
      customerId,
      customerCode: value.customerCode,
      customerName: value.customerName,
      totalDebt: value.totalDebt,
      ticketCount: value.ticketCount,
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
}

async function fetchTickets(supabase: Awaited<ReturnType<typeof createClient>>) {
  const result = await supabase
    .from('phieu_can')
    .select('id, ngay_can, khoi_luong_tan, don_gia_ap_dung, cong_no_dau, so_tien_da_tra, khach_hang_id, khach_hang, ghi_chu, xe_hang:xe_hang_id(bien_so), customer:khach_hang_id(*)')
    .order('ngay_can', { ascending: true })
    .order('id', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return calculateDebtByCustomer((result.data ?? []) as TruckRawRow[]);
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

function parsePositiveInt(value: string | null, fallbackValue: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function isDateParam(value: string | null) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 20);
    const safeLimit = [10, 20, 50].includes(limit) ? limit : 20;

    const fromDate = searchParams.get('fromDate')?.trim() || '';
    const toDate = searchParams.get('toDate')?.trim() || '';
    const customer = searchParams.get('customer')?.trim().toLowerCase() || '';
    const customerId = parsePositiveInt(searchParams.get('customerId'), 0);

    if (!isDateParam(fromDate) || !isDateParam(toDate)) {
      return NextResponse.json({ success: false, error: 'Định dạng ngày không hợp lệ (yyyy-MM-dd)' }, { status: 400 });
    }

    const rows = await fetchTickets(access.supabase);

    // Base filter for search/date/customer; used to build customer debt cards.
    const filteredByBase = rows.filter((row) => {
      const matchFromDate = !fromDate || row.ngay >= fromDate;
      const matchToDate = !toDate || row.ngay <= toDate;
      const matchCustomer =
        !customer ||
        row.khachHang.toLowerCase().includes(customer) ||
        row.customerCode.toLowerCase().includes(customer);
      return matchFromDate && matchToDate && matchCustomer;
    });

    const customerDebts = buildCustomerDebts(filteredByBase);

    const filteredRows = filteredByBase.filter((row) => {
      if (!customerId) return true;
      return row.customerId === customerId;
    });

    const sortedRows = [...filteredRows].sort((a, b) => {
      const byDate = new Date(b.ngay).getTime() - new Date(a.ngay).getTime();
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    });

    const total = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * safeLimit;
    const paginatedRows = sortedRows.slice(start, start + safeLimit);

    return NextResponse.json({
      success: true,
      data: paginatedRows,
      customerDebts,
      total,
      page: safePage,
      totalPages,
    });
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
  const normalizedBody = normalizeCreatePayload(body);
  const parsed = createTicketSchema.safeParse(normalizedBody);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const customer = await resolveCustomerById(access.supabase, parsed.data.khachHangId);
    const woodTypeId = await getDefaultWoodTypeId(access.supabase);
    const soPhieu = await generateTicketNo(access.supabase);
    const thanhTien = parsed.data.soTan * parsed.data.donGia;
    const congNoDau = Math.max(0, parsed.data.congNoDau ?? 0);
    const soTienDaTra = Math.min(parsed.data.thanhToan, thanhTien);

    const insertTicket = await access.supabase
      .from('phieu_can')
      .insert({
        so_phieu: soPhieu,
        ngay_can: parsed.data.ngayCan ?? format(new Date(), 'yyyy-MM-dd'),
        loai_van_ep_id: woodTypeId,
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        cong_no_dau: congNoDau,
        so_tien_da_tra: soTienDaTra,
        khach_hang_id: customer.id,
        khach_hang: customer.name,
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
      .select('id, thanh_tien, so_tien_da_tra, cong_no_dau')
      .eq('id', parsed.data.id)
      .maybeSingle();

    if (target.error) {
      return NextResponse.json({ success: false, error: target.error.message }, { status: 500 });
    }

    if (!target.data) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu cân cần sửa' }, { status: 404 });
    }

    const typedTarget = target.data as {
      id: number;
      thanh_tien: number | string;
      so_tien_da_tra: number | string;
      cong_no_dau: number | string | null;
    };
    const customer = parsed.data.khachHangId
      ? await resolveCustomerById(access.supabase, parsed.data.khachHangId)
      : { id: null, name: parsed.data.khachHang ?? 'Khách lẻ' };
    const maxPay = parsed.data.soTan * parsed.data.donGia;
    const safePay = Math.min(parsed.data.thanhToan, maxPay);
    const congNoDau = parsed.data.congNoDau ?? Math.max(0, toNumber(typedTarget.cong_no_dau));

    const update = await access.supabase
      .from('phieu_can')
      .update({
        khoi_luong_tan: parsed.data.soTan,
        don_gia_ap_dung: parsed.data.donGia,
        cong_no_dau: congNoDau,
        so_tien_da_tra: safePay,
        khach_hang_id: customer.id,
        khach_hang: customer.name,
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
        ghi_chu: 'Cập nhật thanh toán từ màn hình mua hàng',
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
  const bodyId = toNumber((body as { id?: unknown } | null)?.id);
  const queryId = parsePositiveInt(request.nextUrl.searchParams.get('id'), 0);
  const parsed = deleteTicketSchema.safeParse({ id: bodyId || queryId });

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

    // Keep compatibility with environments that provide an RPC recalc function.
    const recalculateResult = await access.supabase.rpc('recalculate_all_debt');
    if (recalculateResult.error && recalculateResult.error.code !== '42883') {
      return NextResponse.json({ success: false, error: recalculateResult.error.message }, { status: 500 });
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
