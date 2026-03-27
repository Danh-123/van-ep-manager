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
  if (status === 'CoMat') return 'Có mặt';
  if (status === 'Nghi') return 'Nghỉ';
  if (status === 'NghiPhep') return 'Nghỉ phép';
  return 'Làm thêm';
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
          { header: 'Ngày', key: 'date', width: 14 },
          { header: 'Trạng thái', key: 'status', width: 14 },
          { header: 'Lương ngày', key: 'dailySalary', width: 18 },
          { header: 'Thưởng', key: 'bonus', width: 14 },
          { header: 'Phạt', key: 'penalty', width: 14 },
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
          { header: 'Thông tin', key: 'label', width: 24 },
          { header: 'Giá trị', key: 'value', width: 28 },
        ];
        summary.getRow(1).font = { bold: true };
        summary.addRow({ label: 'Công nhân', value: workerName });
        summary.addRow({ label: 'Tháng', value: monthLabel });
        summary.addRow({ label: 'Tổng lương', value: formatMoney(totalSalary) });

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
          <h2 className="text-base font-semibold text-slate-900">Bảng lương chi tiết theo ngày</h2>
          <p className="text-sm text-slate-600">Tổng lương tháng: {formatMoney(totalSalary)}</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Xuất Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-3 py-2 font-medium">Ngày</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">Lương ngày</th>
              <th className="px-3 py-2 font-medium">Thưởng</th>
              <th className="px-3 py-2 font-medium">Phạt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Không có dữ liệu lương trong tháng này.
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
