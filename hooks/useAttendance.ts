'use client';

import { addMonths, format, isSameDay, startOfDay, startOfToday, startOfWeek } from 'date-fns';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import {
  getAttendanceByDate,
  recalculateSalary,
  saveDailySalary,
  type AttendanceRow,
  updateAttendance,
} from '@/app/(dashboard)/attendance/actions';

type UseAttendanceState = {
  currentMonth: Date;
  selectedDate: Date;
  rows: AttendanceRow[];
  markedDates: Set<string>;
  loading: boolean;
  savingRowId: number | null;
  salaryModalOpen: boolean;
  dailyTotalSalary: number;
  presentCount: number;
  salaryInput: string;
  error: string | null;
  success: string | null;
  isPending: boolean;
  setSalaryModalOpen: (open: boolean) => void;
  setSalaryInput: (value: string) => void;
  setSelectedDate: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  goToThisWeek: () => void;
  updateRowLocal: (congNhanId: number, patch: Partial<AttendanceRow>) => void;
  saveRow: (row: AttendanceRow) => Promise<void>;
  saveSalaryForDay: () => Promise<void>;
  triggerRecalculate: () => Promise<void>;
  refresh: () => Promise<void>;
  isBackdate: boolean;
  salaryPreview: Array<{ congNhanId: number; hoTen: string; amount: number }>;
};

function isPresentStatus(status: AttendanceRow['status']) {
  return status === 'CoMat' || status === 'LamThem';
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function useAttendance(): UseAttendanceState {
  const [currentMonth, setCurrentMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDateState] = useState(() => startOfDay(new Date()));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [dailyTotalSalary, setDailyTotalSalary] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [salaryInput, setSalaryInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadDate = useCallback(async (date: Date, monthRef?: Date) => {
    setLoading(true);
    setError(null);

    const result = await getAttendanceByDate(toIsoDate(date), format(monthRef ?? date, 'yyyy-MM'));
    if (!result.success) {
      setRows([]);
      setMarkedDates(new Set());
      setDailyTotalSalary(0);
      setPresentCount(0);
      setError(result.error);
      setLoading(false);
      return;
    }

    setRows(result.data.rows);
    setMarkedDates(new Set(result.data.markedDates));
    setDailyTotalSalary(result.data.dailyTotalSalary);
    setPresentCount(result.data.presentCount);
    setSalaryInput(result.data.dailyTotalSalary > 0 ? String(Math.round(result.data.dailyTotalSalary)) : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDate(selectedDate, currentMonth);
  }, [currentMonth, loadDate, selectedDate]);

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(startOfDay(date));
    setSuccess(null);
    setError(null);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    const today = startOfToday();
    setCurrentMonth(today);
    setSelectedDateState(today);
    setSuccess(null);
    setError(null);
  }, []);

  const goToThisWeek = useCallback(() => {
    const firstDay = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentMonth(firstDay);
    setSelectedDateState(firstDay);
    setSuccess(null);
    setError(null);
  }, []);

  const updateRowLocal = useCallback((congNhanId: number, patch: Partial<AttendanceRow>) => {
    setRows((prev) => prev.map((row) => (row.congNhanId === congNhanId ? { ...row, ...patch } : row)));
  }, []);

  const saveRow = useCallback(
    async (row: AttendanceRow) => {
      setSavingRowId(row.congNhanId);
      setError(null);
      setSuccess(null);

      const result = await updateAttendance({
        date: toIsoDate(selectedDate),
        congNhanId: row.congNhanId,
        status: row.status,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        bonus: Number(row.bonus || 0),
        penalty: Number(row.penalty || 0),
        note: row.note,
      });

      if (!result.success) {
        setError(result.error);
        setSavingRowId(null);
        return;
      }

      await loadDate(selectedDate, currentMonth);
      setSuccess(`Da cap nhat chấm công cho ${row.hoTen}.`);
      setSavingRowId(null);
    },
    [currentMonth, loadDate, selectedDate],
  );

  const refresh = useCallback(async () => {
    await loadDate(selectedDate, currentMonth);
  }, [currentMonth, loadDate, selectedDate]);

  const saveSalaryForDay = useCallback(async () => {
    const totalAmount = Number(salaryInput);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError('Tong tien cong khong hop le');
      return;
    }

    setError(null);
    setSuccess(null);

    const result = await saveDailySalary({
      date: toIsoDate(selectedDate),
      totalAmount,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSalaryModalOpen(false);
    await loadDate(selectedDate, currentMonth);
    setSuccess('Da luu tong tien cong ngay va tinh luong thanh cong.');
  }, [currentMonth, loadDate, salaryInput, selectedDate]);

  const triggerRecalculate = useCallback(async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await recalculateSalary(toIsoDate(selectedDate));
      if (!result.success) {
        setError(result.error);
        return;
      }

      await loadDate(selectedDate, currentMonth);
      setSuccess('Da recalculate luong cho ngay duoc chon.');
    });
  }, [currentMonth, loadDate, selectedDate]);

  const isBackdate = useMemo(
    () => startOfDay(selectedDate).getTime() < startOfToday().getTime(),
    [selectedDate],
  );

  const salaryPreview = useMemo(() => {
    const totalAmount = Number(salaryInput);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return [];
    }

    const presentRows = rows.filter((row) => isPresentStatus(row.status));
    if (presentRows.length === 0) {
      return [];
    }

    const base = totalAmount / presentRows.length;

    return presentRows.map((row) => ({
      congNhanId: row.congNhanId,
      hoTen: row.hoTen,
      amount: Math.max(0, base + Number(row.bonus || 0) - Number(row.penalty || 0)),
    }));
  }, [rows, salaryInput]);

  return {
    currentMonth,
    selectedDate,
    rows,
    markedDates,
    loading,
    savingRowId,
    salaryModalOpen,
    dailyTotalSalary,
    presentCount,
    salaryInput,
    error,
    success,
    isPending,
    setSalaryModalOpen,
    setSalaryInput,
    setSelectedDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToThisWeek,
    updateRowLocal,
    saveRow,
    saveSalaryForDay,
    triggerRecalculate,
    refresh,
    isBackdate,
    salaryPreview,
  };
}
