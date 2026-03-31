import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recalculateLuongThangByMonthKey } from '@/lib/salary/recalculateMonthly';
import { createClient } from '@/lib/supabase/server';

type SalaryRowResponse = {
  workerId: number;
  hoTen: string;
  baseSalary: number;
  bonus: number;
  penalty: number;
  totalSalary: number;
};

type SalaryMonthDataResponse = {
  month: string;
  monthLabel: string;
  rows: SalaryRowResponse[];
  totals: {
    baseSalary: number;
    bonus: number;
    penalty: number;
    totalSalary: number;
  };
};

type ViewSalaryRow = {
  thang: string;
  luong_co_ban: number;
  thuong: number;
  phat: number;
  tong_luong: number;
  ho_ten: string;
  ma_cong_nhan: string;
};

type AttendanceMeta = {
  status?: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  bonus?: number;
  penalty?: number;
  note?: string;
  salaryAdjustment?: boolean;
};

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Tháng không hợp lệ, định dạng đúng là YYYY-MM');

const recalculateBodySchema = z.object({
  action: z.literal('recalculate'),
  month: monthSchema,
});

const adjustBodySchema = z.object({
  action: z.literal('adjust'),
  month: monthSchema,
  adjustments: z.array(
    z.object({
      workerId: z.number().int().positive(),
      bonus: z.number().min(0),
      penalty: z.number().min(0),
    }),
  ),
});

function parseMonth(month: string) {
  const [year, monthValue] = month.split('-').map(Number);

  if (!year || !monthValue || monthValue < 1 || monthValue > 12) {
    throw new Error('Tháng không hợp lệ');
  }

  return new Date(year, monthValue - 1, 1);
}

function parseMeta(raw: string | null): AttendanceMeta {
  if (!raw) return {};

  try {
    return JSON.parse(raw) as AttendanceMeta;
  } catch {
    return {};
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function monthStart(monthKey: string) {
  return `${monthKey}-01`;
}

function monthEndExclusive(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month, 1);
  return format(date, 'yyyy-MM-dd');
}

function toMonthPayload(monthKey: string, rows: SalaryRowResponse[]): SalaryMonthDataResponse {
  const totals = rows.reduce(
    (acc, row) => ({
      baseSalary: acc.baseSalary + row.baseSalary,
      bonus: acc.bonus + row.bonus,
      penalty: acc.penalty + row.penalty,
      totalSalary: acc.totalSalary + row.totalSalary,
    }),
    { baseSalary: 0, bonus: 0, penalty: 0, totalSalary: 0 },
  );

  return {
    month: monthKey,
    monthLabel: format(parseMonth(monthKey), 'MM/yyyy'),
    rows,
    totals,
  };
}

async function loadMonthFromView(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string,
): Promise<SalaryMonthDataResponse> {
  const from = monthStart(monthKey);
  const to = monthEndExclusive(monthKey);

  const [viewResult, workersResult] = await Promise.all([
    supabase
      .from('view_luong_ca_nhan')
      .select('thang, luong_co_ban, thuong, phat, tong_luong, ho_ten, ma_cong_nhan')
      .gte('thang', from)
      .lt('thang', to)
      .order('ho_ten', { ascending: true }),
    supabase.from('cong_nhan').select('id, ma_cong_nhan, ho_ten'),
  ]);

  if (viewResult.error) {
    throw new Error(viewResult.error.message);
  }
  if (workersResult.error) {
    throw new Error(workersResult.error.message);
  }

  const workers = (workersResult.data ?? []) as Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>;
  const idByCode = new Map<string, number>();
  workers.forEach((worker) => idByCode.set(worker.ma_cong_nhan, worker.id));

  const viewRows = (viewResult.data ?? []) as Array<Record<string, unknown>>;
  const mappedRows: SalaryRowResponse[] = viewRows.map((row) => {
    const typed = row as unknown as ViewSalaryRow;

    return {
      workerId: idByCode.get(String(typed.ma_cong_nhan ?? '')) ?? 0,
      hoTen: String(typed.ho_ten ?? ''),
      baseSalary: toNumber(typed.luong_co_ban),
      bonus: toNumber(typed.thuong),
      penalty: toNumber(typed.phat),
      totalSalary: toNumber(typed.tong_luong),
    };
  });

  return toMonthPayload(monthKey, mappedRows);
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

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return { ok: false as const, status: 403, error: 'Không thể xác thực quyền truy cập' };
  }

  if (profileResult.data.role === 'Viewer') {
    return { ok: false as const, status: 403, error: 'Bạn không có quyền truy cập chức năng tính lương' };
  }

  return { ok: true as const, supabase };
}

