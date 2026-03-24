'use server';

import { subDays } from 'date-fns';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const debtFilterSchema = z.object({
  search: z.string().optional(),
  customer: z.string().optional(),
});

export type DebtStatus = 'DaThanhToan' | 'ThanhToanMotPhan' | 'ChuaThanhToan' | 'QuaHan';

export type DebtTicket = {
  id: number;
  customer: string;
  ngay: string;
  xeSo: string;
  thanhTien: number;
  daTra: number;
  conNo: number;
  createdAt: string;
  lastPaymentDate: string | null;
  status: DebtStatus;
  overdue: boolean;
};

export type CustomerDebtGroup = {
  customer: string;
  totalDebt: number;
  overdue: boolean;
  tickets: DebtTicket[];
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function getDebtStatus(ticket: {
  conNo: number;
  daTra: number;
  thanhTien: number;
  overdue: boolean;
}): DebtStatus {
  if (ticket.overdue && ticket.conNo > 0) return 'QuaHan';
  if (ticket.conNo <= 0) return 'DaThanhToan';
  if (ticket.daTra > 0 && ticket.daTra < ticket.thanhTien) return 'ThanhToanMotPhan';
  return 'ChuaThanhToan';
}

export async function getDebtReport(
  rawFilters: z.input<typeof debtFilterSchema>,
): Promise<
  ActionResult<{
    groups: CustomerDebtGroup[];
    totalDebt: number;
    customerOptions: string[];
  }>
> {
  const filters = debtFilterSchema.parse(rawFilters);

  try {
    const supabase = await createClient();

    let query = supabase
      .from('phieu_can')
      .select(
        'id, ngay_can, thanh_tien, so_tien_da_tra, khach_hang, created_at, xe_hang:xe_hang_id(bien_so)',
      )
      .order('ngay_can', { ascending: false })
      .order('id', { ascending: false });

    if (filters.search?.trim()) {
      query = query.ilike('khach_hang', `%${filters.search.trim()}%`);
    }

    if (filters.customer?.trim()) {
      query = query.eq('khach_hang', filters.customer.trim());
    }

    const [ticketResult, paymentResult] = await Promise.all([
      query,
      supabase
        .from('lich_su_thanh_toan')
        .select('phieu_can_id, ngay_thanh_toan')
        .not('phieu_can_id', 'is', null)
        .order('ngay_thanh_toan', { ascending: false }),
    ]);

    if (ticketResult.error) {
      return { success: false, error: ticketResult.error.message };
    }

    if (paymentResult.error) {
      return { success: false, error: paymentResult.error.message };
    }

    const lastPaymentByTicket = new Map<number, string>();
    (paymentResult.data ?? []).forEach((row) => {
      const typed = row as { phieu_can_id?: number; ngay_thanh_toan?: string };
      if (!typed.phieu_can_id || !typed.ngay_thanh_toan) return;
      if (!lastPaymentByTicket.has(typed.phieu_can_id)) {
        lastPaymentByTicket.set(typed.phieu_can_id, typed.ngay_thanh_toan);
      }
    });

    const overdueThreshold = subDays(new Date(), 30);

    const tickets: DebtTicket[] = (ticketResult.data ?? []).map((row) => {
      const typed = row as {
        id: number;
        ngay_can: string;
        thanh_tien: number | string;
        so_tien_da_tra?: number | string | null;
        khach_hang?: string | null;
        created_at: string;
        xe_hang?: { bien_so?: string } | null;
      };

      const thanhTien = toNumber(typed.thanh_tien);
      const daTra = Math.max(0, toNumber(typed.so_tien_da_tra));
      const conNo = Math.max(0, thanhTien - daTra);

      const customer = typed.khach_hang?.trim() || 'Khach le';
      const ngay = typed.ngay_can;
      const overdue = conNo > 0 && new Date(ngay) < overdueThreshold;
      const status = getDebtStatus({ conNo, daTra, thanhTien, overdue });

      return {
        id: typed.id,
        customer,
        ngay,
        xeSo: typed.xe_hang?.bien_so ?? '-',
        thanhTien,
        daTra,
        conNo,
        createdAt: typed.created_at,
        lastPaymentDate: lastPaymentByTicket.get(typed.id) ?? null,
        status,
        overdue,
      };
    });

    const customerOptions = Array.from(new Set(tickets.map((ticket) => ticket.customer))).sort((a, b) =>
      a.localeCompare(b),
    );

    const groupsMap = new Map<string, CustomerDebtGroup>();
    tickets.forEach((ticket) => {
      const existing = groupsMap.get(ticket.customer);
      if (!existing) {
        groupsMap.set(ticket.customer, {
          customer: ticket.customer,
          totalDebt: ticket.conNo,
          overdue: ticket.overdue,
          tickets: [ticket],
        });
        return;
      }

      existing.totalDebt += ticket.conNo;
      existing.overdue = existing.overdue || ticket.overdue;
      existing.tickets.push(ticket);
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
    const totalDebt = groups.reduce((sum, group) => sum + group.totalDebt, 0);

    return {
      success: true,
      data: {
        groups,
        totalDebt,
        customerOptions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bao cao cong no',
    };
  }
}
