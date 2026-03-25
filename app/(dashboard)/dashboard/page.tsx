import Link from 'next/link';
import { Suspense } from 'react';

import { format, subDays } from 'date-fns';
import {
  Activity,
  Banknote,
  Clock3,
  DollarSign,
  FileWarning,
  TrendingUp,
  Users,
} from 'lucide-react';

import Revenue7DaysChart from '@/components/dashboard/Revenue7DaysChart';
import { createClient } from '@/lib/supabase/server';

type NumericLike = number | string | null | undefined;

function toNumber(value: NumericLike) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#1B5E20]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

async function fetchStatsData() {
  const supabase = await createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [
    revenueResult,
    salaryResult,
    attendanceCountResult,
    debtWithPaidResult,
  ] = await Promise.all([
    supabase.from('phieu_can').select('thanh_tien').eq('ngay_can', today),
    supabase.from('tong_tien_cong_ngay').select('tong_tien').eq('ngay', today),
    supabase
      .from('cham_cong')
      .select('id', { count: 'exact', head: true })
      .eq('ngay', today)
      .eq('trang_thai', 'CoMat'),
    supabase
      .from('phieu_can')
      .select('thanh_tien, so_tien_da_tra')
      .order('ngay_can', { ascending: false }),
  ]);

  const revenueToday = (revenueResult.data ?? []).reduce(
    (sum, row) => sum + toNumber((row as { thanh_tien?: NumericLike }).thanh_tien),
    0,
  );

  const salaryToday = (salaryResult.data ?? []).reduce(
    (sum, row) => sum + toNumber((row as { tong_tien?: NumericLike }).tong_tien),
    0,
  );

  const workersPresent = attendanceCountResult.count ?? 0;

  let totalDebt = 0;

  if (!debtWithPaidResult.error) {
    totalDebt = (debtWithPaidResult.data ?? []).reduce((sum, row) => {
      const typedRow = row as { thanh_tien?: NumericLike; so_tien_da_tra?: NumericLike };
      const debt = toNumber(typedRow.thanh_tien) - toNumber(typedRow.so_tien_da_tra);
      return debt > 0 ? sum + debt : sum;
    }, 0);
  } else {
    const debtFallbackResult = await supabase.from('phieu_can').select('thanh_tien');
    totalDebt = (debtFallbackResult.data ?? []).reduce(
      (sum, row) => sum + toNumber((row as { thanh_tien?: NumericLike }).thanh_tien),
      0,
    );
  }

  return {
    revenueToday,
    salaryToday,
    totalDebt,
    workersPresent,
    today,
  };
}

async function StatsCardsSection() {
  const stats = await fetchStatsData();

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Doanh thu hom nay"
        value={formatCurrency(stats.revenueToday)}
        subtitle={`Tu phieu can ngay ${stats.today}`}
        icon={TrendingUp}
      />
      <StatCard
        title="Luong phai tra hom nay"
        value={formatCurrency(stats.salaryToday)}
        subtitle={`Tong luong ngay ${stats.today}`}
        icon={DollarSign}
      />
      <StatCard
        title="Tong no phai thu"
        value={formatCurrency(stats.totalDebt)}
        subtitle="Tinh tu cac phieu chua thanh toan du"
        icon={Banknote}
      />
      <StatCard
        title="Cong nhan di lam hom nay"
        value={String(stats.workersPresent)}
        subtitle="Trang thai CoMat trong cham cong"
        icon={Users}
      />
    </section>
  );
}

async function fetchRevenue7DaysData() {
  const supabase = await createClient();
  const endDate = new Date();
  const startDate = subDays(endDate, 6);

  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

  const { data } = await supabase
    .from('phieu_can')
    .select('ngay_can, thanh_tien')
    .gte('ngay_can', start)
    .lte('ngay_can', end);

  const map = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const date = format(subDays(endDate, 6 - i), 'yyyy-MM-dd');
    map.set(date, 0);
  }

  (data ?? []).forEach((row) => {
    const typedRow = row as { ngay_can?: string; thanh_tien?: NumericLike };
    if (!typedRow.ngay_can) return;
    map.set(typedRow.ngay_can, (map.get(typedRow.ngay_can) ?? 0) + toNumber(typedRow.thanh_tien));
  });

  return Array.from(map.entries()).map(([date, revenue]) => ({
    date: format(new Date(date), 'dd/MM'),
    revenue,
  }));
}

async function RevenueChartSection() {
  const data = await fetchRevenue7DaysData();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#1B5E20]" />
        <h2 className="text-lg font-semibold text-slate-900">Doanh thu 7 ngay gan nhat</h2>
      </div>
      <Revenue7DaysChart data={data} />
    </section>
  );
}

