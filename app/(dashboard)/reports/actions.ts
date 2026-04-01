'use server';

import { format, startOfMonth } from 'date-fns';
import { z } from 'zod';

import { calculateMonthlySalary } from '@/lib/salary/calculator';
import { createClient } from '@/lib/supabase/server';

const rangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AttendanceReportRow = {
  date: string;
  presentCount: number;
  absentCount: number;
  totalSalary: number;
  details: Array<{ workerName: string; status: string; dailySalary: number; note: string }>;
};

export type SalaryReportRow = {
  monthKey: string;
  monthLabel: string;
  workerId: number;
  workerName: string;
  baseSalary: number;
  bonus: number;
  penalty: number;
  totalSalary: number;
};

export type RevenueReportRow = {
  id: number;
  date: string;
  truckNo: string;
  amount: number;
  paid: number;
  debt: number;
};

export type DebtReportTicket = {
  id: number;
  date: string;
  truckNo: string;
  amount: number;
  paid: number;
  debt: number;
  createdAt: string;
  lastPaymentDate: string | null;
  overdue: boolean;
};

export type DebtReportGroup = {
  customer: string;
  totalDebt: number;
  overdue: boolean;
  tickets: DebtReportTicket[];
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type AppRole = 'Admin' | 'KeToan' | 'Viewer';
type ViewerUserType = 'worker' | 'customer' | 'unknown';

type AccessContext = {
  userId: string;
  role: AppRole;
  userType: ViewerUserType;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function parseStatusFromMeta(metaText: unknown, fallbackPresent: boolean): string {
  if (typeof metaText === 'string' && metaText.trim()) {
    try {
      const parsed = JSON.parse(metaText) as { status?: string };
      if (parsed.status) return parsed.status;
    } catch {
      // Ignore invalid JSON and fallback.
    }
  }

  return fallbackPresent ? 'CoMat' : 'Nghi';
}

async function resolveAccessContext(): Promise<AccessContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Ban chua dang nhap');
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    throw new Error('Khong the xac thuc quyen truy cap');
  }

  const role = (profileResult.data.role ?? 'Viewer') as AppRole;
  if (role !== 'Viewer') {
    return {
      userId: user.id,
      role,
      userType: 'unknown',
    };
  }

  const [workerResult, customerResult] = await Promise.all([
    supabase.from('cong_nhan').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('khach_hang').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
  ]);

  if (workerResult.error || customerResult.error) {
    throw new Error(workerResult.error?.message ?? customerResult.error?.message ?? 'Khong the xac dinh loai tai khoan');
  }

  if (workerResult.data) {
    return {
      userId: user.id,
      role,
      userType: 'worker',
    };
  }

  if (customerResult.data) {
    return {
      userId: user.id,
      role,
      userType: 'customer',
    };
  }

  return {
    userId: user.id,
    role,
    userType: 'unknown',
  };
}

function canAccessAttendance(context: AccessContext) {
  return context.role !== 'Viewer' || context.userType === 'worker';
}

function canAccessSalary(context: AccessContext) {
  return context.role !== 'Viewer' || context.userType === 'worker';
}

function canAccessRevenue(context: AccessContext) {
  return context.role !== 'Viewer';
}

function canAccessDebt(context: AccessContext) {
  return context.role !== 'Viewer' || context.userType === 'customer';
}

function monthRange(startDate: string, endDate: string): Date[] {
  const start = startOfMonth(new Date(startDate));
  const end = startOfMonth(new Date(endDate));

  const months: Date[] = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return months;
}

