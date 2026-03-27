'use client';

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parse,
  startOfMonth,
} from 'date-fns';
import { useMemo, useState } from 'react';

export type PersonalAttendanceDay = {
  date: string;
  status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  checkIn: string;
  checkOut: string;
  dailySalary: number;
  note: string;
};

type PersonalCalendarProps = {
  monthKey: string;
  rows: PersonalAttendanceDay[];
};

function statusBadgeClass(status: PersonalAttendanceDay['status']) {
  if (status === 'CoMat') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Nghi') return 'bg-slate-50 text-slate-600 border-slate-200';
  if (status === 'NghiPhep') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function statusLabel(status: PersonalAttendanceDay['status']) {
  if (status === 'CoMat') return 'Có mặt';
  if (status === 'Nghi') return 'Nghỉ';
  if (status === 'NghiPhep') return 'Nghỉ phép';
  return 'Làm thêm';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PersonalCalendar({ monthKey, rows }: PersonalCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(rows[0]?.date ?? null);

  const monthDate = useMemo(() => parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date()), [monthKey]);
  const monthLabel = useMemo(() => format(monthDate, 'MM/yyyy'), [monthDate]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) }),
    [monthDate],
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<string, PersonalAttendanceDay>();
    rows.forEach((row) => map.set(row.date, row));
    return map;
  }, [rows]);

  const leadingEmpty = useMemo(() => {
    const first = startOfMonth(monthDate);
    const weekday = getDay(first);
    return weekday === 0 ? 6 : weekday - 1;
  }, [monthDate]);

  const selectedDetail = selectedDate ? attendanceMap.get(selectedDate) ?? null : null;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Lịch chấm công tháng {monthLabel}</h2>
        <p className="text-sm text-slate-600">Click vào ngày để xem chi tiết check-in/check-out.</p>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
        <div>T2</div>
        <div>T3</div>
        <div>T4</div>
        <div>T5</div>
        <div>T6</div>
        <div>T7</div>
        <div>CN</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: leadingEmpty }).map((_, index) => (
          <div key={`empty-${index}`} className="h-20 rounded-lg border border-transparent" />
        ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const attendance = attendanceMap.get(key);
          const isSelected = selectedDate === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`h-20 rounded-lg border p-2 text-left transition ${
                isSelected ? 'border-[#2E7D32] ring-2 ring-[#2E7D32]/25' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-medium text-slate-700">{format(day, 'dd')}</div>
              {attendance ? (
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${statusBadgeClass(attendance.status)}`}>
                  {statusLabel(attendance.status)}
                </span>
              ) : (
                <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
                  Không có
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">Chi tiết ngày: {selectedDate ?? '-'}</p>
        {!selectedDetail ? (
          <p className="mt-1 text-slate-500">Không có bản ghi chấm công cho ngày này.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-1 text-slate-700 sm:grid-cols-2">
            <p>Trạng thái: {statusLabel(selectedDetail.status)}</p>
            <p>Lương ngày: {formatMoney(selectedDetail.dailySalary)}</p>
            <p>Check-in: {selectedDetail.checkIn || '-'}</p>
            <p>Check-out: {selectedDetail.checkOut || '-'}</p>
            <p className="sm:col-span-2">Ghi chú: {selectedDetail.note || '-'}</p>
          </div>
        )}
      </div>
    </section>
  );
}
