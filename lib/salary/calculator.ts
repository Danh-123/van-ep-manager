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

function isPresentStatus(status: Attendance['status']) {
  return status === 'CoMat' || status === 'LamThem';
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
  const presentWorkers = attendanceRecords.filter((record) => record.trang_thai === 'CoMat');
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

  const [workersResult, dailySummaryResult, attendanceResult, monthlyExistingResult] = await Promise.all([
    workerQuery,
    supabase
      .from('tong_tien_cong_ngay')
      .select('cong_nhan_id, ngay, tong_tien')
      .gte('ngay', start)
      .lte('ngay', end),
    supabase
      .from('cham_cong')
      .select('cong_nhan_id, ngay, thanh_tien, so_luong, ghi_chu')
      .gte('ngay', start)
      .lte('ngay', end),
    supabase
      .from('luong_thang')
      .select('cong_nhan_id, tong_da_thanh_toan')
      .eq('thang', month.getMonth() + 1)
      .eq('nam', month.getFullYear()),
  ]);

  if (workersResult.error) {
    throw new Error(workersResult.error.message);
  }
  if (dailySummaryResult.error) {
    throw new Error(dailySummaryResult.error.message);
  }
  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }
  if (monthlyExistingResult.error) {
    throw new Error(monthlyExistingResult.error.message);
  }

  const baseByWorker = new Map<number, number>();
  (dailySummaryResult.data ?? []).forEach((row) => {
    const typed = row as { cong_nhan_id: number; tong_tien: number | string };
    baseByWorker.set(typed.cong_nhan_id, (baseByWorker.get(typed.cong_nhan_id) ?? 0) + toNumber(typed.tong_tien));
  });

  const detailsByWorker = new Map<number, SalaryDailyDetail[]>();
  const bonusByWorker = new Map<number, number>();
  const penaltyByWorker = new Map<number, number>();

  (attendanceResult.data ?? []).forEach((row) => {
    const typed = row as {
      cong_nhan_id: number;
      ngay: string;
      thanh_tien: number | string;
      so_luong: number | string;
      ghi_chu: string | null;
    };

    const meta = parseMeta(typed.ghi_chu);
    const inferredStatus = meta.status ?? (toNumber(typed.so_luong) > 0 ? 'CoMat' : 'Nghi');
    const bonus = toNumber(meta.bonus);
    const penalty = toNumber(meta.penalty);

    const detail: SalaryDailyDetail = {
      date: typed.ngay,
      status: inferredStatus,
      dailySalary: toNumber(typed.thanh_tien),
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

  const paidByWorker = new Map<number, number>();
  (monthlyExistingResult.data ?? []).forEach((row) => {
    const typed = row as { cong_nhan_id: number; tong_da_thanh_toan: number | string };
    paidByWorker.set(typed.cong_nhan_id, toNumber(typed.tong_da_thanh_toan));
  });

  const rows: MonthlySalaryRow[] = (workersResult.data ?? []).map((row) => {
    const worker = row as { id: number; ho_ten: string; trang_thai: 'DangLam' | 'NghiViec' };
    const baseSalary = baseByWorker.get(worker.id) ?? 0;
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

  for (const row of rows) {
    const paid = Math.min(paidByWorker.get(row.workerId) ?? 0, row.totalSalary);

    const upsertResult = await supabase
      .from('luong_thang')
      .upsert(
        {
          cong_nhan_id: row.workerId,
          thang: month.getMonth() + 1,
          nam: month.getFullYear(),
          tong_tien_cong: row.totalSalary,
          tong_da_thanh_toan: paid,
          trang_thai:
            paid === 0
              ? 'ChuaChot'
              : paid < row.totalSalary
                ? 'DaThanhToanMotPhan'
                : 'DaThanhToanHet',
          closed_at: paid >= row.totalSalary && row.totalSalary > 0 ? new Date().toISOString() : null,
        },
        { onConflict: 'cong_nhan_id,thang,nam' },
      )
      .select('id')
      .single();

    if (upsertResult.error) {
      throw new Error(upsertResult.error.message);
    }
  }

  return rows;
}

export async function recalculateAllSalaries(ngay: Date): Promise<void> {
  await calculateMonthlySalary(ngay);
}
