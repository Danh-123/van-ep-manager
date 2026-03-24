'use server';

import { endOfMonth, format, startOfMonth } from 'date-fns';

import {
  calculateMonthlySalary,
  recalculateAllSalaries,
  type MonthlySalaryRow,
} from '@/lib/salary/calculator';

export type SalaryMonthData = {
  monthKey: string;
  rows: MonthlySalaryRow[];
  totals: {
    baseSalary: number;
    bonus: number;
    penalty: number;
    totalSalary: number;
  };
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Thang khong hop le');
  }
  return new Date(year, month - 1, 1);
}

export async function getSalaryMonthData(monthKey: string): Promise<ActionResult<SalaryMonthData>> {
  try {
    const monthDate = parseMonthKey(monthKey);
    const rows = await calculateMonthlySalary(monthDate);

    const totals = rows.reduce(
      (acc, row) => ({
        baseSalary: acc.baseSalary + row.baseSalary,
        bonus: acc.bonus + row.bonus,
        penalty: acc.penalty + row.penalty,
        totalSalary: acc.totalSalary + row.totalSalary,
      }),
      { baseSalary: 0, bonus: 0, penalty: 0, totalSalary: 0 },
    );

    return {
      success: true,
      data: {
        monthKey,
        rows,
        totals,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tai du lieu luong',
    };
  }
}

export async function forceRecalculateMonth(monthKey: string): Promise<ActionResult<SalaryMonthData>> {
  try {
    const monthDate = parseMonthKey(monthKey);
    const rangeStart = startOfMonth(monthDate);
    const rangeEnd = endOfMonth(monthDate);

    for (
      let cursor = new Date(rangeStart);
      cursor <= rangeEnd;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      await recalculateAllSalaries(cursor);
    }

    return getSalaryMonthData(format(monthDate, 'yyyy-MM'));
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Khong the tinh lai luong thang',
    };
  }
}
