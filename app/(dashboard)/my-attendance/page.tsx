import { eachDayOfInterval, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { redirect } from 'next/navigation';

import PersonalCalendar, { type PersonalAttendanceDay } from '@/components/viewer/PersonalCalendar';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/viewer/personal';

type MyAttendancePageProps = {
  searchParams: Promise<{ month?: string }>;
};

type AttendanceMeta = {
  status?: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  checkIn?: string;
  checkOut?: string;
  note?: string;
};

function parseMeta(metaText: string | null): AttendanceMeta {
  if (!metaText) return {};

  try {
    return JSON.parse(metaText) as AttendanceMeta;
  } catch {
    return {};
  }
}

function resolveMonth(monthValue?: string) {
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    return monthValue;
  }

  return format(new Date(), 'yyyy-MM');
}

function statusLabel(status: PersonalAttendanceDay['status']) {
  if (status === 'CoMat') return 'Có mặt';
  if (status === 'Nghi') return 'Nghỉ';
  if (status === 'NghiPhep') return 'Nghỉ phép';
  return 'Làm thêm';
}

export default async function MyAttendancePage({ searchParams }: MyAttendancePageProps) {
  const context = await getViewerContext();

  if (!context) {
    redirect('/login');
  }

  if (context.role !== 'Viewer') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const monthKey = resolveMonth(params.month);
  const monthDate = parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date());
  const from = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const monthOptions = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const key = format(date, 'yyyy-MM');
    return { key, label: format(date, 'MM/yyyy') };
  });

  if (!context.worker) {
    return (
      <div className="space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Chấm công cá nhân</h1>
          <p className="mt-1 text-sm text-slate-600">Thông tin công nhân chưa được liên kết với tài khoản Viewer.</p>
        </header>
      </div>
    );
  }

  const supabase = await createClient();
  const attendanceResult = await supabase
    .from('cham_cong')
    .select('ngay, thanh_tien, ghi_chu')
    .eq('cong_nhan_id', context.worker.id)
    .gte('ngay', from)
    .lte('ngay', to)
    .order('ngay', { ascending: true });

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }

  const map = new Map<string, PersonalAttendanceDay>();

  (attendanceResult.data ?? []).forEach((row) => {
    const typed = row as {
      ngay: string;
      thanh_tien: number | string;
      ghi_chu: string | null;
    };

    const meta = parseMeta(typed.ghi_chu);

    map.set(typed.ngay, {
      date: typed.ngay,
      status: meta.status ?? 'Nghi',
      checkIn: meta.checkIn ?? '',
      checkOut: meta.checkOut ?? '',
      dailySalary: Number(typed.thanh_tien) || 0,
      note: meta.note ?? '',
    });
  });

  const monthlyRows: PersonalAttendanceDay[] = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  }).map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    return (
      map.get(key) ?? {
        date: key,
        status: 'Nghi',
        checkIn: '',
        checkOut: '',
        dailySalary: 0,
        note: '',
      }
    );
  });

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Chấm công cá nhân</h1>
        <p className="mt-1 text-sm text-slate-600">Xem lịch sử chấm công theo tháng của bạn.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[260px_auto]" method="get">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Chọn tháng</label>
            <select
              name="month"
              defaultValue={monthKey}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            >
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-lg bg-[#2E7D32] px-4 text-sm font-medium text-white hover:bg-[#1B5E20]"
            >
              Xem chấm công
            </button>
          </div>
        </form>
      </section>

      <PersonalCalendar monthKey={monthKey} rows={monthlyRows} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Bảng chấm công theo tháng</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Check-in</th>
                <th className="px-3 py-2 font-medium">Check-out</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row) => (
                <tr key={row.date} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2">{row.checkIn || '-'}</td>
                  <td className="px-3 py-2">{row.checkOut || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
