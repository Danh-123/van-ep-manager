'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, Download, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import {
  getAttendanceReport,
  getDebtReport,
  getRevenueReport,
  getSalaryReport,
  type AttendanceReportRow,
  type DebtReportGroup,
  type RevenueReportRow,
  type SalaryReportRow,
} from '@/app/(dashboard)/reports/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRole, type AppRole } from '@/hooks/useRole';
import {
  exportAttendanceReport,
  exportDebtReport,
  exportRevenueReport,
  exportSalaryReport,
} from '@/lib/excel/export';
import { useMounted } from '@/hooks/useMounted';

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

type QuickRange = 'today' | 'week' | 'month' | 'year' | 'custom';
type ReportTab = 'overview' | 'attendance' | 'salary' | 'revenue' | 'debt' | 'workers';

type ReportTabConfig = {
  value: ReportTab;
  label: string;
  roles: AppRole[];
};

const REPORT_TABS: ReportTabConfig[] = [
  { value: 'overview', label: 'Tong quan', roles: ['Admin', 'KeToan', 'Viewer'] },
  { value: 'attendance', label: 'Cham cong', roles: ['Admin', 'KeToan'] },
  { value: 'salary', label: 'Luong', roles: ['Admin', 'KeToan'] },
  { value: 'revenue', label: 'Doanh thu', roles: ['Admin', 'KeToan'] },
  { value: 'debt', label: 'Cong no', roles: ['Admin', 'KeToan'] },
  { value: 'workers', label: 'Cong nhan', roles: ['Admin', 'KeToan'] },
];

function rangeFromQuick(quick: Exclude<QuickRange, 'custom'>) {
  const now = new Date();

  if (quick === 'today') {
    return {
      startDate: toIsoDate(startOfDay(now)),
      endDate: toIsoDate(startOfDay(now)),
    };
  }

  if (quick === 'week') {
    return {
      startDate: toIsoDate(startOfWeek(now, { weekStartsOn: 1 })),
      endDate: toIsoDate(endOfWeek(now, { weekStartsOn: 1 })),
    };
  }

  if (quick === 'month') {
    return {
      startDate: toIsoDate(startOfMonth(now)),
      endDate: toIsoDate(endOfMonth(now)),
    };
  }

  return {
    startDate: toIsoDate(startOfYear(now)),
    endDate: toIsoDate(now),
  };
}

function statusLabel(status: string) {
  if (status === 'CoMat') return 'Co mat';
  if (status === 'Nghi') return 'Nghi';
  if (status === 'NghiPhep') return 'Nghi phep';
  if (status === 'LamThem') return 'Lam them';
  return status;
}

