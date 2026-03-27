'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type MonthOption = {
  value: string;
  label: string;
  year: string;
};

type MonthRangePickerProps = {
  options: MonthOption[];
  fromMonth: string;
  toMonth: string;
  selectedMonths: string[];
  onRangeApply: (payload: { fromMonth: string; toMonth: string }) => void;
  onSelectedMonthsApply: (months: string[]) => void;
};

function groupByYear(options: MonthOption[]) {
  const map = new Map<string, MonthOption[]>();

  options.forEach((option) => {
    const current = map.get(option.year) ?? [];
    current.push(option);
    map.set(option.year, current);
  });

  return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
}

export default function MonthRangePicker({
  options,
  fromMonth,
  toMonth,
  selectedMonths,
  onRangeApply,
  onSelectedMonthsApply,
}: MonthRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromMonth);
  const [draftTo, setDraftTo] = useState(toMonth);
  const [draftSelected, setDraftSelected] = useState<string[]>(selectedMonths);

  const grouped = useMemo(() => groupByYear(options), [options]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftFrom(fromMonth);
      setDraftTo(toMonth);
      setDraftSelected(selectedMonths);
    }
  };

  const toggleMonth = (monthValue: string) => {
    setDraftSelected((prev) => {
      if (prev.includes(monthValue)) {
        return prev.filter((month) => month !== monthValue);
      }

      return [...prev, monthValue];
    });
  };

  const handleApply = () => {
    onRangeApply({ fromMonth: draftFrom, toMonth: draftTo });
    onSelectedMonthsApply(draftSelected);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ChevronDown className="h-4 w-4" />
        Chọn nhiều tháng
      </button>

      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">Chọn nhiều tháng</Dialog.Title>
                <p className="mt-1 text-sm text-slate-600">Chọn khoảng thời gian hoặc tick từng tháng để xem bảng lương gộp.</p>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Chọn khoảng thời gian</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Từ tháng</label>
                    <select
                      value={draftFrom}
                      onChange={(event) => setDraftFrom(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/25 focus:border-[#0B7285] focus:ring-4"
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Đến tháng</label>
                    <select
                      value={draftTo}
                      onChange={(event) => setDraftTo(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/25 focus:border-[#0B7285] focus:ring-4"
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Hoặc chọn từng tháng</h3>
                <div className="mt-3 space-y-4">
                  {grouped.map(([year, months]) => (
                    <div key={year}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Năm {year}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {months.map((month) => {
                          const checked = draftSelected.includes(month.value);

                          return (
                            <label
                              key={month.value}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                checked
                                  ? 'border-[#0B7285] bg-[#0B7285]/10 text-[#0B7285]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMonth(month.value)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              {month.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095c6d]"
              >
                Áp dụng
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
