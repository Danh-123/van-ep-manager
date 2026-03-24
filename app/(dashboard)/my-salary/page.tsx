import { endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { redirect } from 'next/navigation';

import PersonalSalaryTable, { type PersonalSalaryDay } from '@/components/viewer/PersonalSalaryTable';
import { createClient } from '@/lib/supabase/server';
import { getViewerContext } from '@/lib/viewer/personal';

type MySalaryPageProps = {
  searchParams: Promise<{ month?: string }>;
};

type AttendanceMeta = {
  status?: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  checkIn?: string;
  checkOut?: string;
  bonus?: number;
  penalty?: number;
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function MySalaryPage({ searchParams }: MySalaryPageProps) {
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
          <h1 className="text-2xl font-semibold text-slate-900">Luong ca nhan</h1>
          <p className="mt-1 text-sm text-slate-600">Thong tin cong nhan chua duoc lien ket voi tai khoan Viewer.</p>
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

  const rows: PersonalSalaryDay[] = (attendanceResult.data ?? []).map((row) => {
    const typed = row as {
      ngay: string;
      thanh_tien: number | string;
      ghi_chu: string | null;
    };

    const meta = parseMeta(typed.ghi_chu);
    const status = meta.status ?? 'Nghi';

    return {
      date: typed.ngay,
      status,
      dailySalary: Number(typed.thanh_tien) || 0,
      bonus: Number(meta.bonus ?? 0),
      penalty: Number(meta.penalty ?? 0),
    };
  });

  const totalSalary = rows.reduce((sum, row) => sum + row.dailySalary, 0);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Luong ca nhan</h1>
        <p className="mt-1 text-sm text-slate-600">Theo doi luong theo thang cua ban.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Thong tin ca nhan</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
          <p>
            Ho ten: <span className="font-medium">{context.worker.hoTen}</span>
          </p>
          <p>
            Ma cong nhan: <span className="font-medium">{context.worker.maCongNhan}</span>
          </p>
          <p>
            So dien thoai: <span className="font-medium">{context.worker.soDienThoai || '-'}</span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[260px_auto]" method="get">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Chon thang</label>
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
              Xem luong
            </button>
          </div>
        </form>

        <p className="mt-3 text-sm text-slate-700">
          Tong luong thang {format(monthDate, 'MM/yyyy')}: <span className="font-semibold text-[#1B5E20]">{formatMoney(totalSalary)}</span>
        </p>
      </section>

      <PersonalSalaryTable workerName={context.worker.hoTen} monthLabel={format(monthDate, 'MM/yyyy')} rows={rows} />
    </div>
  );
}
