'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const attendanceStatusSchema = z.enum(['CoMat', 'Nghi', 'NghiPhep', 'LamThem']);

const updateAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  congNhanId: z.number().int().positive(),
  status: attendanceStatusSchema,
  checkIn: z.string().optional().or(z.literal('')),
  checkOut: z.string().optional().or(z.literal('')),
  bonus: z.number().min(0),
  penalty: z.number().min(0),
  note: z.string().max(1000).optional().or(z.literal('')),
});

const saveDailySalarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().min(0, 'Tong tien cong phai lon hon hoac bang 0'),
});

type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

type AttendanceMeta = {
  status?: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  bonus?: number;
  penalty?: number;
  note?: string;
};

export type AttendanceRow = {
  congNhanId: number;
  maCongNhan: string;
  hoTen: string;
  employmentStatus: 'DangLam' | 'NghiViec';
  attendanceId: number | null;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  bonus: number;
  penalty: number;
  note: string;
  computedSalary: number;
};

export type AttendanceData = {
  date: string;
  rows: AttendanceRow[];
  markedDates: string[];
  dailyTotalSalary: number;
  presentCount: number;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function parseMeta(ghiChu: unknown): AttendanceMeta {
  if (typeof ghiChu !== 'string' || !ghiChu.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(ghiChu) as AttendanceMeta;
    return {
      status: parsed.status,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      bonus: Number.isFinite(parsed.bonus) ? Number(parsed.bonus) : 0,
      penalty: Number.isFinite(parsed.penalty) ? Number(parsed.penalty) : 0,
      note: parsed.note,
    };
  } catch {
    return {};
  }
}

function serializeMeta(meta: AttendanceMeta): string {
  return JSON.stringify({
    status: meta.status,
    checkIn: meta.checkIn ?? '',
    checkOut: meta.checkOut ?? '',
    bonus: meta.bonus ?? 0,
    penalty: meta.penalty ?? 0,
    note: meta.note ?? '',
  });
}

function isPresentStatus(status: AttendanceStatus): boolean {
  return status === 'CoMat' || status === 'LamThem';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function getMonthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0);

  const toIsoDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: toIsoDate(startDate),
    end: toIsoDate(endDate),
  };
}

