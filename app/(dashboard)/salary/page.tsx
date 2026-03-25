'use client';

import { format } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import MultiMonthView from '@/components/salary/MultiMonthView';
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

type SalaryRow = {
  workerId: number;
  hoTen: string;
  baseSalary: number;
  bonus: number;
  penalty: number;
  totalSalary: number;
};

type SalaryMonthData = {
  month: string;
  monthLabel: string;
  rows: SalaryRow[];
  totals: {
    baseSalary: number;
    bonus: number;
    penalty: number;
    totalSalary: number;
  };
};

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
  const [monthPicker, setMonthPicker] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [dataByMonth, setDataByMonth] = useState<Record<string, SalaryMonthData>>({});
  const [loadingMonths, setLoadingMonths] = useState<string[]>([]);
  const [savingAdjustMonths, setSavingAdjustMonths] = useState<string[]>([]);
  const [recalculatingMonths, setRecalculatingMonths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending] = useTransition();

  const monthOptions = useMemo(() => (mounted ? getMonthOptions() : []), [mounted]);

  useEffect(() => {
    if (!mounted || selectedMonths.length > 0) return;
    const currentMonth = getMonthKey(new Date());
    setMonthPicker(currentMonth);
    setSelectedMonths([currentMonth]);
  }, [mounted, selectedMonths.length]);

  const setMonthLoading = (month: string, loading: boolean) => {
    setLoadingMonths((prev) => {
      if (loading) {
        return prev.includes(month) ? prev : [...prev, month];
      }
      return prev.filter((item) => item !== month);
    });
  };

  const setMonthSavingAdjust = (month: string, saving: boolean) => {
    setSavingAdjustMonths((prev) => {
      if (saving) {
        return prev.includes(month) ? prev : [...prev, month];
      }
      return prev.filter((item) => item !== month);
    });
  };

  const setMonthRecalculating = (month: string, recalculating: boolean) => {
    setRecalculatingMonths((prev) => {
      if (recalculating) {
        return prev.includes(month) ? prev : [...prev, month];
      }
      return prev.filter((item) => item !== month);
    });
  };

  const loadMonth = useCallback(async (month: string) => {
    setMonthLoading(month, true);

    try {
      const response = await fetch(`/api/salary?month=${month}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as SalaryMonthData | { error: string };

      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error : 'Không thể tải dữ liệu lương tháng.');
        setMonthLoading(month, false);
        return;
      }

      setDataByMonth((prev) => ({ ...prev, [month]: payload }));
      setMonthLoading(month, false);
    } catch {
      setError('Không thể tải dữ liệu lương tháng. Vui lòng thử lại.');
      setMonthLoading(month, false);
    }
  }, []);

  useEffect(() => {
    if (selectedMonths.length === 0) return;

    selectedMonths.forEach((month) => {
      if (!dataByMonth[month]) {
        void loadMonth(month);
      }
    });
  }, [dataByMonth, loadMonth, selectedMonths]);

  const recalculateTotals = (rows: SalaryRow[]) => {
    return rows.reduce(
      (acc, row) => ({
        baseSalary: acc.baseSalary + row.baseSalary,
        bonus: acc.bonus + row.bonus,
        penalty: acc.penalty + row.penalty,
        totalSalary: acc.totalSalary + row.totalSalary,
      }),
      { baseSalary: 0, bonus: 0, penalty: 0, totalSalary: 0 },
    );
  };

  const updateAdjustment = (month: string, workerId: number, patch: Partial<SalaryRow>) => {
    setDataByMonth((prev) => {
      const monthData = prev[month];
      if (!monthData) return prev;

      const rows = monthData.rows.map((row) => {
        if (row.workerId !== workerId) return row;

        const bonus = patch.bonus ?? row.bonus;
        const penalty = patch.penalty ?? row.penalty;

        return {
          ...row,
          ...patch,
          bonus,
          penalty,
          totalSalary: Math.max(0, row.baseSalary + bonus - penalty),
        };
      });

      return {
        ...prev,
        [month]: {
          ...monthData,
          rows,
          totals: recalculateTotals(rows),
        },
      };
    });
  };

  const handleSaveAdjustments = async (month: string) => {
    const monthData = dataByMonth[month];
    if (!monthData) return;

    setError(null);
    setSuccess(null);
    setMonthSavingAdjust(month, true);

    try {
      const response = await fetch('/api/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          month,
          adjustments: monthData.rows.map((row) => ({
            workerId: row.workerId,
            bonus: Number(row.bonus || 0),
            penalty: Number(row.penalty || 0),
          })),
        }),
      });

      const payload = (await response.json()) as SalaryMonthData | { error: string };

      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error : 'Không thể lưu thưởng/phạt.');
        setMonthSavingAdjust(month, false);
        return;
      }

      setDataByMonth((prev) => ({ ...prev, [month]: payload }));
      setSuccess(`Đã lưu thưởng/phạt tháng ${payload.monthLabel}.`);
      setMonthSavingAdjust(month, false);
    } catch {
      setError('Không thể lưu thưởng/phạt. Vui lòng thử lại.');
      setMonthSavingAdjust(month, false);
    }
  };

  if (!mounted) {
    return <SalaryTableSkeleton />;
  }

  const handleRecalculate = async (month: string) => {
    setError(null);
    setSuccess(null);
    setMonthRecalculating(month, true);

    try {
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate', month }),
      });

      const payload = (await response.json()) as SalaryMonthData | { error: string };

      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error : 'Không thể tính lại lương tháng.');
        setMonthRecalculating(month, false);
        return;
      }

      setDataByMonth((prev) => ({ ...prev, [month]: payload }));
      setSuccess(`Đã tính lại lương tháng ${payload.monthLabel} thành công.`);
      setMonthRecalculating(month, false);
    } catch {
      setError('Không thể tính lại lương tháng. Vui lòng thử lại.');
      setMonthRecalculating(month, false);
    }
  };

  const handleAddMonth = () => {
    setError(null);
    setSuccess(null);

    if (!monthPicker) {
      setError('Vui lòng chọn tháng trước khi thêm.');
      return;
    }

    if (selectedMonths.includes(monthPicker)) {
      setError('Tháng này đã có trong danh sách.');
      return;
    }

    if (selectedMonths.length >= 5) {
      setError('Chỉ có thể xem tối đa 5 tháng cùng lúc.');
      return;
    }

    setSelectedMonths((prev) => [...prev, monthPicker].sort((a, b) => b.localeCompare(a)));
  };

  const handleRemoveMonth = (month: string) => {
    setSelectedMonths((prev) => prev.filter((item) => item !== month));
    setDataByMonth((prev) => {
      const cloned = { ...prev };
      delete cloned[month];
      return cloned;
    });
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tính lương</h1>
            <p className="mt-1 text-sm text-slate-600">Xem và quản lý lương theo một hoặc nhiều tháng.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="monthSelector">
              Tháng
            </label>
            <select
              id="monthSelector"
              value={monthPicker}
              onChange={(event) => setMonthPicker(event.target.value)}
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
              onClick={handleAddMonth}
              disabled={isPending || selectedMonths.length >= 5}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2E7D32] px-4 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              + Thêm tháng
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

      {selectedMonths.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Chưa có tháng nào được chọn. Vui lòng chọn tháng và bấm &quot;+ Thêm tháng&quot;.
        </section>
      ) : selectedMonths.every((month) => loadingMonths.includes(month) && !dataByMonth[month]) ? (
        <SalaryTableSkeleton />
      ) : (
        <MultiMonthView
          monthOrder={selectedMonths}
          dataByMonth={dataByMonth}
          loadingMonths={loadingMonths}
          savingAdjustMonths={savingAdjustMonths}
          recalculatingMonths={recalculatingMonths}
          onBonusChange={(month, workerId, value) => updateAdjustment(month, workerId, { bonus: value })}
          onPenaltyChange={(month, workerId, value) => updateAdjustment(month, workerId, { penalty: value })}
          onSaveAdjustments={handleSaveAdjustments}
          onRecalculate={handleRecalculate}
          onRemoveMonth={handleRemoveMonth}
        />
      )}
    </div>
  );
}
