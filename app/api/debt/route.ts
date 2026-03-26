import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const debtQuerySchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
});

type DebtTicket = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? '';
  const customerId = url.searchParams.get('customerId') ?? '';

  const filters = debtQuerySchema.safeParse({ search, customerId });
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
    const ticketResult = await supabase
      .from('phieu_can')
      .select('id, ngay_can, khoi_luong_tan, thanh_tien, so_tien_da_tra, khach_hang_id, xe_hang:xe_hang_id(bien_so), customer:khach_hang_id(*)')
      .not('khach_hang_id', 'is', null)
      .order('ngay_can', { ascending: false })
      .order('id', { ascending: false });

    if (ticketResult.error) {
      return NextResponse.json(
        { success: false, error: ticketResult.error.message },
        { status: 500 },
      );
    }

    const rows = (ticketResult.data ?? []).map((row) => {
      const typed = row as {
        id: number;
        khach_hang_id: number;
        ngay_can: string;
        khoi_luong_tan: number | string;
        thanh_tien: number | string;
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
      const xeHangRow = Array.isArray(typed.xe_hang) ? typed.xe_hang[0] : typed.xe_hang;
      const thanhTien = Math.max(0, toNumber(typed.thanh_tien));
      const daTra = Math.max(0, toNumber(typed.so_tien_da_tra));
      const conNo = Math.max(0, thanhTien - daTra);

      return {
        id: typed.id,
        customerId: typed.khach_hang_id,
        customerCode,
        customerName,
        customer: customerName,
        ngay: typed.ngay_can,
        xeSo: xeHangRow?.bien_so ?? '-',
        soTan: Number(typed.khoi_luong_tan) || 0,
        thanhTien,
        daTra,
        conNo,
      };
    }).filter((row): row is DebtTicket => row !== null && row.conNo > 0);

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

    const customerOptionMap = new Map<number, { id: number; code: string; name: string }>();
    rows.forEach((row) => {
      customerOptionMap.set(row.customerId, {
        id: row.customerId,
        code: row.customerCode,
        name: row.customerName,
      });
    });

    const customerOptions = Array.from(customerOptionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const groupsMap = new Map<number, CustomerDebtGroup>();
    filteredTickets.forEach((ticket) => {
      const existing = groupsMap.get(ticket.customerId);
      if (!existing) {
        groupsMap.set(ticket.customerId, {
          customerId: ticket.customerId,
          customerCode: ticket.customerCode,
          customerName: ticket.customerName,
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