export async function getAttendanceByDate(
  date: string,
  month: string,
): Promise<ActionResult<AttendanceData>> {
  const supabase = await createClient();

  const workersResult = await supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, trang_thai')
    .order('trang_thai', { ascending: true })
    .order('ho_ten', { ascending: true });

  if (workersResult.error) {
    return { success: false, error: workersResult.error.message };
  }

  const attendanceResult = await supabase
    .from('cham_cong')
    .select('id, cong_nhan_id, trang_thai, ghi_chu')
    .eq('ngay', date);

  if (attendanceResult.error) {
    return { success: false, error: attendanceResult.error.message };
  }

  const monthRange = getMonthRange(month);
  const markedResult = await supabase
    .from('tong_tien_cong_ngay')
    .select('ngay, tong_tien')
    .gte('ngay', monthRange.start)
    .lte('ngay', monthRange.end)
    .gt('tong_tien', 0);

  if (markedResult.error) {
    return { success: false, error: markedResult.error.message };
  }

  const dailyTotalResult = await supabase
    .from('tong_tien_cong_ngay')
    .select('tong_tien')
    .eq('ngay', date);

  if (dailyTotalResult.error) {
    return { success: false, error: dailyTotalResult.error.message };
  }

  const attendanceMap = new Map<
    number,
    {
      id: number;
      status: AttendanceStatus;
      meta: AttendanceMeta;
    }
  >();

  (attendanceResult.data ?? []).forEach((row) => {
    const typed = row as {
      id: number;
      cong_nhan_id: number;
      trang_thai: AttendanceStatus;
      ghi_chu: string | null;
    };

    attendanceMap.set(typed.cong_nhan_id, {
      id: typed.id,
      status: typed.trang_thai,
      meta: parseMeta(typed.ghi_chu),
    });
  });

  const baseRows: AttendanceRow[] = (workersResult.data ?? []).map((worker) => {
    const w = worker as {
      id: number;
      ma_cong_nhan: string;
      ho_ten: string;
      trang_thai: 'DangLam' | 'NghiViec';
    };

    const attendance = attendanceMap.get(w.id);
    const meta = attendance?.meta ?? {};

    const status = (meta.status ?? attendance?.status ?? 'Nghi') as AttendanceStatus;
    const bonus = Number.isFinite(meta.bonus) ? Number(meta.bonus) : 0;
    const penalty = Number.isFinite(meta.penalty) ? Number(meta.penalty) : 0;

    return {
      congNhanId: w.id,
      maCongNhan: w.ma_cong_nhan,
      hoTen: w.ho_ten,
      employmentStatus: w.trang_thai,
      attendanceId: attendance?.id ?? null,
      status,
      checkIn: meta.checkIn ?? '',
      checkOut: meta.checkOut ?? '',
      bonus,
      penalty,
      note: meta.note ?? '',
      computedSalary: 0,
    };
  });

  const markedDates = Array.from(
    new Set(
      (markedResult.data ?? [])
        .map((row) => (row as { ngay?: string }).ngay)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const dailyTotalSalary = (dailyTotalResult.data ?? []).reduce(
    (sum, row) => sum + toNumber((row as { tong_tien?: number | string }).tong_tien),
    0,
  );

  const presentCount = baseRows.filter((row) => isPresentStatus(row.status)).length;
  const unitAmount = presentCount > 0 ? dailyTotalSalary / presentCount : 0;

  const rows = baseRows.map((row) => ({
    ...row,
    computedSalary: isPresentStatus(row.status) ? Math.max(0, unitAmount + row.bonus - row.penalty) : 0,
  }));

  return {
    success: true,
    data: {
      date,
      rows,
      markedDates,
      dailyTotalSalary,
      presentCount,
    },
  };
}

export async function updateAttendance(
  input: z.input<typeof updateAttendanceSchema>,
): Promise<ActionResult<{ id: number }>> {
  const parsed = updateAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const payload = parsed.data;
  const supabase = await createClient();

  const existingResult = await supabase
    .from('cham_cong')
    .select('id')
    .eq('cong_nhan_id', payload.congNhanId)
    .eq('ngay', payload.date)
    .maybeSingle();

  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  const record = {
    cong_nhan_id: payload.congNhanId,
    ngay: payload.date,
    trang_thai: payload.status,
    ghi_chu: serializeMeta({
      status: payload.status,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      bonus: payload.bonus,
      penalty: payload.penalty,
      note: payload.note,
    }),
  };

  const upsertResult = await supabase
    .from('cham_cong')
    .upsert(record, { onConflict: 'cong_nhan_id,ngay' })
    .select('id')
    .single();

  if (upsertResult.error) {
    return { success: false, error: upsertResult.error.message };
  }

  await supabase.rpc('recalculate_luong_ngay', { p_ngay: payload.date });

  revalidatePath('/attendance');
  revalidatePath('/dashboard');

  return {
    success: true,
    data: { id: (upsertResult.data as { id: number }).id },
  };
}

export async function saveDailySalary(
  input: z.input<typeof saveDailySalarySchema>,
): Promise<ActionResult<{ date: string; presentCount: number; unitAmount: number }>> {
  const parsed = saveDailySalarySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le',
    };
  }

  const { date, totalAmount } = parsed.data;
  const supabase = await createClient();

  const attendanceResult = await supabase
    .from('cham_cong')
    .select('id, cong_nhan_id, trang_thai, ghi_chu')
    .eq('ngay', date);

  if (attendanceResult.error) {
    return { success: false, error: attendanceResult.error.message };
  }

  const attendanceRows = (attendanceResult.data ?? []).map((row) => {
    const typed = row as {
      id: number;
      cong_nhan_id: number;
      trang_thai: AttendanceStatus;
      ghi_chu: string | null;
    };
    const meta = parseMeta(typed.ghi_chu);
    const inferredStatus = (meta.status ?? typed.trang_thai ?? 'Nghi') as AttendanceStatus;

    return {
      id: typed.id,
      cong_nhanId: typed.cong_nhan_id,
      status: inferredStatus,
      bonus: Number(meta.bonus ?? 0),
      penalty: Number(meta.penalty ?? 0),
      meta,
    };
  });

  const presentRows = attendanceRows.filter((row) => isPresentStatus(row.status));
  const presentCount = presentRows.length;

  if (presentCount === 0) {
    if (totalAmount === 0) {
      for (const row of attendanceRows) {
        const updateResult = await supabase
          .from('cham_cong')
          .update({
            ghi_chu: serializeMeta({
              ...row.meta,
              status: row.status,
              bonus: Number(row.bonus || 0),
              penalty: Number(row.penalty || 0),
            }),
          })
          .eq('id', row.id);

        if (updateResult.error) {
          return { success: false, error: updateResult.error.message };
        }
      }

      await supabase.rpc('recalculate_luong_ngay', { p_ngay: date });

      revalidatePath('/attendance');
      revalidatePath('/dashboard');
      revalidatePath('/salary');

      return {
        success: true,
        data: {
          date,
          presentCount: 0,
          unitAmount: 0,
        },
      };
    }

    return {
      success: false,
      error: 'Khong co cong nhan co mat trong ngay de chia luong.',
    };
  }

  const unitAmount = totalAmount / presentCount;

  for (const row of attendanceRows) {
    const status = row.status;
    const bonus = Number(row.bonus || 0);
    const penalty = Number(row.penalty || 0);

    const updateResult = await supabase
      .from('cham_cong')
      .update({
        trang_thai: status,
        ghi_chu: serializeMeta({
          ...row.meta,
          status,
          bonus,
          penalty,
        }),
      })
      .eq('id', row.id);

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }
  }

  await supabase.rpc('recalculate_luong_ngay', { p_ngay: date });

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  revalidatePath('/salary');

  return {
    success: true,
    data: {
      date,
      presentCount,
      unitAmount,
    },
  };
}

export async function recalculateSalary(date: string): Promise<ActionResult<{ date: string }>> {
  const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
  if (!validDate.success) {
    return {
      success: false,
      error: 'Ngay khong hop le',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('recalculate_luong_ngay', { p_ngay: date });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath('/attendance');
  revalidatePath('/dashboard');

  return {
    success: true,
    data: { date },
  };
}
