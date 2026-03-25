'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Loader2, RefreshCcw, Save, X } from 'lucide-react';

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

type MultiMonthViewProps = {
  monthOrder: string[];
  dataByMonth: Record<string, SalaryMonthData>;
  loadingMonths: string[];
  savingAdjustMonths: string[];
  recalculatingMonths: string[];
  onBonusChange: (month: string, workerId: number, value: number) => void;
  onPenaltyChange: (month: string, workerId: number, value: number) => void;
  onSaveAdjustments: (month: string) => Promise<void>;
  onRecalculate: (month: string) => Promise<void>;
  onRemoveMonth: (month: string) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function parseNonNegative(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function hasMonth(list: string[], month: string) {
  return list.includes(month);
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FF0F172A' } };
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2F3E7' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });
}

function addBorders(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, columnCount: number) {
  for (let r = fromRow; r <= toRow; r += 1) {
    for (let c = 1; c <= columnCount; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  }
}

async function exportMultiMonthSalary(monthOrder: string[], dataByMonth: Record<string, SalaryMonthData>) {
  const workbook = new ExcelJS.Workbook();

  for (const month of monthOrder) {
    const monthData = dataByMonth[month];
    if (!monthData) continue;

    const sheetName = `Luong_${monthData.monthLabel.replace('/', '_')}`;
    const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `BẢNG LƯƠNG THÁNG ${monthData.monthLabel}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Họ tên', key: 'hoTen', width: 30 },
      { header: 'Lương cơ bản', key: 'baseSalary', width: 18 },
      { header: 'Thưởng', key: 'bonus', width: 16 },
      { header: 'Phạt', key: 'penalty', width: 16 },
      { header: 'Tổng lương', key: 'totalSalary', width: 20 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = ['STT', 'Họ tên', 'Lương cơ bản', 'Thưởng', 'Phạt', 'Tổng lương'];
    styleHeaderRow(headerRow);

    monthData.rows.forEach((row, index) => {
      sheet.addRow({
        stt: index + 1,
        hoTen: row.hoTen,
        baseSalary: Math.round(row.baseSalary),
        bonus: Math.round(row.bonus),
        penalty: Math.round(row.penalty),
        totalSalary: Math.round(row.totalSalary),
      });
    });

    const totalRow = sheet.addRow({
      stt: '',
      hoTen: 'Tổng cộng',
      baseSalary: Math.round(monthData.totals.baseSalary),
      bonus: Math.round(monthData.totals.bonus),
      penalty: Math.round(monthData.totals.penalty),
      totalSalary: Math.round(monthData.totals.totalSalary),
    });

    totalRow.font = { bold: true };

    for (let r = 4; r <= sheet.rowCount; r += 1) {
      for (const col of ['C', 'D', 'E', 'F']) {
        sheet.getCell(`${col}${r}`).numFmt = '#,##0 "₫"';
      }
    }

    addBorders(sheet, 3, sheet.rowCount, 6);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const suffix = monthOrder.length === 1 ? monthOrder[0] : `${monthOrder[0]}_to_${monthOrder[monthOrder.length - 1]}`;
  saveAs(blob, `bang-luong-${suffix}.xlsx`);
}

export default function MultiMonthView({
  monthOrder,
  dataByMonth,
  loadingMonths,
  savingAdjustMonths,
  recalculatingMonths,
  onBonusChange,
  onPenaltyChange,
  onSaveAdjustments,
  onRecalculate,
  onRemoveMonth,
}: MultiMonthViewProps) {
  const hasAnyData = monthOrder.some((month) => Boolean(dataByMonth[month]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={!hasAnyData}
          onClick={() => void exportMultiMonthSalary(monthOrder, dataByMonth)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 px-4 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Xuất Excel
        </button>
      </div>

      {monthOrder.map((month) => {
        const monthData = dataByMonth[month];
        const isLoading = hasMonth(loadingMonths, month);
        const isSavingAdjust = hasMonth(savingAdjustMonths, month);
        const isRecalculating = hasMonth(recalculatingMonths, month);

        return (
          <section key={month} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Bảng lương tháng {monthData?.monthLabel ?? month}
                </h2>
                <p className="text-sm text-slate-500">Xem và điều chỉnh thưởng/phạt theo từng công nhân</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSaveAdjustments(month)}
                  disabled={isLoading || isSavingAdjust || isRecalculating || !monthData}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAdjust ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu thưởng/phạt
                </button>

                <button
                  type="button"
                  onClick={() => void onRecalculate(month)}
                  disabled={isLoading || isSavingAdjust || isRecalculating || !monthData}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2E7D32] px-3 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Tính lại lương
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveMonth(month)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  aria-label="Xóa tháng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">STT</th>
                    <th className="px-4 py-3 font-medium">Họ tên</th>
                    <th className="px-4 py-3 font-medium">Lương cơ bản</th>
                    <th className="px-4 py-3 font-medium">Thưởng</th>
                    <th className="px-4 py-3 font-medium">Phạt</th>
                    <th className="px-4 py-3 font-medium">Tổng lương</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-8 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : !monthData || monthData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Không có dữ liệu lương trong tháng này.
                      </td>
                    </tr>
                  ) : (
                    monthData.rows.map((row, index) => {
                      const bonus = parseNonNegative(row.bonus);
                      const penalty = parseNonNegative(row.penalty);
                      const totalSalary = Math.max(0, row.baseSalary + bonus - penalty);

                      return (
                        <tr key={row.workerId} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3 text-slate-900">{row.hoTen}</td>
                          <td className="px-4 py-3 text-slate-700">{formatMoney(row.baseSalary)}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              value={bonus}
                              onChange={(event) => onBonusChange(month, row.workerId, parseNonNegative(event.target.value))}
                              className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              value={penalty}
                              onChange={(event) => onPenaltyChange(month, row.workerId, parseNonNegative(event.target.value))}
                              className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#1B5E20]">{formatMoney(totalSalary)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {monthData && monthData.rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-800">
                      <td className="px-4 py-3" colSpan={2}>
                        Tổng cộng
                      </td>
                      <td className="px-4 py-3">{formatMoney(monthData.totals.baseSalary)}</td>
                      <td className="px-4 py-3 text-emerald-700">{formatMoney(monthData.totals.bonus)}</td>
                      <td className="px-4 py-3 text-red-600">{formatMoney(monthData.totals.penalty)}</td>
                      <td className="px-4 py-3 text-[#1B5E20]">{formatMoney(monthData.totals.totalSalary)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
