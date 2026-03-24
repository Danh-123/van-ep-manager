'use client';

import { format } from 'date-fns';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  forceRecalculateMonth,
  getSalaryMonthData,
  type SalaryMonthData,
} from '@/app/(dashboard)/salary/actions';
import SalaryTable from '@/components/salary/SalaryTable';
import { useMounted } from '@/hooks/useMounted';

function getMonthKey(date: Date) {
  return format(date, 'yyyy-MM');
}

function getMonthOptions(anchorDate = new Date()) {
  const options: Array<{ label: string; value: string }> = [];
  const start = new Date(anchorDate.getFullYear() - 1, 0, 1);

  for (let i = 0; i < 24; i += 1) {
    const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
    options.push({
      value: getMonthKey(current),
      label: format(current, 'MM/yyyy'),
    });
  }

  return options.reverse();
}

function SalaryTableSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

export default function SalaryPage() {
  const mounted = useMounted();
  const [monthKey, setMonthKey] = useState('');
  const [data, setData] = useState<SalaryMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monthOptions = useMemo(() => (mounted ? getMonthOptions() : []), [mounted]);

  useEffect(() => {
    if (mounted && !monthKey) {
      setMonthKey(getMonthKey(new Date()));
    }
  }, [mounted, monthKey]);

  const loadData = async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    const result = await getSalaryMonthData(targetMonth);

    if (!result.success) {
      setData(null);
      setError(result.error);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!monthKey) return;
    void loadData(monthKey);
  }, [monthKey]);

  if (!mounted) {
    return <SalaryTableSkeleton />;
  }

  const handleRecalculate = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await forceRecalculateMonth(monthKey);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setData(result.data);
      setSuccess('Da tinh lai luong thang thanh cong.');
    });
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Quan ly luong</h1>
            <p className="mt-1 text-sm text-slate-600">Theo doi va tinh luong theo thang cho toan bo cong nhan.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="monthSelector">
              Thang
            </label>
            <select
              id="monthSelector"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="h-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2E7D32] px-4 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Tinh lai luong thang
            </button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading || !data ? (
        <SalaryTableSkeleton />
      ) : (
        <SalaryTable monthKey={monthKey} rows={data.rows} totals={data.totals} />
      )}
    </div>
  );
}
