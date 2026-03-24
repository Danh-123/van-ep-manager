'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Save,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';

import { useAttendance } from '@/hooks/useAttendance';

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function buildMonthGrid(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let current = calendarStart;

  while (current <= calendarEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

export default function AttendancePage() {
  const attendance = useAttendance();

  const days = buildMonthGrid(attendance.currentMonth);
  const monthTitle = format(attendance.currentMonth, 'MMMM yyyy');

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Cham cong</h1>
            <p className="mt-1 text-sm text-slate-600">Quan ly check-in, check-out va chia luong theo ngay.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={attendance.goToToday}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
            >
              Hom nay
            </button>
            <button
              type="button"
              onClick={attendance.goToThisWeek}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
            >
              Tuan nay
            </button>
            <button
              type="button"
              onClick={attendance.triggerRecalculate}
              disabled={attendance.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
            >
              {attendance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Recalculate
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100"
            onClick={attendance.goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-2 text-base font-semibold text-slate-800">
            <CalendarDays className="h-4 w-4 text-[#1B5E20]" />
            {monthTitle}
          </div>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100"
            onClick={attendance.goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span>CN</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const selected = toIsoDate(day) === toIsoDate(attendance.selectedDate);
            const inMonth = isSameMonth(day, attendance.currentMonth);
            const hasMark = attendance.markedDates.has(toIsoDate(day));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => attendance.setSelectedDate(day)}
                className={`relative rounded-lg border px-1 py-2 text-center text-sm transition ${
                  selected
                    ? 'border-[#2E7D32] bg-emerald-50 text-[#1B5E20]'
                    : inMonth
                      ? 'border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                      : 'border-slate-100 text-slate-400'
                }`}
              >
                <span>{format(day, 'd')}</span>
                {hasMark && (
                  <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {attendance.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{attendance.error}</div>
      )}

      {attendance.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {attendance.success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ngay {format(attendance.selectedDate, 'dd/MM/yyyy')}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tong tien cong ngay: {attendance.dailyTotalSalary.toLocaleString('vi-VN')} VND
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {attendance.isBackdate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5" />
                Ngay cu - Chinh sua se recalculate
              </span>
            )}

            <button
              type="button"
              onClick={() => attendance.setSalaryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
            >
              <CircleDollarSign className="h-4 w-4" />
              Nhap tong tien cong ngay
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th className="px-3 py-3 font-medium">STT</th>
                <th className="px-3 py-3 font-medium">Ho ten</th>
                <th className="px-3 py-3 font-medium">Check-in</th>
                <th className="px-3 py-3 font-medium">Check-out</th>
                <th className="px-3 py-3 font-medium">Trang thai</th>
                <th className="px-3 py-3 font-medium">Thuong</th>
                <th className="px-3 py-3 font-medium">Phat</th>
                <th className="px-3 py-3 font-medium">Ghi chu</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendance.loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td colSpan={9} className="px-3 py-3">
                      <div className="h-7 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : attendance.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                    Khong co cong nhan trong he thong.
                  </td>
                </tr>
              ) : (
                attendance.rows.map((row, idx) => (
                  <tr key={row.congNhanId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 text-slate-600">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{row.hoTen}</p>
                      <p className="text-xs text-slate-500">
                        {row.maCongNhan} · {row.employmentStatus === 'DangLam' ? 'Dang lam' : 'Nghi viec'}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="time"
                        value={row.checkIn}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, { checkIn: event.target.value })
                        }
                        className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="time"
                        value={row.checkOut}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, { checkOut: event.target.value })
                        }
                        className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={row.status}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, {
                            status: event.target.value as 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem',
                          })
                        }
                        className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      >
                        <option value="CoMat">Co mat</option>
                        <option value="Nghi">Nghi</option>
                        <option value="NghiPhep">Nghi phep</option>
                        <option value="LamThem">Lam them</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={row.bonus}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, { bonus: Number(event.target.value || 0) })
                        }
                        className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={row.penalty}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, { penalty: Number(event.target.value || 0) })
                        }
                        className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(event) =>
                          attendance.updateRowLocal(row.congNhanId, { note: event.target.value })
                        }
                        placeholder="Ghi chu"
                        className="h-9 w-48 rounded-lg border border-slate-200 px-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void attendance.saveRow(row)}
                        disabled={attendance.savingRowId === row.congNhanId}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#2E7D32] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E20] disabled:opacity-70"
                      >
                        {attendance.savingRowId === row.congNhanId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Luu
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog.Root open={attendance.salaryModalOpen} onOpenChange={attendance.setSalaryModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-slate-900">Nhap tong tien cong ngay</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="totalSalary">
                  Tong tien cong ngay ({format(attendance.selectedDate, 'dd/MM/yyyy')})
                </label>
                <input
                  id="totalSalary"
                  type="number"
                  min={0}
                  value={attendance.salaryInput}
                  onChange={(event) => attendance.setSalaryInput(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                So nguoi co mat: <span className="font-semibold text-slate-900">{attendance.presentCount}</span>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                  Preview luong moi nguoi sau khi chia
                </div>
                <div className="max-h-56 overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-3 py-2 font-medium">Ho ten</th>
                        <th className="px-3 py-2 font-medium">Tien du kien</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.salaryPreview.length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-slate-500" colSpan={2}>
                            Chua co du lieu preview.
                          </td>
                        </tr>
                      ) : (
                        attendance.salaryPreview.map((item) => (
                          <tr key={item.congNhanId} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2">{item.hoTen}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {Math.round(item.amount).toLocaleString('vi-VN')} VND
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Huy
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => void attendance.saveSalaryForDay()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
                >
                  <CircleDollarSign className="h-4 w-4" />
                  Luu va tinh luong
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
