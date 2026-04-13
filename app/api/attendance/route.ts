import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recalculateLuongThangByDate } from '@/lib/salary/recalculateMonthly';
import { createClient } from '@/lib/supabase/server';

type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

type AttendanceMeta = {
  status?: AttendanceStatus;
};

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
});

const payloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ'),
  caoSuKg: z.number().min(0),
  donGiaCaoSu: z.number().min(0),
  dieuKg: z.number().min(0),
  donGiaDieu: z.number().min(0),
  rows: z
    .array(
      z.object({
        congNhanId: z.number().int().positive(),
        hoTen: z.string(),
        status: z.enum(['CoMat', 'Nghi', 'NghiPhep', 'LamThem']),
      }),
    )
    .min(1, 'Không có dữ liệu công nhân'),
});

function parseMeta(ghiChu: string | null): AttendanceMeta {
  if (!ghiChu) return {};

  try {
    return JSON.parse(ghiChu) as AttendanceMeta;
  } catch {
    return {};
  }
}

function isPresent(status: AttendanceStatus) {
  return status === 'CoMat' || status === 'LamThem';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ date: url.searchParams.get('date') ?? '' });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Bạn chưa đăng nhập' }, { status: 401 });
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ success: false, error: 'Không thể xác thực quyền truy cập' }, { status: 403 });
  }

  if (profileResult.data.role === 'Viewer') {
    return NextResponse.json({ success: false, error: 'Bạn không có quyền chấm công' }, { status: 403 });
  }

  const workersResult = await supabase
    .from('cong_nhan')
    .select('id, ho_ten, trang_thai')
    .eq('trang_thai', 'DangLam')
    .order('ho_ten', { ascending: true });

  if (workersResult.error) {
    return NextResponse.json({ success: false, error: workersResult.error.message }, { status: 500 });
  }

  const attendanceResult = await supabase
    .from('cham_cong')
    .select('cong_nhan_id, trang_thai, ghi_chu')
    .eq('ngay', parsed.data.date);

  if (attendanceResult.error) {
    return NextResponse.json({ success: false, error: attendanceResult.error.message }, { status: 500 });
  }

  const attendanceMap = new Map<number, AttendanceStatus>();

  (attendanceResult.data ?? []).forEach((row) => {
    const typed = row as {
      cong_nhan_id: number;
      trang_thai: AttendanceStatus;
      ghi_chu: string | null;
    };

    const meta = parseMeta(typed.ghi_chu);
    const status = meta.status ?? typed.trang_thai;
    attendanceMap.set(typed.cong_nhan_id, status);
  });

  const rows = (workersResult.data ?? []).map((worker) => {
    const typedWorker = worker as { id: number; ho_ten: string };

    return {
      congNhanId: typedWorker.id,
      hoTen: typedWorker.ho_ten,
      status: attendanceMap.get(typedWorker.id) ?? 'CoMat',
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      date: parsed.data.date,
      rows,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const { date, caoSuKg, donGiaCaoSu, dieuKg, donGiaDieu, rows } = parsed.data;

  const totalSalary = caoSuKg * donGiaCaoSu + dieuKg * donGiaDieu;
  const presentCount = rows.filter((row) => isPresent(row.status)).length;

  if (totalSalary <= 0) {
    return NextResponse.json({ success: false, error: 'Tổng lương ngày phải lớn hơn 0' }, { status: 400 });
  }

  if (presentCount <= 0) {
    return NextResponse.json({ success: false, error: 'Phải có ít nhất 1 người Có mặt hoặc Làm thêm' }, { status: 400 });
  }

  const salaryPerPerson = totalSalary / presentCount;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Bạn chưa đăng nhập' }, { status: 401 });
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ success: false, error: 'Không thể xác thực quyền truy cập' }, { status: 403 });
  }

  if (profileResult.data.role === 'Viewer') {
    return NextResponse.json({ success: false, error: 'Bạn không có quyền chấm công' }, { status: 403 });
  }

  const existingResult = await supabase
    .from('cham_cong')
    .select('id, cong_nhan_id')
    .eq('ngay', date);

  if (existingResult.error) {
    return NextResponse.json({ success: false, error: existingResult.error.message }, { status: 500 });
  }

  const existingMap = new Map<number, number>();
  (existingResult.data ?? []).forEach((row) => {
    const typed = row as { id: number; cong_nhan_id: number };
    existingMap.set(typed.cong_nhan_id, typed.id);
  });

  for (const row of rows) {
    const chamCongRecord = {
      cong_nhan_id: row.congNhanId,
      ngay: date,
      trang_thai: row.status,
      ghi_chu: JSON.stringify({
        status: row.status,
      }),
    };

    const existingId = existingMap.get(row.congNhanId);

    if (existingId) {
      const { trang_thai, ghi_chu } = chamCongRecord;
      const updateResult = await supabase
        .from('cham_cong')
        .update({ trang_thai, ghi_chu })
        .eq('id', existingId);

      if (updateResult.error) {
        return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
      }
    } else {
      const insertResult = await supabase.from('cham_cong').insert(chamCongRecord);

      if (insertResult.error) {
        return NextResponse.json({ success: false, error: insertResult.error.message }, { status: 500 });
      }
    }
  }

  // Save daily production values; tong_tien is generated by DB from (cao_su_kg * don_gia_cao_su) + (dieu_kg * don_gia_dieu)
  const tongTienRecord = {
    ngay: date,
    cao_su_kg: caoSuKg,
    don_gia_cao_su: donGiaCaoSu,
    dieu_kg: dieuKg,
    don_gia_dieu: donGiaDieu,
    ghi_chu: JSON.stringify({
      presentCount,
      salaryPerPerson,
    }),
  };

  const tongTienUpsertResult = await supabase
    .from('tong_tien_cong_ngay')
    .upsert(tongTienRecord, { onConflict: 'ngay' });

  if (tongTienUpsertResult.error) {
    return NextResponse.json({ success: false, error: tongTienUpsertResult.error.message }, { status: 500 });
  }

  try {
    await recalculateLuongThangByDate(supabase, date);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Không thể tính lại lương tháng' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      totalSalary,
      presentCount,
      salaryPerPerson,
    },
  });
}