export async function getAttendanceReport(
  input: z.input<typeof rangeSchema>,
): Promise<ActionResult<AttendanceReportRow[]>> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Khoang ngay khong hop le',
    };
  }

  try {
    const { startDate, endDate } = parsed.data;
    const context = await resolveAccessContext();

    if (!canAccessAttendance(context)) {
      return {
        success: false,
        error: 'Ban khong co quyen xem bao cao cham cong',
      };
    }

    const supabase = await createClient();

    const attendanceQuery = supabase
      .from('cham_cong')
      .select('ngay, trang_thai, ghi_chu, cong_nhan:cong_nhan_id(ho_ten, user_id)')
      .gte('ngay', startDate)
      .lte('ngay', endDate)
      .order('ngay', { ascending: false });

    const scopedAttendanceQuery =
      context.role === 'Viewer' && context.userType === 'worker'
        ? attendanceQuery.eq('cong_nhan.user_id', context.userId)
        : attendanceQuery;

    const [attendanceRes, totalsRes] = await Promise.all([
      scopedAttendanceQuery,
      supabase
        .from('tong_tien_cong_ngay')
        .select('ngay, tong_tien')
        .gte('ngay', startDate)
        .lte('ngay', endDate),
    ]);

    if (attendanceRes.error) return { success: false, error: attendanceRes.error.message };
    if (totalsRes.error) return { success: false, error: totalsRes.error.message };

    const salaryByDay = new Map<string, number>();
    (totalsRes.data ?? []).forEach((row) => {
      const typed = row as { ngay?: string; tong_tien?: number | string };
      if (!typed.ngay) return;
      salaryByDay.set(typed.ngay, (salaryByDay.get(typed.ngay) ?? 0) + toNumber(typed.tong_tien));
    });

    const map = new Map<string, AttendanceReportRow>();

    (attendanceRes.data ?? []).forEach((row) => {
      const typed = row as {
        ngay: string;
        trang_thai?: string | null;
        ghi_chu?: string | null;
        cong_nhan?: { ho_ten?: string } | null;
      };

      const presentFallback = typed.trang_thai === 'CoMat' || typed.trang_thai === 'LamThem';
      const status = parseStatusFromMeta(typed.ghi_chu, presentFallback);
      const isPresent = status === 'CoMat' || status === 'LamThem';

      const existing =
        map.get(typed.ngay) ?? {
          date: typed.ngay,
          presentCount: 0,
          absentCount: 0,
          totalSalary: salaryByDay.get(typed.ngay) ?? 0,
          details: [],
        };

      if (isPresent) existing.presentCount += 1;
      else existing.absentCount += 1;

      let note = '';
      if (typeof typed.ghi_chu === 'string' && typed.ghi_chu.trim()) {
        try {
          const parsedMeta = JSON.parse(typed.ghi_chu) as { note?: string };
          note = parsedMeta.note ?? '';
        } catch {
          note = '';
        }
      }

      existing.details.push({
        workerName: typed.cong_nhan?.ho_ten ?? 'Khong ro',
        status,
        dailySalary: 0,
        note,
      });

      map.set(typed.ngay, existing);
    });

    const rows = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    return { success: true, data: rows };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bao cao cham cong',
    };
  }
}

export async function getSalaryReport(
  input: z.input<typeof rangeSchema>,
): Promise<ActionResult<{ rows: SalaryReportRow[]; monthlyTotals: Record<string, number> }>> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Khoang ngay khong hop le',
    };
  }

  try {
    const { startDate, endDate } = parsed.data;
    const context = await resolveAccessContext();

    if (!canAccessSalary(context)) {
      return {
        success: false,
        error: 'Ban khong co quyen xem bao cao luong',
      };
    }

    if (context.role === 'Viewer') {
      const supabase = await createClient();
      const rangeStart = format(startOfMonth(new Date(startDate)), 'yyyy-MM-dd');
      const endMonthStart = startOfMonth(new Date(endDate));
      const rangeEndExclusive = format(
        new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() + 1, 1),
        'yyyy-MM-dd',
      );

      const { data, error } = await supabase
        .from('view_luong_ca_nhan')
        .select('thang, luong_co_ban, thuong, phat, tong_luong, ho_ten')
        .eq('user_id', context.userId)
        .gte('thang', rangeStart)
        .lt('thang', rangeEndExclusive)
        .order('thang', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const rows: SalaryReportRow[] = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
        const monthKey = String(row.thang ?? '').slice(0, 7);
        return {
          monthKey,
          monthLabel: monthKey ? `${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}` : '-',
          workerId: 0,
          workerName: String(row.ho_ten ?? 'Ca nhan'),
          baseSalary: toNumber(row.luong_co_ban),
          bonus: toNumber(row.thuong),
          penalty: toNumber(row.phat),
          totalSalary: toNumber(row.tong_luong),
        };
      });

      const monthlyTotals: Record<string, number> = {};
      rows.forEach((row) => {
        monthlyTotals[row.monthKey] = (monthlyTotals[row.monthKey] ?? 0) + row.totalSalary;
      });

      return {
        success: true,
        data: {
          rows,
          monthlyTotals,
        },
      };
    }

    const months = monthRange(startDate, endDate);

    const rows: SalaryReportRow[] = [];
    const monthlyTotals: Record<string, number> = {};

    for (const month of months) {
      const monthKey = format(month, 'yyyy-MM');
      const monthLabel = format(month, 'MM/yyyy');

      const monthRows = await calculateMonthlySalary(month);
      monthRows.forEach((row) => {
        rows.push({
          monthKey,
          monthLabel,
          workerId: row.workerId,
          workerName: row.workerName,
          baseSalary: row.baseSalary,
          bonus: row.bonus,
          penalty: row.penalty,
          totalSalary: row.totalSalary,
        });
      });

      monthlyTotals[monthKey] = monthRows.reduce((sum, row) => sum + row.totalSalary, 0);
    }

    rows.sort((a, b) => (a.monthKey === b.monthKey ? a.workerName.localeCompare(b.workerName) : b.monthKey.localeCompare(a.monthKey)));

    return {
      success: true,
      data: {
        rows,
        monthlyTotals,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bao cao luong',
    };
  }
}

