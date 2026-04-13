import 'server-only';

import { endOfMonth, format, startOfMonth } from 'date-fns';

import { createClient } from '@/lib/supabase/server';

export type Attendance = {
  workerId: number;
  status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  bonus: number;
  penalty: number;
};

export type DailyAttendanceRecord = {
  cong_nhan_id: number;
  trang_thai: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  thuong: number;
  phat: number;
};

export type SalaryDailyDetail = {
  date: string;
  status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  dailySalary: number;
  bonus: number;
  penalty: number;
  note: string;
};

export type MonthlySalaryRow = {
  workerId: number;
  workerName: string;
  employmentStatus: 'DangLam' | 'NghiViec';
  baseSalary: number;
  bonus: number;
  penalty: number;
  totalSalary: number;
  details: SalaryDailyDetail[];
};

type MetaData = {
  status?: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  bonus?: number;
  penalty?: number;
  note?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function parseMeta(ghiChu: unknown): MetaData {
  if (typeof ghiChu !== 'string' || !ghiChu.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(ghiChu) as MetaData;
    return {
      status: parsed.status,
      bonus: Number.isFinite(parsed.bonus) ? Number(parsed.bonus) : 0,
      penalty: Number.isFinite(parsed.penalty) ? Number(parsed.penalty) : 0,
      note: parsed.note,
    };
  } catch {
    return {};
  }
}

export function calculateDailySalary(
  totalAmount: number,
  attendanceRecords: Array<{
    cong_nhan_id: number;
    trang_thai: string;
    thuong: number;
    phat: number;
  }>,
): Map<number, number> {
  const presentWorkers = attendanceRecords.filter(
    (record) => record.trang_thai === 'CoMat' || record.trang_thai === 'LamThem',
  );
  if (presentWorkers.length === 0) return new Map();

  const baseSalary = totalAmount / presentWorkers.length;
  const result = new Map<number, number>();

  for (const worker of presentWorkers) {
    let salary = baseSalary;
    if (worker.thuong) salary += worker.thuong;
    if (worker.phat) salary -= worker.phat;
    result.set(worker.cong_nhan_id, salary);
  }

  return result;
}

export async function calculateMonthlySalary(
  month: Date,
  workerId?: number,
): Promise<MonthlySalaryRow[]> {
  const supabase = await createClient();

  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(month), 'yyyy-MM-dd');

  let workerQuery = supabase
    .from('cong_nhan')
    .select('id, ho_ten, trang_thai')
    .order('trang_thai', { ascending: true })
    .order('ho_ten', { ascending: true });

  if (workerId) {
    workerQuery = workerQuery.eq('id', workerId);
  }

  // Fetch workers, attendance records (for status and metadata), and monthly salary data from luong_thang
  const [workersResult, attendanceResult, monthlyDataResult, dailyTotalsResult] = await Promise.all([
    workerQuery,
    supabase
      .from('cham_cong')
      .select('cong_nhan_id, ngay, trang_thai, ghi_chu')
      .gte('ngay', start)
      .lte('ngay', end),
    supabase
      .from('luong_thang')
      .select('cong_nhan_id, tong_luong')
      .eq('thang', format(month, 'yyyy-MM-dd')),
    supabase
      .from('tong_tien_cong_ngay')
      .select('ngay, tong_tien')
      .gte('ngay', start)
      .lte('ngay', end),
  ]);

  if (workersResult.error) {
    throw new Error(workersResult.error.message);
  }
  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }
  if (monthlyDataResult.error) {
    throw new Error(monthlyDataResult.error.message);
  }
  if (dailyTotalsResult.error) {
    throw new Error(dailyTotalsResult.error.message);
  }

  // Build map of daily salary totals for creating daily details
  const dailyTotalsMap = new Map<string, number>();
  (dailyTotalsResult.data ?? []).forEach((row) => {
    const typed = row as { ngay: string; tong_tien: number | string };
    dailyTotalsMap.set(typed.ngay, toNumber(typed.tong_tien));
  });

  // Build maps for worker salary data and adjustments
  const baseSalaryByWorker = new Map<number, number>();

  (monthlyDataResult.data ?? []).forEach((row) => {
    const typed = row as { cong_nhan_id: number; tong_luong: number | string };
    baseSalaryByWorker.set(typed.cong_nhan_id, toNumber(typed.tong_luong));
  });

  // Build daily details from attendance records
  const detailsByWorker = new Map<number, SalaryDailyDetail[]>();
  const bonusByWorker = new Map<number, number>();
  const penaltyByWorker = new Map<number, number>();

  (attendanceResult.data ?? []).forEach((row) => {
    const typed = row as {
      cong_nhan_id: number;
      ngay: string;
      trang_thai: string;
      ghi_chu: string | null;
    };

    const meta = parseMeta(typed.ghi_chu);
    const status = meta.status ?? (typed.trang_thai as 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem');
    const bonus = toNumber(meta.bonus);
    const penalty = toNumber(meta.penalty);
    const dailySalary = dailyTotalsMap.get(typed.ngay) ?? 0;

    const detail: SalaryDailyDetail = {
      date: typed.ngay,
      status,
      dailySalary,
      bonus,
      penalty,
      note: meta.note ?? '',
    };

    const workerDetails = detailsByWorker.get(typed.cong_nhan_id) ?? [];
    workerDetails.push(detail);
    detailsByWorker.set(typed.cong_nhan_id, workerDetails);

    bonusByWorker.set(typed.cong_nhan_id, (bonusByWorker.get(typed.cong_nhan_id) ?? 0) + bonus);
    penaltyByWorker.set(typed.cong_nhan_id, (penaltyByWorker.get(typed.cong_nhan_id) ?? 0) + penalty);
  });

  // Build salary rows from workers and fetched data
  const rows: MonthlySalaryRow[] = (workersResult.data ?? []).map((row) => {
    const worker = row as { id: number; ho_ten: string; trang_thai: 'DangLam' | 'NghiViec' };
    const baseSalary = baseSalaryByWorker.get(worker.id) ?? 0;
    const bonus = bonusByWorker.get(worker.id) ?? 0;
    const penalty = penaltyByWorker.get(worker.id) ?? 0;
    const totalSalary = Math.max(0, baseSalary + bonus - penalty);

    const details = (detailsByWorker.get(worker.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));

    return {
      workerId: worker.id,
      workerName: worker.ho_ten,
      employmentStatus: worker.trang_thai,
      baseSalary,
      bonus,
      penalty,
      totalSalary,
      details,
    };
  });

  // Update luong_thang with any adjustments if present
  for (const row of rows) {
    const baseSalary = baseSalaryByWorker.get(row.workerId) ?? 0;
    // Only update if there's a salary row to persist.
    if (baseSalary > 0 || baseSalaryByWorker.has(row.workerId)) {
      const upsertResult = await supabase
        .from('luong_thang')
        .upsert(
          {
            cong_nhan_id: row.workerId,
            thang: month.getMonth() + 1,
            nam: month.getFullYear(),
            luong_co_ban: row.baseSalary,
            thuong: row.bonus,
            phat: row.penalty,
          },
          { onConflict: 'cong_nhan_id,thang,nam' },
        )
        .select('id')
        .single();

      if (upsertResult.error) {
        throw new Error(upsertResult.error.message);
      }
    }
  }

  return rows;
}

export async function recalculateAllSalaries(ngay: Date): Promise<void> {
  await calculateMonthlySalary(ngay);
}
