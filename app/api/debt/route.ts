import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const debtQuerySchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  loaiKhachHang: z.enum(['mua', 'ban']).optional(),
});

type CustomerType = 'mua' | 'ban';

type DebtTicket = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  customer: string;
  ngay: string;
  xeSo: string;
  soTan: number;
  thanhTien: number;
  daTra: number;
  conNo: number;
};

type CustomerDebtGroup = {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  customer: string;
  totalDebt: number;
  tickets: DebtTicket[];
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCustomerCode(customer: Record<string, unknown>) {
  return (
    (customer.ma_khach_hang as string | undefined) ??
    (customer.ma as string | undefined) ??
    (customer.code as string | undefined) ??
    `KH-${String(customer.id ?? '').trim()}`
  );
}

function resolveCustomerName(customer: Record<string, unknown>) {
  return (
    (customer.ten_khach_hang as string | undefined) ??
    (customer.ten as string | undefined) ??
    (customer.name as string | undefined) ??
    (customer.ho_ten as string | undefined) ??
    'Không rõ'
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

function resolveCustomerType(customer: Record<string, unknown>) {
  return (customer.loai_khach_hang as string | undefined) === 'ban' ? 'ban' : 'mua';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? '';
  const customerId = url.searchParams.get('customerId') ?? '';
  const loaiKhachHang = url.searchParams.get('loaiKhachHang') ?? '';

  const filters = debtQuerySchema.safeParse({ search, customerId, loaiKhachHang });
  if (!filters.success) {
    return NextResponse.json(
      { success: false, error: filters.error.issues[0]?.message ?? 'Tham số không hợp lệ' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Bạn chưa đăng nhập' }, { status: 401 });
  }

  try {
    const selectedType = filters.data.loaiKhachHang;

    const truckTicketsPromise =
      selectedType === 'ban'
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('phieu_can')
            .select('id, ngay_can, khoi_luong_tan, thanh_tien, cong_no_dau, so_tien_da_tra, khach_hang_id, xe_hang:xe_hang_id(bien_so), customer:khach_hang_id(*)')
            .not('khach_hang_id', 'is', null)
            .order('ngay_can', { ascending: false })
            .order('id', { ascending: false });

    const saleTicketsPromise =
      selectedType === 'mua'
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('phieu_ban')
            .select('id, ngay_ban, so_khoi, thanh_tien, cong_no_dau, so_tien_da_tra, khach_hang_id, customer:khach_hang_id(*)')
            .not('khach_hang_id', 'is', null)
            .order('ngay_ban', { ascending: false })
            .order('id', { ascending: false });

    const [truckTickets, saleTickets] = await Promise.all([truckTicketsPromise, saleTicketsPromise]);

    if (truckTickets.error) {
      return NextResponse.json({ success: false, error: truckTickets.error.message }, { status: 500 });
    }

    if (saleTickets.error) {
      return NextResponse.json({ success: false, error: saleTickets.error.message }, { status: 500 });
    }

    const truckRows = (truckTickets.data ?? []).map((row) => {
      const typed = row as {
        id: number;
        khach_hang_id: number;
        ngay_can: string;
        khoi_luong_tan: number | string;
        thanh_tien: number | string;
        cong_no_dau: number | string | null;
        so_tien_da_tra?: number | string | null;
        xe_hang?: { bien_so?: string }[] | { bien_so?: string } | null;
        customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
      };

      const customerRow = Array.isArray(typed.customer) ? typed.customer[0] : typed.customer;
      if (!customerRow || !typed.khach_hang_id) {
        return null;
      }

      const customerCode = resolveCustomerCode(customerRow).trim();
      const customerName = resolveCustomerName(customerRow).trim();
      const customerPhone = resolveCustomerPhone(customerRow).trim();
      const customerType = resolveCustomerType(customerRow);
      if (customerType !== 'mua') {
        return null;
      }

      const xeHangRow = Array.isArray(typed.xe_hang) ? typed.xe_hang[0] : typed.xe_hang;
      const thanhTien = Math.max(0, toNumber(typed.thanh_tien));
      const congNoDau = Math.max(0, toNumber(typed.cong_no_dau));
      const daTra = Math.max(0, toNumber(typed.so_tien_da_tra));
      const conNo = Math.max(0, congNoDau + thanhTien - daTra);

      return {
        id: typed.id,
        customerId: typed.khach_hang_id,
        customerCode,
        customerName,
        customerPhone,
        customerType,
        customer: customerName,
        ngay: typed.ngay_can,
        xeSo: xeHangRow?.bien_so ?? '-',
        soTan: Number(typed.khoi_luong_tan) || 0,
        thanhTien,
        daTra,
        conNo,
      } satisfies DebtTicket;
    });

    const saleRows = (saleTickets.data ?? []).map((row) => {
      const typed = row as {
        id: number;
        khach_hang_id: number;
        ngay_ban: string;
        so_khoi: number | string;
        thanh_tien: number | string;
        cong_no_dau: number | string | null;
        so_tien_da_tra?: number | string | null;
        customer?: Record<string, unknown> | Array<Record<string, unknown>> | null;
      };

      const customerRow = Array.isArray(typed.customer) ? typed.customer[0] : typed.customer;
      if (!customerRow || !typed.khach_hang_id) {
        return null;
      }

      const customerCode = resolveCustomerCode(customerRow).trim();
      const customerName = resolveCustomerName(customerRow).trim();
      const customerPhone = resolveCustomerPhone(customerRow).trim();
      const customerType = resolveCustomerType(customerRow);
      if (customerType !== 'ban') {
        return null;
      }

      const thanhTien = Math.max(0, toNumber(typed.thanh_tien));
      const congNoDau = Math.max(0, toNumber(typed.cong_no_dau));
      const daTra = Math.max(0, toNumber(typed.so_tien_da_tra));
      const conNo = Math.max(0, congNoDau + thanhTien - daTra);

      return {
        id: typed.id,
        customerId: typed.khach_hang_id,
        customerCode,
        customerName,
        customerPhone,
        customerType,
        customer: customerName,
        ngay: typed.ngay_ban,
        xeSo: 'Phiếu bán',
        soTan: Number(typed.so_khoi) || 0,
        thanhTien,
        daTra,
        conNo,
      } satisfies DebtTicket;
    });

    const rows = [...truckRows, ...saleRows].filter((row): row is DebtTicket => row !== null && row.conNo > 0);

    const loweredSearch = filters.data.search?.trim().toLowerCase() || '';
    const selectedCustomerId = Number(filters.data.customerId || 0);

    const filteredTickets = rows.filter((row) => {
      const matchesSearch =
        !loweredSearch ||
        row.customerName.toLowerCase().includes(loweredSearch) ||
        row.customerCode.toLowerCase().includes(loweredSearch);
      const matchesCustomer = !selectedCustomerId || row.customerId === selectedCustomerId;
      return matchesSearch && matchesCustomer;
    });

    const customerOptionMap = new Map<string, { id: number; code: string; name: string; phone: string; type: CustomerType }>();
    rows.forEach((row) => {
      customerOptionMap.set(`${row.customerId}:${row.customerType}`, {
        id: row.customerId,
        code: row.customerCode,
        name: row.customerName,
        phone: row.customerPhone,
        type: row.customerType,
      });
    });

    const customerOptions = Array.from(customerOptionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const groupsMap = new Map<string, CustomerDebtGroup>();
    filteredTickets.forEach((ticket) => {
      const groupKey = `${ticket.customerId}:${ticket.customerType}`;
      const existing = groupsMap.get(groupKey);
      if (!existing) {
        groupsMap.set(groupKey, {
          customerId: ticket.customerId,
          customerCode: ticket.customerCode,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          customerType: ticket.customerType,
          customer: ticket.customerName,
          totalDebt: ticket.conNo,
          tickets: [ticket],
        });
        return;
      }

      existing.totalDebt += ticket.conNo;
      existing.tickets.push(ticket);
    });

    const groups = Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        tickets: group.tickets.sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime()),
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt);
    const totalDebt = groups.reduce((sum, group) => sum + group.totalDebt, 0);

    return NextResponse.json({
      success: true,
      data: {
        groups,
        totalDebt,
        customerOptions,
        loaiKhachHang: filters.data.loaiKhachHang ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tải báo cáo công nợ',
      },
      { status: 500 },
    );
  }
}
