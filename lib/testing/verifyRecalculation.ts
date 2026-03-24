import { createClient } from '@/lib/supabase/server';

import type { AttendanceStatus } from '@/lib/testing/seedData';

export type DaySalaryRow = {
  workerId: number;
  workerName: string;
  status: AttendanceStatus;
  donGia: number;
  soLuong: number;
  thanhTien: number;
};

function parseStatus(metaText: string | null): AttendanceStatus {
  if (!metaText) return 'Nghi';

  try {
    const parsed = JSON.parse(metaText) as { status?: AttendanceStatus };
    return parsed.status ?? 'Nghi';
  } catch {
    return 'Nghi';
  }
}

export async function getDaySalaryRows(date: string, workerIds?: number[]) {
  const supabase = await createClient();

  let query = supabase
    .from('cham_cong')
    .select('cong_nhan_id, so_luong, don_gia, thanh_tien, ghi_chu, cong_nhan:cong_nhan_id(ho_ten)')
    .eq('ngay', date)
    .order('cong_nhan_id', { ascending: true });

  if (workerIds && workerIds.length > 0) {
    query = query.in('cong_nhan_id', workerIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const typed = row as {
      cong_nhan_id: number;
      so_luong: number | string;
      don_gia: number | string;
      thanh_tien: number | string;
      ghi_chu: string | null;
      cong_nhan?: { ho_ten?: string } | null;
    };

    return {
      workerId: typed.cong_nhan_id,
      workerName: typed.cong_nhan?.ho_ten ?? `CN-${typed.cong_nhan_id}`,
      status: parseStatus(typed.ghi_chu),
      soLuong: Number(typed.so_luong) || 0,
      donGia: Number(typed.don_gia) || 0,
      thanhTien: Number(typed.thanh_tien) || 0,
    } satisfies DaySalaryRow;
  });
}

export async function verifyDistribution(params: {
  date: string;
  expectedPresentCount: number;
  expectedPerPerson: number;
  tolerance?: number;
  workerIds?: number[];
}) {
  const rows = await getDaySalaryRows(params.date, params.workerIds);
  const tolerance = params.tolerance ?? 1;

  const presentRows = rows.filter((row) => row.status === 'CoMat' || row.status === 'LamThem');

  const salaryMismatches = presentRows.filter(
    (row) => Math.abs(row.donGia - params.expectedPerPerson) > tolerance,
  );

  return {
    pass:
      presentRows.length === params.expectedPresentCount && salaryMismatches.length === 0,
    expectedPresentCount: params.expectedPresentCount,
    actualPresentCount: presentRows.length,
    expectedPerPerson: params.expectedPerPerson,
    rows,
    salaryMismatches,
  };
}
