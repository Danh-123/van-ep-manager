import 'server-only';

import { endOfMonth, format, startOfMonth } from 'date-fns';

import { createClient } from '@/lib/supabase/server';

type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

type AttendanceMeta = {
  status?: AttendanceStatus;
  bonus?: number;
  penalty?: number;
  note?: string;
};

export type SalaryDetailRow = {
  ngay: string;
  trang_thai: AttendanceStatus;
  luong_ngay: number;
  thuong: number;
  phat: number;
  ghi_chu: string;
};

export type SalaryDetailPayload = {
  worker: {
    id: number;
    ho_ten: string;
    ma_cong_nhan: string;
  };
  month: string;
  total: number;
  details: SalaryDetailRow[];
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return {};
  }
}

function inferStatus(dbStatus: unknown, metaStatus: AttendanceStatus | undefined): AttendanceStatus {
  if (metaStatus === 'CoMat' || metaStatus === 'Nghi' || metaStatus === 'NghiPhep' || metaStatus === 'LamThem') {
    return metaStatus;
  }

  if (dbStatus === 'CoMat' || dbStatus === 'Nghi' || dbStatus === 'NghiPhep' || dbStatus === 'LamThem') {
    return dbStatus;
  }

  return 'Nghi';
}

function isPresent(status: AttendanceStatus) {
  return status === 'CoMat' || status === 'LamThem';
}

function toMonthRange(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Tháng không hợp lệ, định dạng đúng là YYYY-MM');
  }

  const date = new Date(year, month - 1, 1);
  return {
    from: format(startOfMonth(date), 'yyyy-MM-dd'),
    to: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export async function calculateDailySalaryDetails(workerId: number, monthKey: string): Promise<SalaryDetailPayload> {
  const supabase = await createClient();
  const { from, to } = toMonthRange(monthKey);

  const workerResult = await supabase
    .from('cong_nhan')
    .select('id, ho_ten, ma_cong_nhan')
    .eq('id', workerId)
    .maybeSingle();

  if (workerResult.error) {
    throw new Error(workerResult.error.message);
  }

  if (!workerResult.data) {
    throw new Error('Không tìm thấy công nhân');
  }

  const [workerAttendanceResult, allAttendanceResult, dailyTotalResult] = await Promise.all([
    supabase
      .from('cham_cong')
      .select('ngay, trang_thai, ghi_chu')
      .eq('cong_nhan_id', workerId)
      .gte('ngay', from)
      .lte('ngay', to)
      .order('ngay', { ascending: true }),
    supabase
      .from('cham_cong')
      .select('ngay, trang_thai, ghi_chu')
      .gte('ngay', from)
      .lte('ngay', to),
    supabase
      .from('tong_tien_cong_ngay')
      .select('ngay, tong_tien')
      .gte('ngay', from)
      .lte('ngay', to),
  ]);

  if (workerAttendanceResult.error) {
    throw new Error(workerAttendanceResult.error.message);
  }

  if (allAttendanceResult.error) {
    throw new Error(allAttendanceResult.error.message);
  }

  if (dailyTotalResult.error) {
    throw new Error(dailyTotalResult.error.message);
  }

  const totalByDay = new Map<string, number>();
  ((dailyTotalResult.data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
    const ngay = String(row.ngay ?? '');
    if (!ngay) return;
    totalByDay.set(ngay, (totalByDay.get(ngay) ?? 0) + toNumber(row.tong_tien));
  });

  const presentCountByDay = new Map<string, number>();
  ((allAttendanceResult.data as Array<Record<string, unknown>> | null) ?? []).forEach((row) => {
    const ngay = String(row.ngay ?? '');
    if (!ngay) return;

    const meta = parseMeta(row.ghi_chu);
    const status = inferStatus(row.trang_thai, meta.status);
    if (!isPresent(status)) return;

    presentCountByDay.set(ngay, (presentCountByDay.get(ngay) ?? 0) + 1);
  });

  const details: SalaryDetailRow[] = ((workerAttendanceResult.data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
    const ngay = String(row.ngay ?? '');
    const meta = parseMeta(row.ghi_chu);
    const status = inferStatus(row.trang_thai, meta.status);
    const presentCount = presentCountByDay.get(ngay) ?? 0;
    const totalDayAmount = totalByDay.get(ngay) ?? 0;

    const luongNgayBase = isPresent(status) && presentCount > 0 ? totalDayAmount / presentCount : 0;
    const thuong = toNumber(meta.bonus);
    const phat = toNumber(meta.penalty);

    return {
      ngay,
      trang_thai: status,
      luong_ngay: Math.max(0, luongNgayBase),
      thuong,
      phat,
      ghi_chu: meta.note ?? '',
    };
  });

  const total = details.reduce((sum, row) => sum + row.luong_ngay + row.thuong - row.phat, 0);

  const worker = workerResult.data as {
    id: number;
    ho_ten: string;
    ma_cong_nhan: string;
  };

  return {
    worker,
    month: monthKey,
    total: Math.max(0, total),
    details,
  };
}