export default function ReportsPage() {
  const mounted = useMounted();
  const { role, isLoading: roleLoading } = useRole();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [quickRange, setQuickRange] = useState<QuickRange>('month');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>([]);
  const [salaryRows, setSalaryRows] = useState<SalaryReportRow[]>([]);
  const [salaryMonthlyTotals, setSalaryMonthlyTotals] = useState<Record<string, number>>({});
  const [revenueRows, setRevenueRows] = useState<RevenueReportRow[]>([]);
  const [revenueDaily, setRevenueDaily] = useState<Array<{ date: string; revenue: number }>>([]);
  const [revenueTotals, setRevenueTotals] = useState({ revenue: 0, paid: 0, debt: 0 });
  const [debtGroups, setDebtGroups] = useState<DebtReportGroup[]>([]);
  const [debtTotal, setDebtTotal] = useState(0);

  const [attendanceDetailOpen, setAttendanceDetailOpen] = useState(false);
  const [attendanceDetail, setAttendanceDetail] = useState<AttendanceReportRow | null>(null);
  const [expandedDebtCustomer, setExpandedDebtCustomer] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTabs = useMemo(() => {
    const currentRole = role ?? 'Viewer';
    return REPORT_TABS.filter((tab) => tab.roles.includes(currentRole));
  }, [role]);

  const activeTabOptions = useMemo(() => filteredTabs.map((tab) => tab.value), [filteredTabs]);

  useEffect(() => {
    if (filteredTabs.length === 0) {
      return;
    }

    if (!activeTabOptions.includes(activeTab)) {
      setActiveTab(filteredTabs[0].value);
    }
  }, [activeTab, activeTabOptions, filteredTabs]);

  const applyQuickRange = (nextRange: QuickRange) => {
    setQuickRange(nextRange);
    if (nextRange === 'custom') return;

    const next = rangeFromQuick(nextRange);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
  };

  useEffect(() => {
    if (!mounted || (startDate && endDate)) return;
    const initial = rangeFromQuick('month');
    setStartDate(initial.startDate);
    setEndDate(initial.endDate);
  }, [mounted, startDate, endDate]);

  const loadData = useCallback(async () => {
    if (roleLoading) return;
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);

    if (activeTab === 'overview') {
      if (role === 'Viewer') {
        const [salaryResult, debtResult] = await Promise.all([
          getSalaryReport({ startDate, endDate }),
          getDebtReport({ startDate, endDate }),
        ]);

        if (salaryResult.success) {
          setSalaryRows(salaryResult.data.rows);
          setSalaryMonthlyTotals(salaryResult.data.monthlyTotals);
        } else {
          setSalaryRows([]);
          setSalaryMonthlyTotals({});
        }

        if (debtResult.success) {
          setDebtGroups(debtResult.data.groups);
          setDebtTotal(debtResult.data.totalDebt);
        } else {
          setDebtGroups([]);
          setDebtTotal(0);
        }

        setLoading(false);
        return;
      }

      const [attendanceResult, salaryResult, revenueResult, debtResult] = await Promise.all([
        getAttendanceReport({ startDate, endDate }),
        getSalaryReport({ startDate, endDate }),
        getRevenueReport({ startDate, endDate }),
        getDebtReport({ startDate, endDate }),
      ]);

      if (attendanceResult.success) {
        setAttendanceRows(attendanceResult.data);
      }

      if (salaryResult.success) {
        setSalaryRows(salaryResult.data.rows);
        setSalaryMonthlyTotals(salaryResult.data.monthlyTotals);
      }

      if (revenueResult.success) {
        setRevenueRows(revenueResult.data.rows);
        setRevenueDaily(revenueResult.data.daily);
        setRevenueTotals(revenueResult.data.totals);
      }

      if (debtResult.success) {
        setDebtGroups(debtResult.data.groups);
        setDebtTotal(debtResult.data.totalDebt);
      }

      setLoading(false);
      return;
    }

    if (activeTab === 'attendance') {
      const result = await getAttendanceReport({ startDate, endDate });
      if (!result.success) {
        setError(result.error);
        setAttendanceRows([]);
        setLoading(false);
        return;
      }
      setAttendanceRows(result.data);
      setLoading(false);
      return;
    }

    if (activeTab === 'workers') {
      const result = await getAttendanceReport({ startDate, endDate });
      if (!result.success) {
        setError(result.error);
        setAttendanceRows([]);
        setLoading(false);
        return;
      }

      setAttendanceRows(result.data);
      setLoading(false);
      return;
    }

    if (activeTab === 'salary') {
      const result = await getSalaryReport({ startDate, endDate });
      if (!result.success) {
        setError(result.error);
        setSalaryRows([]);
        setSalaryMonthlyTotals({});
        setLoading(false);
        return;
      }
      setSalaryRows(result.data.rows);
      setSalaryMonthlyTotals(result.data.monthlyTotals);
      setLoading(false);
      return;
    }

    if (activeTab === 'revenue') {
      const result = await getRevenueReport({ startDate, endDate });
      if (!result.success) {
        setError(result.error);
        setRevenueRows([]);
        setRevenueDaily([]);
        setRevenueTotals({ revenue: 0, paid: 0, debt: 0 });
        setLoading(false);
        return;
      }
      setRevenueRows(result.data.rows);
      setRevenueDaily(result.data.daily);
      setRevenueTotals(result.data.totals);
      setLoading(false);
      return;
    }

    const result = await getDebtReport({ startDate, endDate });
    if (!result.success) {
      setError(result.error);
      setDebtGroups([]);
      setDebtTotal(0);
      setLoading(false);
      return;
    }

    setDebtGroups(result.data.groups);
    setDebtTotal(result.data.totalDebt);
    setLoading(false);
  }, [activeTab, endDate, role, roleLoading, startDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExport = () => {
    startTransition(async () => {
      const range = { startDate, endDate };

      if (activeTab === 'attendance') {
        await exportAttendanceReport(attendanceRows, range);
        return;
      }

      if (activeTab === 'workers') {
        await exportAttendanceReport(attendanceRows, range);
        return;
      }

      if (activeTab === 'salary') {
        await exportSalaryReport(salaryRows, salaryMonthlyTotals, range);
        return;
      }

      if (activeTab === 'revenue') {
        await exportRevenueReport(revenueRows, revenueTotals, range);
        return;
      }

      await exportDebtReport(debtGroups, debtTotal, range);
    });
  };

  const groupedSalaryRows = useMemo(() => {
    const map = new Map<string, SalaryReportRow[]>();
    salaryRows.forEach((row) => {
      const existing = map.get(row.monthKey) ?? [];
      existing.push(row);
      map.set(row.monthKey, existing);
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [salaryRows]);

  const workerSummaryRows = useMemo(() => {
    const summary = new Map<string, { workerName: string; present: number; absent: number }>();

    attendanceRows.forEach((day) => {
      day.details.forEach((detail) => {
        const current = summary.get(detail.workerName) ?? {
          workerName: detail.workerName,
          present: 0,
          absent: 0,
        };

        if (detail.status === 'CoMat' || detail.status === 'LamThem') {
          current.present += 1;
        } else {
          current.absent += 1;
        }

        summary.set(detail.workerName, current);
      });
    });

    return Array.from(summary.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [attendanceRows]);

  const overviewStats = useMemo(() => {
    const attendanceDays = attendanceRows.length;
    const salaryTotal = Object.values(salaryMonthlyTotals).reduce((sum, value) => sum + value, 0);
    return {
      attendanceDays,
      salaryTotal,
      revenueTotal: revenueTotals.revenue,
      debtTotal,
    };
  }, [attendanceRows.length, debtTotal, revenueTotals.revenue, salaryMonthlyTotals]);

  if (!mounted || roleLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bao cao</h1>
            <p className="mt-1 text-sm text-slate-600">Tong hop cham cong, luong, doanh thu va cong no.</p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuat Excel
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_2fr]">
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setQuickRange('custom');
            }}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          />

          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setQuickRange('custom');
            }}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyQuickRange('today')}
              className={`rounded-lg border px-3 py-2 text-sm ${quickRange === 'today' ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              Hom nay
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('week')}
              className={`rounded-lg border px-3 py-2 text-sm ${quickRange === 'week' ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              Tuan nay
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('month')}
              className={`rounded-lg border px-3 py-2 text-sm ${quickRange === 'month' ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              Thang nay
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('year')}
              className={`rounded-lg border px-3 py-2 text-sm ${quickRange === 'year' ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              Nam nay
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange('custom')}
              className={`rounded-lg border px-3 py-2 text-sm ${quickRange === 'custom' ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              Tuy chinh
            </button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
        <TabsList className={`grid w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ${filteredTabs.length <= 2 ? 'grid-cols-2' : filteredTabs.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#1B5E20]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Ngay cham cong</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{overviewStats.attendanceDays.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong luong</p>
              <p className="mt-1 text-xl font-semibold text-[#1B5E20]">{formatMoney(overviewStats.salaryTotal)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong doanh thu</p>
              <p className="mt-1 text-xl font-semibold text-blue-700">{formatMoney(overviewStats.revenueTotal)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong cong no</p>
              <p className="mt-1 text-xl font-semibold text-red-600">{formatMoney(overviewStats.debtTotal)}</p>
            </div>
          </section>

          {role === 'Viewer' && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-[#1B5E20]">
              Ban dang o che do Viewer. Chi hien thi bao cao tong quan phu hop voi quyen hien tai.
            </section>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Ngay</th>
                    <th className="px-4 py-3 font-medium">So cong nhan di lam</th>
                    <th className="px-4 py-3 font-medium">So nghi</th>
                    <th className="px-4 py-3 font-medium">Tong tien cong ngay</th>
                    <th className="px-4 py-3 text-right font-medium">Chi tiet</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3" colSpan={5}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Khong co du lieu cham cong.
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((row) => (
                      <tr key={row.date} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">{row.date}</td>
                        <td className="px-4 py-3">{row.presentCount}</td>
                        <td className="px-4 py-3">{row.absentCount}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{formatMoney(row.totalSalary)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setAttendanceDetail(row);
                              setAttendanceDetailOpen(true);
                            }}
                          >
                            Xem danh sach
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Thang</th>
                    <th className="px-4 py-3 font-medium">Cong nhan</th>
                    <th className="px-4 py-3 font-medium">Luong co ban</th>
                    <th className="px-4 py-3 font-medium">Thuong</th>
                    <th className="px-4 py-3 font-medium">Phat</th>
                    <th className="px-4 py-3 font-medium">Tong luong</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3" colSpan={6}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : groupedSalaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Khong co du lieu luong.
                      </td>
                    </tr>
                  ) : (
                    groupedSalaryRows.flatMap(([monthKey, rows]) => {
                      const monthLabel = rows[0]?.monthLabel ?? monthKey;
                      const total = salaryMonthlyTotals[monthKey] ?? 0;

                      return [
                        <tr key={`${monthKey}-header`} className="border-b border-slate-200 bg-emerald-50/60">
                          <td className="px-4 py-2 font-semibold text-[#1B5E20]" colSpan={6}>
                            Thang {monthLabel} - Tong luong: {formatMoney(total)}
                          </td>
                        </tr>,
                        ...rows.map((row) => (
                          <tr key={`${monthKey}-${row.workerId}`} className="border-b border-slate-100">
                            <td className="px-4 py-3 text-slate-600">{row.monthLabel}</td>
                            <td className="px-4 py-3">{row.workerName}</td>
                            <td className="px-4 py-3">{formatMoney(row.baseSalary)}</td>
                            <td className="px-4 py-3 text-emerald-700">{formatMoney(row.bonus)}</td>
                            <td className="px-4 py-3 text-red-600">{formatMoney(row.penalty)}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{formatMoney(row.totalSalary)}</td>
                          </tr>
                        )),
                      ];
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong doanh thu</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatMoney(revenueTotals.revenue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong da thu</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{formatMoney(revenueTotals.paid)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tong no</p>
              <p className="mt-1 text-xl font-semibold text-red-600">{formatMoney(revenueTotals.debt)}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-800">
              <CalendarDays className="h-4 w-4 text-[#1B5E20]" />
              <h3 className="text-sm font-semibold">Bieu do doanh thu theo ngay</h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueDaily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#64748B" />
                  <YAxis tickLine={false} axisLine={false} stroke="#64748B" />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="revenue" fill="#2E7D32" radius={[8, 8, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Ngay</th>
                    <th className="px-4 py-3 font-medium">Xe so</th>
                    <th className="px-4 py-3 font-medium">Thanh tien</th>
                    <th className="px-4 py-3 font-medium">Da thu</th>
                    <th className="px-4 py-3 font-medium">Con no</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3" colSpan={5}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : revenueRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Khong co du lieu doanh thu.
                      </td>
                    </tr>
                  ) : (
                    revenueRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{row.date}</td>
                        <td className="px-4 py-3">{row.truckNo}</td>
                        <td className="px-4 py-3">{formatMoney(row.amount)}</td>
                        <td className="px-4 py-3 text-emerald-700">{formatMoney(row.paid)}</td>
                        <td className="px-4 py-3 text-red-600">{formatMoney(row.debt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="debt" className="mt-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
              Tong no phai thu: <span className="font-semibold text-red-600">{formatMoney(debtTotal)}</span>
            </div>
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Khach hang</th>
                    <th className="px-4 py-3 font-medium">Tong no</th>
                    <th className="px-4 py-3 font-medium">Qua han</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3" colSpan={3}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : debtGroups.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Khong co du lieu cong no.
                      </td>
                    </tr>
                  ) : (
                    debtGroups.flatMap((group) => [
                      <tr
                        key={group.customer}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                        onClick={() =>
                          setExpandedDebtCustomer((prev) => (prev === group.customer ? null : group.customer))
                        }
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{group.customer}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">{formatMoney(group.totalDebt)}</td>
                        <td className="px-4 py-3">
                          {group.overdue ? (
                            <span className="inline-flex rounded-full border border-red-700 bg-red-700 px-2.5 py-1 text-xs font-medium text-white">
                              Qua han {'>'}30 ngay
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                              Khong
                            </span>
                          )}
                        </td>
                      </tr>,
                      ...(expandedDebtCustomer === group.customer
                        ? [
                            <tr key={`${group.customer}-detail`} className="border-b border-slate-100 bg-slate-50/50">
                              <td colSpan={3} className="px-4 py-3">
                                <div className="overflow-auto max-h-[600px] rounded-lg border border-slate-200 bg-white">
                                  <table className="min-w-full text-left text-xs">
                                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                        <th className="px-3 py-2 font-medium">Ngay</th>
                                        <th className="px-3 py-2 font-medium">Xe so</th>
                                        <th className="px-3 py-2 font-medium">Thanh tien</th>
                                        <th className="px-3 py-2 font-medium">Da tra</th>
                                        <th className="px-3 py-2 font-medium">Con no</th>
                                        <th className="px-3 py-2 font-medium">Ngay tao phieu</th>
                                        <th className="px-3 py-2 font-medium">Ngay thanh toan gan nhat</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.tickets.map((ticket) => (
                                        <tr key={ticket.id} className="border-b border-slate-100 last:border-0">
                                          <td className="px-3 py-2">{ticket.date}</td>
                                          <td className="px-3 py-2">{ticket.truckNo}</td>
                                          <td className="px-3 py-2">{formatMoney(ticket.amount)}</td>
                                          <td className="px-3 py-2 text-emerald-700">{formatMoney(ticket.paid)}</td>
                                          <td className="px-3 py-2 text-red-600">{formatMoney(ticket.debt)}</td>
                                          <td className="px-3 py-2">{ticket.createdAt}</td>
                                          <td className="px-3 py-2">{ticket.lastPaymentDate ?? '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>,
                          ]
                        : []),
                    ])
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Cong nhan</th>
                    <th className="px-4 py-3 font-medium">Ngay co mat</th>
                    <th className="px-4 py-3 font-medium">Ngay vang</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3" colSpan={3}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : workerSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Khong co du lieu cong nhan.
                      </td>
                    </tr>
                  ) : (
                    workerSummaryRows.map((row) => (
                      <tr key={row.workerName} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.workerName}</td>
                        <td className="px-4 py-3 text-emerald-700">{row.present.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-red-600">{row.absent.toLocaleString('vi-VN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog.Root open={attendanceDetailOpen} onOpenChange={setAttendanceDetailOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Chi tiet cham cong ngay {attendanceDetail?.date ?? ''}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {!attendanceDetail ? (
              <p className="text-sm text-slate-500">Khong co du lieu.</p>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-3 py-2 font-medium">Cong nhan</th>
                      <th className="px-3 py-2 font-medium">Trang thai</th>
                      <th className="px-3 py-2 font-medium">Luong ngay</th>
                      <th className="px-3 py-2 font-medium">Ghi chu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceDetail.details.map((detail, index) => (
                      <tr key={`${detail.workerName}-${index}`} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">{detail.workerName}</td>
                        <td className="px-3 py-2">{statusLabel(detail.status)}</td>
                        <td className="px-3 py-2">{formatMoney(detail.dailySalary)}</td>
                        <td className="px-3 py-2 text-slate-600">{detail.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
