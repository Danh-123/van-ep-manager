import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const createSaleSchema = z.object({
  ngayBan: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  soBo: z.number().min(0, 'Số bó không được âm'),
  soTo: z.number().min(0, 'Số tờ không được âm'),
  doRong: z.number().min(0, 'Độ rộng không được âm'),
  doDay: z.number().min(0, 'Độ dày không được âm'),
  doDai: z.number().min(0, 'Độ dài không được âm'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  congNoDau: z.number().min(0, 'Công nợ đầu không được âm').optional(),
  thanhToan: z.number().min(0, 'Thanh toán không được âm').optional(),
  khachHangId: z.number().int().positive('Khách hàng là bắt buộc'),
  ghiChu: z.string().trim().optional().or(z.literal('')),
});

type CustomerType = 'mua' | 'ban';

type SaleRawRow = {
  id: number;
  ngay_ban: string;
  so_bo: number | string;
  so_to: number | string;
  do_rong: number | string;
  do_day: number | string;
  do_dai: number | string;
  so_khoi: number | string;
  don_gia: number | string;
  cong_no_dau: number | string | null;
  thanh_tien: number | string;
  so_tien_da_tra: number | string;
  khach_hang_id: number | null;
  khach_hang: string | null;
  ghi_chu: string | null;
  customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

type SaleCalculatedRow = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  khachHang: string;
  ngay: string;
  soBo: number;
  soTo: number;
  doRong: number;
  doDay: number;
  doDai: number;
  soKhoi: number;
  donGia: number;
  congNoDau: number;
  previousRemain: number;
  thanhTien: number;
  congNo: number;
  thanhToan: number;
  conLai: number;
  ghiChu: string;
  formulaText: string;
};

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

function parsePositiveInt(value: string | null, fallbackValue: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function resolveCustomerCode(customer: Record<string, unknown>, customerId: number) {
  return (
    (customer.ma_khach_hang as string | undefined) ??
    (customer.ma as string | undefined) ??
    (customer.code as string | undefined) ??
    `KH${String(customerId).padStart(4, '0')}`
  );
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

function resolveCustomerPhone(customer: Record<string, unknown>) {
  return (
    (customer.so_dien_thoai as string | undefined) ??
    (customer.sdt as string | undefined) ??
    (customer.phone as string | undefined) ??
    ''
  ).trim();
}

function resolveCustomerType(customer: Record<string, unknown>): CustomerType {
  return (customer.loai_khach_hang as string | undefined) === 'ban' ? 'ban' : 'mua';
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

  const profileResult = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập trang bán hàng' };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    fullName: profileResult.data.full_name?.trim() || user.email || 'Người dùng',
  };
}

async function resolveCustomerById(supabase: Awaited<ReturnType<typeof createClient>>, customerId: number) {
  const result = await supabase.from('khach_hang').select('*').eq('id', customerId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error('Không tìm thấy khách hàng đã chọn');
  }

  const typed = result.data as Record<string, unknown>;
  if (resolveCustomerType(typed) !== 'ban') {
    throw new Error('Khách hàng phải có loại Bán');
  }

  const name = resolveCustomerName(typed).trim();
  if (!name) {
    throw new Error('Khách hàng không hợp lệ');
  }

  return {
    id: customerId,
    code: resolveCustomerCode(typed, customerId).trim(),
    name,
    phone: resolveCustomerPhone(typed),
  };
}

async function generateSaleNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const key = format(new Date(), 'yyyyMMdd');
  const prefix = `PB${key}`;

  const result = await supabase
    .from('phieu_ban')
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

function calculateRows(rawRows: SaleRawRow[]) {
  const remainByCustomer = new Map<string, number>();

  return rawRows.map((row) => {
    const customerRow = Array.isArray(row.customer) ? row.customer[0] : row.customer;
    if (!customerRow || !row.khach_hang_id) {
      return null;
    }

    const customerType = resolveCustomerType(customerRow);
    if (customerType !== 'ban') {
      return null;
    }

    const customerId = row.khach_hang_id;
    const customerCode = resolveCustomerCode(customerRow, customerId).trim();
    const customerName = resolveCustomerName(customerRow).trim();
    const customerPhone = resolveCustomerPhone(customerRow);
    const customerKey = `id:${customerId}`;
    const previousRemain = remainByCustomer.get(customerKey) ?? 0;

    const soBo = Math.max(0, toNumber(row.so_bo));
    const soTo = Math.max(0, toNumber(row.so_to));
    const doRong = Math.max(0, toNumber(row.do_rong));
    const doDay = Math.max(0, toNumber(row.do_day));
    const doDai = Math.max(0, toNumber(row.do_dai));
    const donGia = Math.max(0, toNumber(row.don_gia));
    const congNoDau = Math.max(0, toNumber(row.cong_no_dau));
    const soKhoi = (soBo * soTo * doRong * doDay * doDai) / 1000000;
    const thanhTien = Math.max(0, soKhoi * donGia);
    const congNo = Math.max(0, congNoDau + thanhTien + previousRemain);
    const thanhToan = Math.max(0, toNumber(row.so_tien_da_tra));
    const conLai = Math.max(0, congNo - thanhToan);

    remainByCustomer.set(customerKey, conLai);

    const formulaText =
      previousRemain <= 0 && congNoDau <= 0
        ? `Công nợ = ${thanhTien.toLocaleString('vi-VN')} đ (phiếu đầu tiên của khách hàng ${customerName})`
        : `Công nợ = ${congNoDau.toLocaleString('vi-VN')} + ${thanhTien.toLocaleString('vi-VN')} + ${previousRemain.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')} đ`;

    return {
      id: row.id,
      customerId,
      customerCode,
      customerName,
      customerPhone,
      khachHang: customerName,
      ngay: row.ngay_ban,
      soBo,
      soTo,
      doRong,
      doDay,
      doDai,
      soKhoi,
      donGia,
      congNoDau,
      previousRemain,
      thanhTien,
      congNo,
      thanhToan,
      conLai,
      ghiChu: row.ghi_chu ?? '',
      formulaText,
    } satisfies SaleCalculatedRow;
  }).filter((row): row is SaleCalculatedRow => row !== null);
}

async function fetchSalesRows(supabase: Awaited<ReturnType<typeof createClient>>) {
  const result = await supabase
    .from('phieu_ban')
    .select('id, ngay_ban, so_bo, so_to, do_rong, do_day, do_dai, so_khoi, don_gia, cong_no_dau, thanh_tien, so_tien_da_tra, khach_hang_id, khach_hang, ghi_chu, customer:khach_hang_id(*)')
    .order('ngay_ban', { ascending: true })
    .order('id', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return calculateRows((result.data ?? []) as SaleRawRow[]);
}

function buildCustomerSummary(rows: SaleCalculatedRow[]) {
  const map = new Map<number, { customerId: number; customerCode: string; customerName: string; totalDebt: number; ticketCount: number }>();

  rows.forEach((row) => {
    const existing = map.get(row.customerId);
    if (!existing) {
      map.set(row.customerId, {
        customerId: row.customerId,
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

  return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
}

export async function GET(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') ?? '';
    const customerId = parsePositiveInt(searchParams.get('customerId'), 0);

    if (mode === 'last') {
      if (!customerId) {
        return NextResponse.json({ success: false, error: 'customerId không hợp lệ' }, { status: 400 });
      }

      const customer = await resolveCustomerById(access.supabase, customerId);

      const result = await access.supabase
        .from('phieu_ban')
        .select('id, ngay_ban, so_bo, so_to, do_rong, do_day, do_dai, so_khoi, don_gia, cong_no_dau, thanh_tien, so_tien_da_tra, khach_hang_id, khach_hang, ghi_chu, customer:khach_hang_id(*)')
        .eq('khach_hang_id', customerId)
        .order('ngay_ban', { ascending: true })
        .order('id', { ascending: true });

      if (result.error) {
        return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
      }

      const rows = calculateRows((result.data ?? []) as SaleRawRow[]);
      const previousRemain = rows.length > 0 ? rows[rows.length - 1].conLai : 0;

      return NextResponse.json({
        success: true,
        data: {
          customerId,
          customerName: customer.name,
          con_lai: previousRemain,
          isFirstTicket: rows.length === 0,
        },
      });
    }

    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 20);
    const safeLimit = [10, 20, 50].includes(limit) ? limit : 20;
    const fromDate = searchParams.get('fromDate')?.trim() || '';
    const toDate = searchParams.get('toDate')?.trim() || '';

    if ((fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) || (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate))) {
      return NextResponse.json({ success: false, error: 'Định dạng ngày không hợp lệ (yyyy-MM-dd)' }, { status: 400 });
    }

    const rows = await fetchSalesRows(access.supabase);
    const filteredRows = rows.filter((row) => {
      const matchFromDate = !fromDate || row.ngay >= fromDate;
      const matchToDate = !toDate || row.ngay <= toDate;
      const matchCustomer = !customerId || row.customerId === customerId;
      return matchFromDate && matchToDate && matchCustomer;
    });

    const customerSummary = buildCustomerSummary(filteredRows);

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
      customerSummary,
      total,
      page: safePage,
      totalPages,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu bán hàng' },
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
  const typed = (body ?? {}) as Record<string, unknown>;
  const normalized = {
    ngayBan: (typed.ngay_ban as string | undefined) ?? (typed.ngayBan as string | undefined),
    soBo: toNumber((typed.so_bo as unknown) ?? typed.soBo),
    soTo: toNumber((typed.so_to as unknown) ?? typed.soTo),
    doRong: toNumber((typed.do_rong as unknown) ?? typed.doRong),
    doDay: toNumber((typed.do_day as unknown) ?? typed.doDay),
    doDai: toNumber((typed.do_dai as unknown) ?? typed.doDai),
    donGia: toNumber((typed.don_gia as unknown) ?? typed.donGia),
    congNoDau: toOptionalNumber((typed.cong_no_dau as unknown) ?? typed.congNoDau),
    thanhToan: toOptionalNumber((typed.so_tien_da_tra as unknown) ?? typed.thanhToan) ?? 0,
    khachHangId: toNumber((typed.khach_hang_id as unknown) ?? typed.khachHangId),
    ghiChu: (typed.ghi_chu as string | undefined) ?? (typed.ghiChu as string | undefined) ?? '',
  };

  const parsed = createSaleSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' },
      { status: 400 },
    );
  }

  try {
    const customer = await resolveCustomerById(access.supabase, parsed.data.khachHangId);
    const soPhieu = await generateSaleNo(access.supabase);
    const soKhoi = (parsed.data.soBo * parsed.data.soTo * parsed.data.doRong * parsed.data.doDay * parsed.data.doDai) / 1000000;
    const thanhTien = Math.max(0, soKhoi * parsed.data.donGia);
    const congNoDau = Math.max(0, parsed.data.congNoDau ?? 0);
    const thanhToan = Math.max(0, parsed.data.thanhToan ?? 0);

    const historyResult = await access.supabase
      .from('phieu_ban')
      .select('id, ngay_ban, so_bo, so_to, do_rong, do_day, do_dai, so_khoi, don_gia, cong_no_dau, thanh_tien, so_tien_da_tra, khach_hang_id, khach_hang, ghi_chu, customer:khach_hang_id(*)')
      .eq('khach_hang_id', parsed.data.khachHangId)
      .order('ngay_ban', { ascending: true })
      .order('id', { ascending: true });

    if (historyResult.error) {
      return NextResponse.json({ success: false, error: historyResult.error.message }, { status: 500 });
    }

    const historyRows = calculateRows((historyResult.data ?? []) as SaleRawRow[]);
    const previousRemain = historyRows.length > 0 ? historyRows[historyRows.length - 1].conLai : 0;
    const congNo = Math.max(0, congNoDau + thanhTien + previousRemain);
    const conLai = Math.max(0, congNo - thanhToan);

    const insertResult = await access.supabase
      .from('phieu_ban')
      .insert({
        so_phieu: soPhieu,
        ngay_ban: parsed.data.ngayBan ?? format(new Date(), 'yyyy-MM-dd'),
        khach_hang_id: customer.id,
        khach_hang: customer.name,
        so_bo: parsed.data.soBo,
        so_to: parsed.data.soTo,
        do_rong: parsed.data.doRong,
        do_day: parsed.data.doDay,
        do_dai: parsed.data.doDai,
        so_khoi: soKhoi,
        don_gia: parsed.data.donGia,
        cong_no_dau: congNoDau,
        thanh_tien: thanhTien,
        so_tien_da_tra: thanhToan,
        con_lai: conLai,
        ghi_chu: parsed.data.ghiChu || null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ success: false, error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (insertResult.data as { id: number }).id,
        soPhieu,
        customerName: customer.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tạo phiếu bán' },
      { status: 500 },
    );
  }
}