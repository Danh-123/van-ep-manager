'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Eye, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { type MonthlySalaryRow } from '@/lib/salary/calculator';

import SalaryDetailModal from './SalaryDetailModal';

type SalaryTableProps = {
  monthKey: string;
  rows: MonthlySalaryRow[];
  totals: {
    baseSalary: number;
    bonus: number;
    penalty: number;
    totalSalary: number;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem') {
  if (status === 'CoMat') return 'Co mat';
  if (status === 'Nghi') return 'Nghi';
  if (status === 'NghiPhep') return 'Nghi phep';
  return 'Lam them';
}

export default function SalaryTable({ monthKey, rows, totals }: SalaryTableProps) {
  const [expandedWorkerId, setExpandedWorkerId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<MonthlySalaryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const rowCount = useMemo(() => rows.length, [rows.length]);

  const handleExport = () => {
    startTransition(async () => {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('BangLuongThang');

      summarySheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Ho ten', key: 'workerName', width: 28 },
        { header: 'Luong co ban', key: 'baseSalary', width: 20 },
        { header: 'Thuong', key: 'bonus', width: 16 },
        { header: 'Phat', key: 'penalty', width: 16 },
        { header: 'Tong luong', key: 'totalSalary', width: 20 },
      ];

      rows.forEach((row, index) => {
        summarySheet.addRow({
          stt: index + 1,
          workerName: row.workerName,
          baseSalary: Math.round(row.baseSalary),
          bonus: Math.round(row.bonus),
          penalty: Math.round(row.penalty),
          totalSalary: Math.round(row.totalSalary),
        });
      });

      summarySheet.addRow({
        stt: '',
        workerName: 'Tong cong',
        baseSalary: Math.round(totals.baseSalary),
        bonus: Math.round(totals.bonus),
        penalty: Math.round(totals.penalty),
        totalSalary: Math.round(totals.totalSalary),
      });

      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(summarySheet.rowCount).font = { bold: true };

      const detailSheet = workbook.addWorksheet('ChiTietLuongNgay');
      detailSheet.columns = [
        { header: 'Ho ten', key: 'workerName', width: 28 },
        { header: 'Ngay', key: 'date', width: 14 },
        { header: 'Trang thai', key: 'status', width: 14 },
        { header: 'Luong ngay', key: 'dailySalary', width: 18 },
        { header: 'Thuong', key: 'bonus', width: 16 },
        { header: 'Phat', key: 'penalty', width: 16 },
        { header: 'Ghi chu', key: 'note', width: 30 },
      ];

      rows.forEach((row) => {
        row.details.forEach((detail) => {
          detailSheet.addRow({
            workerName: row.workerName,
            date: format(new Date(detail.date), 'dd/MM/yyyy'),
            status: statusLabel(detail.status),
            dailySalary: Math.round(detail.dailySalary),
            bonus: Math.round(detail.bonus),
            penalty: Math.round(detail.penalty),
            note: detail.note || '',
          });
        });
      });

      detailSheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      saveAs(blob, `bang-luong-${monthKey}.xlsx`);
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bang luong thang</h2>
          <p className="text-sm text-slate-500">So nhan su: {rowCount}</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Xuat Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">STT</th>
              <th className="px-4 py-3 font-medium">Ho ten</th>
              <th className="px-4 py-3 font-medium">Luong co ban</th>
              <th className="px-4 py-3 font-medium">Thuong</th>
              <th className="px-4 py-3 font-medium">Phat</th>
              <th className="px-4 py-3 font-medium">Tong luong</th>
              <th className="px-4 py-3 text-right font-medium">Chi tiet</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Khong co du lieu luong trong thang nay.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const expanded = expandedWorkerId === row.workerId;

                return (
                  <>
                    <tr key={row.workerId} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedWorkerId(expanded ? null : row.workerId)}
                          className="inline-flex items-center gap-1 font-medium text-slate-800 hover:text-[#1B5E20]"
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {row.workerName}
                        </button>
                        <p className="text-xs text-slate-500">
                          {row.employmentStatus === 'DangLam' ? 'Dang lam' : 'Nghi viec'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(row.baseSalary)}</td>
                      <td className="px-4 py-3 text-emerald-700">{formatMoney(row.bonus)}</td>
                      <td className="px-4 py-3 text-red-600">{formatMoney(row.penalty)}</td>
                      <td className="px-4 py-3 font-semibold text-[#1B5E20]">{formatMoney(row.totalSalary)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setDetailRow(row);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem
                        </button>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                  <th className="px-3 py-2 font-medium">Ngay</th>
                                  <th className="px-3 py-2 font-medium">Trang thai</th>
                                  <th className="px-3 py-2 font-medium">Luong ngay</th>
                                  <th className="px-3 py-2 font-medium">Thuong</th>
                                  <th className="px-3 py-2 font-medium">Phat</th>
                                  <th className="px-3 py-2 font-medium">Ghi chu</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.details.length === 0 ? (
                                  <tr>
                                    <td className="px-3 py-3 text-slate-500" colSpan={6}>
                                      Khong co chi tiet luong ngay.
                                    </td>
                                  </tr>
                                ) : (
                                  row.details.map((detail) => (
                                    <tr
                                      key={`${row.workerId}-${detail.date}-${detail.status}`}
                                      className="border-b border-slate-100 last:border-0"
                                    >
                                      <td className="px-3 py-2">{format(new Date(detail.date), 'dd/MM/yyyy')}</td>
                                      <td className="px-3 py-2">{statusLabel(detail.status)}</td>
                                      <td className="px-3 py-2">{formatMoney(detail.dailySalary)}</td>
                                      <td className="px-3 py-2 text-emerald-700">{formatMoney(detail.bonus)}</td>
                                      <td className="px-3 py-2 text-red-600">{formatMoney(detail.penalty)}</td>
                                      <td className="px-3 py-2 text-slate-600">{detail.note || '-'}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-800">
                <td className="px-4 py-3" colSpan={2}>
                  Tong cong
                </td>
                <td className="px-4 py-3">{formatMoney(totals.baseSalary)}</td>
                <td className="px-4 py-3 text-emerald-700">{formatMoney(totals.bonus)}</td>
                <td className="px-4 py-3 text-red-600">{formatMoney(totals.penalty)}</td>
                <td className="px-4 py-3 text-[#1B5E20]">{formatMoney(totals.totalSalary)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <SalaryDetailModal open={detailOpen} row={detailRow} onOpenChange={setDetailOpen} />
    </section>
  );
}