async function fetchRecentDebtTickets() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('phieu_can')
    .select('id, ngay_can, thanh_tien, so_tien_da_tra, khach_hang, xe_hang:xe_hang_id(ten_chu_xe, bien_so)')
    .order('ngay_can', { ascending: false })
    .limit(20);

  const rows = !error
    ? (data ?? [])
    : (
        await supabase
          .from('phieu_can')
          .select('id, ngay_can, thanh_tien, xe_hang:xe_hang_id(ten_chu_xe, bien_so)')
          .order('ngay_can', { ascending: false })
          .limit(20)
      ).data ?? [];

  return rows
    .map((row) => {
      const typedRow = row as {
        id: number;
        ngay_can?: string;
        thanh_tien?: NumericLike;
        so_tien_da_tra?: NumericLike;
        khach_hang?: string;
        xe_hang?: { ten_chu_xe?: string; bien_so?: string } | null;
      };

      const amount = toNumber(typedRow.thanh_tien);
      const paid = toNumber(typedRow.so_tien_da_tra);
      const debt = amount - paid;

      return {
        id: typedRow.id,
        ngayCan: typedRow.ngay_can ?? '-',
        customer:
          typedRow.khach_hang ??
          typedRow.xe_hang?.ten_chu_xe ??
          typedRow.xe_hang?.bien_so ??
          'Khach le',
        amount,
        paid,
        debt,
      };
    })
    .filter((row) => row.debt > 0)
    .slice(0, 5);
}

async function RecentDebtTicketsSection() {
  const rows = await fetchRecentDebtTickets();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-[#1B5E20]" />
          <h2 className="text-lg font-semibold text-slate-900">Phieu can chua thanh toan gan day</h2>
        </div>
        <Link
          href="/debt"
          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
        >
          Xem tat ca
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2 font-medium">Ngay</th>
              <th className="px-2 py-2 font-medium">Khach hang</th>
              <th className="px-2 py-2 font-medium">Thanh tien</th>
              <th className="px-2 py-2 font-medium">Da tra</th>
              <th className="px-2 py-2 font-medium">Con no</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-4 text-slate-500" colSpan={5}>
                  Khong co phieu can con no.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-2.5 text-slate-700">{row.ngayCan}</td>
                  <td className="px-2 py-2.5 text-slate-700">{row.customer}</td>
                  <td className="px-2 py-2.5 text-slate-700">{formatCurrency(row.amount)}</td>
                  <td className="px-2 py-2.5 text-slate-700">{formatCurrency(row.paid)}</td>
                  <td className="px-2 py-2.5 font-semibold text-red-600">{formatCurrency(row.debt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function fetchTodayAttendance() {
  const supabase = await createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [{ data: workers }, { data: attendanceRows, error }] = await Promise.all([
    supabase
      .from('cong_nhan')
      .select('id, ho_ten, trang_thai')
      .eq('trang_thai', 'DangLam')
      .order('ho_ten', { ascending: true }),
    supabase.from('cham_cong').select('cong_nhan_id, trang_thai').eq('ngay', today),
  ]);

  const attendanceData = !error
    ? attendanceRows ?? []
    : (await supabase.from('cham_cong').select('cong_nhan_id').eq('ngay', today)).data ?? [];

  const presentSet = new Set<number>();
  attendanceData.forEach((row) => {
    const typedRow = row as { cong_nhan_id?: number; trang_thai?: string };
    if (!typedRow.cong_nhan_id) return;
    if (!typedRow.trang_thai || typedRow.trang_thai === 'CoMat') {
      presentSet.add(typedRow.cong_nhan_id);
    }
  });

  const workerList = (workers ?? []).map((row) => row as { id: number; ho_ten: string });

  const checkedIn = workerList.filter((worker) => presentSet.has(worker.id));
  const absent = workerList.filter((worker) => !presentSet.has(worker.id));

  return {
    checkedIn,
    absent,
    today,
  };
}

async function TodayAttendanceSection() {
  const attendance = await fetchTodayAttendance();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-[#1B5E20]" />
          <h2 className="text-lg font-semibold text-slate-900">Cham cong hom nay</h2>
        </div>
        <Link
          href="/attendance"
          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
        >
          Cham cong
        </Link>
      </div>

      <p className="mb-3 text-xs text-slate-500">Ngay {attendance.today}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="mb-2 text-sm font-semibold text-emerald-800">
            Da check-in ({attendance.checkedIn.length})
          </p>
          <ul className="space-y-1.5 text-sm text-emerald-900">
            {attendance.checkedIn.length === 0 ? (
              <li>Chua co cong nhan check-in.</li>
            ) : (
              attendance.checkedIn.slice(0, 8).map((item) => <li key={item.id}>{item.ho_ten}</li>)
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-800">
            Chua check-in ({attendance.absent.length})
          </p>
          <ul className="space-y-1.5 text-sm text-amber-900">
            {attendance.absent.length === 0 ? (
              <li>Tat ca da check-in.</li>
            ) : (
              attendance.absent.slice(0, 8).map((item) => <li key={item.id}>{item.ho_ten}</li>)
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function StatsCardsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-40 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-48 rounded bg-slate-100" />
        </div>
      ))}
    </section>
  );
}

function ChartSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 h-5 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
    </section>
  );
}

function DebtTableSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

function AttendanceSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi doanh thu, công nợ và chấm công trong ngày.</p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCardsSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChartSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Suspense fallback={<DebtTableSkeleton />}>
          <RecentDebtTicketsSection />
        </Suspense>

        <Suspense fallback={<AttendanceSkeleton />}>
          <TodayAttendanceSection />
        </Suspense>
      </div>
    </div>
  );
}
