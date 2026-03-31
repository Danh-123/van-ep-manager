import 'server-only';

import { endOfMonth, format, startOfMonth } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';

type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

type AttendanceMeta = {
  status?: AttendanceStatus;
  bonus?: number;
  penalty?: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function parseMeta(raw: unknown): AttendanceMeta {
  if (typeof raw !== 'string' || !raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as AttendanceMeta;
    return {
      status: parsed.status,
      bonus: toNumber(parsed.bonus),
      penalty: toNumber(parsed.penalty),
    };
  } catch {
    return {};
  }
}

function isPresent(status: AttendanceStatus): boolean {
  return status === 'CoMat' || status === 'LamThem';
}

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);

  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Thang khong hop le');
  }

  return new Date(year, month - 1, 1);
}

export async function recalculateLuongThangByMonthKey(supabase: SupabaseClient, monthKey: string): Promise<void> {
  const monthDate = parseMonthKey(monthKey);
  const from = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const thang = format(startOfMonth(monthDate), 'yyyy-MM-dd');

  const [attendanceResult, dailyTotalResult] = await Promise.all([
    supabase
      .from('cham_cong')
      .select('cong_nhan_id, ngay, trang_thai, ghi_chu')
      .gte('ngay', from)
      .lte('ngay', to),
    supabase
      .from('tong_tien_cong_ngay')
      .select('ngay, tong_tien')
      .gte('ngay', from)
      .lte('ngay', to),
  ]);

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }
  if (dailyTotalResult.error) {
    throw new Error(dailyTotalResult.error.message);
  }

  const rows = (attendanceResult.data ?? []) as Array<{
    cong_nhan_id: number;
    ngay: string;
    trang_thai: AttendanceStatus;
    ghi_chu: string | null;
  }>;

  const totalByDay = new Map<string, number>();
  ((dailyTotalResult.data ?? []) as Array<{ ngay: string; tong_tien: number | string }>).forEach((row) => {
    totalByDay.set(row.ngay, toNumber(row.tong_tien));
  });

  const presentCountByDay = new Map<string, number>();
  rows.forEach((row) => {
    const meta = parseMeta(row.ghi_chu);
    const status = (meta.status ?? row.trang_thai ?? 'Nghi') as AttendanceStatus;
    if (!isPresent(status)) return;

    presentCountByDay.set(row.ngay, (presentCountByDay.get(row.ngay) ?? 0) + 1);
  });

  const baseByWorker = new Map<number, number>();
  const bonusByWorker = new Map<number, number>();
  const penaltyByWorker = new Map<number, number>();
  const workerIds = new Set<number>();

  rows.forEach((row) => {
    workerIds.add(row.cong_nhan_id);

    const meta = parseMeta(row.ghi_chu);
    const status = (meta.status ?? row.trang_thai ?? 'Nghi') as AttendanceStatus;
    const bonus = toNumber(meta.bonus);
    const penalty = toNumber(meta.penalty);

    if (isPresent(status)) {
      const dayTotal = totalByDay.get(row.ngay) ?? 0;
      const dayPresent = presentCountByDay.get(row.ngay) ?? 0;
      const base = dayPresent > 0 ? dayTotal / dayPresent : 0;
      baseByWorker.set(row.cong_nhan_id, (baseByWorker.get(row.cong_nhan_id) ?? 0) + base);
    }

    bonusByWorker.set(row.cong_nhan_id, (bonusByWorker.get(row.cong_nhan_id) ?? 0) + bonus);
    penaltyByWorker.set(row.cong_nhan_id, (penaltyByWorker.get(row.cong_nhan_id) ?? 0) + penalty);
  });

  const idList = Array.from(workerIds);

  if (idList.length === 0) {
    const clearResult = await supabase.from('luong_thang').delete().eq('thang', thang);
    if (clearResult.error) {
      throw new Error(clearResult.error.message);
    }
    return;
  }

  const staleDeleteResult = await supabase
    .from('luong_thang')
    .delete()
    .eq('thang', thang)
    .not('cong_nhan_id', 'in', `(${idList.join(',')})`);

  if (staleDeleteResult.error) {
    throw new Error(staleDeleteResult.error.message);
  }

  for (const workerId of idList) {
    const upsertResult = await supabase
      .from('luong_thang')
      .upsert(
        {
          thang,
          cong_nhan_id: workerId,
          luong_co_ban: baseByWorker.get(workerId) ?? 0,
          thuong: bonusByWorker.get(workerId) ?? 0,
          phat: penaltyByWorker.get(workerId) ?? 0,
        },
        { onConflict: 'thang,cong_nhan_id' },
      );

    if (upsertResult.error) {
      throw new Error(upsertResult.error.message);
    }
  }
}

export async function recalculateLuongThangByDate(supabase: SupabaseClient, date: string): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Ngay khong hop le');
  }

  await recalculateLuongThangByMonthKey(supabase, date.slice(0, 7));
}
