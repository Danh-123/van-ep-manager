import { createClient } from '@/lib/supabase/server';

export const TEST_DATE = '2026-03-20';

export type TestWorker = {
  id: number;
  maCongNhan: string;
  hoTen: string;
};

export type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

type SeedAttendanceInput = {
  date: string;
  workerId: number;
  status: AttendanceStatus;
  note?: string;
};

function buildMeta(status: AttendanceStatus, note = '') {
  return JSON.stringify({ status, note });
}

export async function ensureTestWorkers(): Promise<TestWorker[]> {
  const supabase = await createClient();

  const baseWorkers = [
    { ma: 'TST-RC-001', ten: 'Test Recalc 01' },
    { ma: 'TST-RC-002', ten: 'Test Recalc 02' },
    { ma: 'TST-RC-003', ten: 'Test Recalc 03' },
    { ma: 'TST-RC-004', ten: 'Test Recalc 04' },
  ];

  for (const item of baseWorkers) {
    const existing = await supabase
      .from('cong_nhan')
      .select('id')
      .eq('ma_cong_nhan', item.ma)
      .maybeSingle();

    if (existing.error) {
      throw new Error(existing.error.message);
    }

    if (!existing.data) {
      const created = await supabase.from('cong_nhan').insert({
        ma_cong_nhan: item.ma,
        ho_ten: item.ten,
        trang_thai: 'DangLam',
      });

      if (created.error) {
        throw new Error(created.error.message);
      }
    }
  }

  const all = await supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten')
    .in('ma_cong_nhan', baseWorkers.map((item) => item.ma))
    .order('ma_cong_nhan', { ascending: true });

  if (all.error) {
    throw new Error(all.error.message);
  }

  return (all.data ?? []).map((row) => {
    const typed = row as { id: number; ma_cong_nhan: string; ho_ten: string };
    return {
      id: typed.id,
      maCongNhan: typed.ma_cong_nhan,
      hoTen: typed.ho_ten,
    };
  });
}

export async function resetDayData(date: string, workerIds: number[]) {
  const supabase = await createClient();

  const attendanceDelete = await supabase
    .from('cham_cong')
    .delete()
    .eq('ngay', date)
    .in('cong_nhan_id', workerIds);

  if (attendanceDelete.error) {
    throw new Error(attendanceDelete.error.message);
  }

  const dailyDelete = await supabase
    .from('tong_tien_cong_ngay')
    .delete()
    .eq('ngay', date)
    .in('cong_nhan_id', workerIds);

  if (dailyDelete.error) {
    throw new Error(dailyDelete.error.message);
  }
}

export async function upsertAttendanceRow(input: SeedAttendanceInput) {
  const supabase = await createClient();

  const soLuong = input.status === 'CoMat' || input.status === 'LamThem' ? 1 : 0;

  const upsertResult = await supabase
    .from('cham_cong')
    .upsert(
      {
        cong_nhan_id: input.workerId,
        ngay: input.date,
        so_luong: soLuong,
        don_gia: 0,
        ghi_chu: buildMeta(input.status, input.note ?? ''),
      },
      { onConflict: 'cong_nhan_id,ngay' },
    )
    .select('id')
    .single();

  if (upsertResult.error) {
    throw new Error(upsertResult.error.message);
  }
}

export async function distributeDailySalary(date: string, totalAmount: number) {
  const supabase = await createClient();

  const rowsRes = await supabase
    .from('cham_cong')
    .select('id, cong_nhan_id, ghi_chu')
    .eq('ngay', date)
    .order('cong_nhan_id', { ascending: true });

  if (rowsRes.error) {
    throw new Error(rowsRes.error.message);
  }

  const rows = (rowsRes.data ?? []).map((row) => {
    const typed = row as { id: number; cong_nhan_id: number; ghi_chu: string | null };
    let status: AttendanceStatus = 'Nghi';

    if (typed.ghi_chu) {
      try {
        const parsed = JSON.parse(typed.ghi_chu) as { status?: AttendanceStatus };
        if (parsed.status) status = parsed.status;
      } catch {
        status = 'Nghi';
      }
    }

    return {
      id: typed.id,
      workerId: typed.cong_nhan_id,
      status,
      meta: typed.ghi_chu,
    };
  });

  const presentRows = rows.filter((row) => row.status === 'CoMat' || row.status === 'LamThem');

  if (presentRows.length === 0) {
    throw new Error('Khong co cong nhan CoMat/LamThem de chia luong');
  }

  const perPerson = totalAmount / presentRows.length;

  for (const row of rows) {
    const present = row.status === 'CoMat' || row.status === 'LamThem';
    const update = await supabase
      .from('cham_cong')
      .update({
        so_luong: present ? 1 : 0,
        don_gia: present ? perPerson : 0,
      })
      .eq('id', row.id);

    if (update.error) {
      throw new Error(update.error.message);
    }
  }

  const recalc = await supabase.rpc('recalculate_luong_ngay', { p_ngay: date });
  if (recalc.error) {
    throw new Error(recalc.error.message);
  }

  return {
    perPerson,
    presentCount: presentRows.length,
  };
}

export async function seedScenarioA(date = TEST_DATE) {
  const workers = await ensureTestWorkers();
  await resetDayData(date, workers.map((w) => w.id));

  await upsertAttendanceRow({ date, workerId: workers[0].id, status: 'CoMat' });
  await upsertAttendanceRow({ date, workerId: workers[1].id, status: 'CoMat' });
  await upsertAttendanceRow({ date, workerId: workers[2].id, status: 'CoMat' });

  const distribution = await distributeDailySalary(date, 3_000_000);

  return {
    date,
    workers,
    distribution,
  };
}
