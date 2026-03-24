'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { useTransition } from 'react';

export type PersonalSalaryDay = {
  date: string;
  status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  dailySalary: number;
  bonus: number;
  penalty: number;
};

type PersonalSalaryTableProps = {
  workerName: string;
  monthLabel: string;
  rows: PersonalSalaryDay[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: PersonalSalaryDay['status']) {
  if (status === 'CoMat') return 'Co mat';
  if (status === 'Nghi') return 'Nghi';
  if (status === 'NghiPhep') return 'Nghi phep';
  return 'Lam them';
}

export default function PersonalSalaryTable({ workerName, monthLabel, rows }: PersonalSalaryTableProps) {
  const [isPending, startTransition] = useTransition();

  const totalSalary = rows.reduce((sum, row) => sum + row.dailySalary, 0);

  const handleExport = () => {
    startTransition(() => {
      void (async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('LuongCaNhan');

        sheet.columns = [
          { header: 'Ngay', key: 'date', width: 14 },
          { header: 'Trang thai', key: 'status', width: 14 },
          { header: 'Luong ngay', key: 'dailySalary', width: 18 },
          { header: 'Thuong', key: 'bonus', width: 14 },
          { header: 'Phat', key: 'penalty', width: 14 },
        ];

        sheet.getRow(1).font = { bold: true };

        rows.forEach((row) => {
          sheet.addRow({
            date: row.date,
            status: statusLabel(row.status),
            dailySalary: Math.round(row.dailySalary),
            bonus: Math.round(row.bonus),
            penalty: Math.round(row.penalty),
          });
        });

        const summary = workbook.addWorksheet('TongHop');
        summary.columns = [
          { header: 'Thong tin', key: 'label', width: 24 },
          { header: 'Gia tri', key: 'value', width: 28 },
        ];
        summary.getRow(1).font = { bold: true };
        summary.addRow({ label: 'Cong nhan', value: workerName });
        summary.addRow({ label: 'Thang', value: monthLabel });
        summary.addRow({ label: 'Tong luong', value: formatMoney(totalSalary) });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const monthKey = monthLabel.replace('/', '-');
        saveAs(blob, `luong-ca-nhan-${monthKey}.xlsx`);
      })();
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Bang luong chi tiet theo ngay</h2>
          <p className="text-sm text-slate-600">Tong luong thang: {formatMoney(totalSalary)}</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Xuat Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-3 py-2 font-medium">Ngay</th>
              <th className="px-3 py-2 font-medium">Trang thai</th>
              <th className="px-3 py-2 font-medium">Luong ngay</th>
              <th className="px-3 py-2 font-medium">Thuong</th>
              <th className="px-3 py-2 font-medium">Phat</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Khong co du lieu luong trong thang nay.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.date} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatMoney(row.dailySalary)}</td>
                  <td className="px-3 py-2 text-emerald-700">{formatMoney(row.bonus)}</td>
                  <td className="px-3 py-2 text-red-700">{formatMoney(row.penalty)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