export async function getRevenueReport(
  input: z.input<typeof rangeSchema>,
): Promise<
  ActionResult<{
    rows: RevenueReportRow[];
    daily: Array<{ date: string; revenue: number }>;
    totals: { revenue: number; paid: number; debt: number };
  }>
> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Khoang ngay khong hop le',
    };
  }

  try {
    const { startDate, endDate } = parsed.data;
    const context = await resolveAccessContext();

    if (!canAccessRevenue(context)) {
      return {
        success: false,
        error: 'Ban khong co quyen xem bao cao doanh thu',
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('phieu_can')
      .select('id, ngay_can, thanh_tien, so_tien_da_tra, xe_hang:xe_hang_id(bien_so)')
      .gte('ngay_can', startDate)
      .lte('ngay_can', endDate)
      .order('ngay_can', { ascending: false })
      .order('id', { ascending: false });

    if (error) return { success: false, error: error.message };

    const rows: RevenueReportRow[] = (data ?? []).map((row) => {
      const typed = row as {
        id: number;
        ngay_can: string;
        thanh_tien: number | string;
        so_tien_da_tra?: number | string | null;
        xe_hang?: { bien_so?: string } | null;
      };

      const amount = toNumber(typed.thanh_tien);
      const paid = Math.max(0, toNumber(typed.so_tien_da_tra));
      const debt = Math.max(0, amount - paid);

      return {
        id: typed.id,
        date: typed.ngay_can,
        truckNo: typed.xe_hang?.bien_so ?? '-',
        amount,
        paid,
        debt,
      };
    });

    const dailyMap = new Map<string, number>();
    rows.forEach((row) => {
      dailyMap.set(row.date, (dailyMap.get(row.date) ?? 0) + row.amount);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totals = rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.amount,
        paid: acc.paid + row.paid,
        debt: acc.debt + row.debt,
      }),
      { revenue: 0, paid: 0, debt: 0 },
    );

    return {
      success: true,
      data: {
        rows,
        daily,
        totals,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bao cao doanh thu',
    };
  }
}

export async function getDebtReport(
  input: z.input<typeof rangeSchema>,
): Promise<ActionResult<{ groups: DebtReportGroup[]; totalDebt: number }>> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Khoang ngay khong hop le',
    };
  }

  try {
    const { startDate, endDate } = parsed.data;
    const context = await resolveAccessContext();

    if (!canAccessDebt(context)) {
      return {
        success: false,
        error: 'Ban khong co quyen xem bao cao cong no',
      };
    }

    if (context.role === 'Viewer' && context.userType === 'customer') {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('view_cong_no_ca_nhan')
        .select('id, ngay, bien_so_xe, thanh_tien, thanh_toan, con_lai, ten_khach_hang')
        .eq('user_id', context.userId)
        .gte('ngay', startDate)
        .lte('ngay', endDate)
        .order('ngay', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const groupsMap = new Map<string, DebtReportGroup>();
      ((data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
        const amount = toNumber(row.thanh_tien);
        const paid = Math.max(0, toNumber(row.thanh_toan));
        const debt = Math.max(0, toNumber(row.con_lai));
        const customer = String(row.ten_khach_hang ?? 'Khach hang');

        const ticket: DebtReportTicket = {
          id: toNumber(row.id),
          date: String(row.ngay ?? ''),
          truckNo: String(row.bien_so_xe ?? '-'),
          amount,
          paid,
          debt,
          createdAt: '',
          lastPaymentDate: null,
          overdue: false,
        };

        const existing = groupsMap.get(customer);
        if (!existing) {
          groupsMap.set(customer, {
            customer,
            totalDebt: debt,
            overdue: false,
            tickets: [ticket],
          });
          return;
        }

        existing.totalDebt += debt;
        existing.tickets.push(ticket);
      });

      const groups = Array.from(groupsMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
      const totalDebt = groups.reduce((sum, item) => sum + item.totalDebt, 0);

      return {
        success: true,
        data: {
          groups,
          totalDebt,
        },
      };
    }

    const supabase = await createClient();

    const [ticketRes, paymentRes] = await Promise.all([
      supabase
        .from('phieu_can')
        .select('id, ngay_can, thanh_tien, so_tien_da_tra, khach_hang, created_at, xe_hang:xe_hang_id(bien_so)')
        .gte('ngay_can', startDate)
        .lte('ngay_can', endDate)
        .order('ngay_can', { ascending: false }),
      supabase
        .from('lich_su_thanh_toan')
        .select('phieu_can_id, ngay_thanh_toan')
        .not('phieu_can_id', 'is', null)
        .order('ngay_thanh_toan', { ascending: false }),
    ]);

    if (ticketRes.error) return { success: false, error: ticketRes.error.message };
    if (paymentRes.error) return { success: false, error: paymentRes.error.message };

    const lastPaymentByTicket = new Map<number, string>();
    (paymentRes.data ?? []).forEach((row) => {
      const typed = row as { phieu_can_id?: number; ngay_thanh_toan?: string };
      if (!typed.phieu_can_id || !typed.ngay_thanh_toan) return;
      if (!lastPaymentByTicket.has(typed.phieu_can_id)) {
        lastPaymentByTicket.set(typed.phieu_can_id, typed.ngay_thanh_toan);
      }
    });

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);

    const groupsMap = new Map<string, DebtReportGroup>();

    (ticketRes.data ?? []).forEach((row) => {
      const typed = row as {
        id: number;
        ngay_can: string;
        thanh_tien: number | string;
        so_tien_da_tra?: number | string | null;
        khach_hang?: string | null;
        created_at: string;
        xe_hang?: { bien_so?: string } | null;
      };

      const amount = toNumber(typed.thanh_tien);
      const paid = Math.max(0, toNumber(typed.so_tien_da_tra));
      const debt = Math.max(0, amount - paid);
      const overdue = debt > 0 && new Date(typed.ngay_can) < threshold;

      const ticket: DebtReportTicket = {
        id: typed.id,
        date: typed.ngay_can,
        truckNo: typed.xe_hang?.bien_so ?? '-',
        amount,
        paid,
        debt,
        createdAt: typed.created_at,
        lastPaymentDate: lastPaymentByTicket.get(typed.id) ?? null,
        overdue,
      };

      const customer = typed.khach_hang?.trim() || 'Khach le';
      const existing = groupsMap.get(customer);
      if (!existing) {
        groupsMap.set(customer, {
          customer,
          totalDebt: debt,
          overdue,
          tickets: [ticket],
        });
        return;
      }

      existing.totalDebt += debt;
      existing.overdue = existing.overdue || overdue;
      existing.tickets.push(ticket);
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
    const totalDebt = groups.reduce((sum, item) => sum + item.totalDebt, 0);

    return {
      success: true,
      data: {
        groups,
        totalDebt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai bao cao cong no',
    };
  }
}