export async function GET(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? '';
  const parsedMonth = monthSchema.safeParse(month);

  if (!parsedMonth.success) {
    return NextResponse.json({ error: parsedMonth.error.issues[0]?.message ?? 'Tháng không hợp lệ' }, { status: 400 });
  }

  try {
    const payload = await loadMonthFromView(access.supabase, parsedMonth.data);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tải dữ liệu lương tháng' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = recalculateBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    await recalculateLuongThangByMonthKey(access.supabase, parsed.data.month);

    const payload = await loadMonthFromView(access.supabase, parsed.data.month);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tính lại lương tháng' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await ensureManagerAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = adjustBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    const monthDate = parseMonth(parsed.data.month);
    const firstDay = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd');
    const lastDay = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd');

    for (const adjustment of parsed.data.adjustments) {
      // Fetch cham_cong records for the month to find where to store adjustments
      const monthlyRowsResult = await access.supabase
        .from('cham_cong')
        .select('id, ngay, ghi_chu')
        .eq('cong_nhan_id', adjustment.workerId)
        .gte('ngay', firstDay)
        .lte('ngay', lastDay)
        .order('ngay', { ascending: true });

      if (monthlyRowsResult.error) {
        return NextResponse.json({ error: monthlyRowsResult.error.message }, { status: 500 });
      }

      const rows = (monthlyRowsResult.data ?? []) as Array<{
        id: number;
        ngay: string;
        ghi_chu: string | null;
      }>;

      // Find adjustment row or first day row to update
      const adjustmentRow = rows.find((row) => parseMeta(row.ghi_chu).salaryAdjustment === true);
      const firstDayRow = rows.find((row) => row.ngay === firstDay);
      const targetRow = adjustmentRow ?? firstDayRow;

      if (targetRow) {
        // Update existing record with new bonus/penalty in metadata
        const currentMeta = parseMeta(targetRow.ghi_chu);

        const updateResult = await access.supabase
          .from('cham_cong')
          .update({
            ghi_chu: JSON.stringify({
              status: currentMeta.status ?? 'Nghi',
              bonus: adjustment.bonus,
              penalty: adjustment.penalty,
              note: currentMeta.note ?? '',
              salaryAdjustment: true,
            }),
          })
          .eq('id', targetRow.id);

        if (updateResult.error) {
          return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
        }
      } else {
        // Create new adjustment record on first day of month
        const insertResult = await access.supabase.from('cham_cong').insert({
          cong_nhan_id: adjustment.workerId,
          ngay: firstDay,
          trang_thai: 'Nghi',
          ghi_chu: JSON.stringify({
            status: 'Nghi',
            bonus: adjustment.bonus,
            penalty: adjustment.penalty,
            note: 'Điều chỉnh lương tháng',
            salaryAdjustment: true,
          }),
        });

        if (insertResult.error) {
          return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
        }
      }
    }

    await recalculateLuongThangByMonthKey(access.supabase, parsed.data.month);

    const payload = await loadMonthFromView(access.supabase, parsed.data.month);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật thưởng/phạt' },
      { status: 500 },
    );
  }
}
