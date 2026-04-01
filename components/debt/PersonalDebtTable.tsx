'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatNumber } from '@/lib/utils/format';

type DebtRow = {
  id: number;
  ngay: string;
  so_phieu: string;
  so_tan: number;
  don_gia: number;
  thanh_tien: number;
  thanh_toan: number;
  con_lai: number;
  ten_khach_hang: string;
};

type DebtApiPayload = {
  linked?: boolean;
  message?: string;
  customerName?: string;
  data?: DebtRow[];
  error?: string;
};

type PersonalDebtTableProps = {
  customerName: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function normalizeFileName(input: string) {
  return input
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function todayStamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function DebtSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 h-14 animate-pulse rounded bg-slate-100" />
      <div className="mb-4 h-16 animate-pulse rounded bg-slate-100" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-11 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

export default function PersonalDebtTable({ customerName }: PersonalDebtTableProps) {
  const [isExporting, startExport] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const debtQuery = useQuery({
    queryKey: ['my-debt'],
    queryFn: async () => {
      const response = await fetch('/api/my-debt', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as DebtApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Không thể tải dữ liệu công nợ cá nhân');
      }

      if (payload.linked === false) {
        throw new Error(payload.message ?? 'Tài khoản chưa được liên kết với khách hàng');
      }

      return payload;
    },
    staleTime: 60_000,
  });

  const rows = useMemo(() => debtQuery.data?.data ?? [], [debtQuery.data]);
  const debtRows = useMemo(() => rows.filter((row) => row.con_lai > 0), [rows]);

  const totalRemain = useMemo(() => debtRows.reduce((sum, row) => sum + row.con_lai, 0), [debtRows]);

  const displayName = debtQuery.data?.customerName || customerName;

  const handleExport = () => {
    setLocalError(null);

    if (debtRows.length === 0) {
      setLocalError('Không có danh sách công nợ để xuất Excel.');
      return;
    }

    startExport(() => {
      void (async () => {
        try {
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('CongNoCaNhan');

          sheet.mergeCells('A1:F1');
          const titleCell = sheet.getCell('A1');
          titleCell.value = `DANH SACH CONG NO - ${displayName}`;
          titleCell.font = { bold: true, size: 14, color: { argb: 'FF7F1D1D' } };
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

          sheet.columns = [
            { header: 'Ngay', key: 'ngay', width: 14 },
            { header: 'So phieu', key: 'so_phieu', width: 16 },
            { header: 'So tan', key: 'so_tan', width: 12 },
            { header: 'Thanh tien', key: 'thanh_tien', width: 16 },
            { header: 'Da thanh toan', key: 'thanh_toan', width: 18 },
            { header: 'Con no', key: 'con_lai', width: 16 },
          ];

          const headerRow = sheet.getRow(3);
          headerRow.values = ['Ngay', 'So phieu', 'So tan', 'Thanh tien', 'Da thanh toan', 'Con no'];
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
          headerRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFB91C1C' },
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });

          debtRows.forEach((row) => {
            const excelRow = sheet.addRow({
              ngay: formatDate(row.ngay),
              so_phieu: row.so_phieu,
              so_tan: row.so_tan,
              thanh_tien: Math.round(row.thanh_tien),
              thanh_toan: Math.round(row.thanh_toan),
              con_lai: Math.round(row.con_lai),
            });

            excelRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              };
            });
          });

          const totalRow = sheet.addRow({
            ngay: 'Tong cong',
            so_phieu: '',
            so_tan: '',
            thanh_tien: '',
            thanh_toan: '',
            con_lai: Math.round(totalRemain),
          });
          totalRow.font = { bold: true };
          totalRow.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          };

          [4, 5, 6].forEach((index) => {
            sheet.getColumn(index).numFmt = '#,##0 [$₫-vi-VN]';
          });

          const safeName = normalizeFileName(displayName || 'KhachHang');
          const fileName = `Cong_no_${safeName}_${todayStamp()}.xlsx`;

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          saveAs(blob, fileName);
        } catch {
          setLocalError('Không thể xuất Excel, vui lòng thử lại.');
        }
      })();
    });
  };

  if (debtQuery.isLoading || debtQuery.isFetching) {
    return <DebtSkeleton />;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Tên khách hàng: <span className="font-semibold text-slate-900">{displayName}</span>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Tổng nợ còn lại: <span className="font-semibold">{formatMoney(totalRemain)}</span>
        </div>
      </div>

      {(debtQuery.error || localError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError || (debtQuery.error as Error).message}
        </div>
      )}

      {debtRows.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center text-sm font-medium text-emerald-700">
          Chúc mừng! Bạn đã thanh toán hết công nợ.
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="w-[14%] px-3 py-2.5 font-medium">Ngày</th>
                  <th className="w-[16%] px-3 py-2.5 font-medium">Số phiếu</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-medium">Số tấn</th>
                  <th className="w-[19%] px-3 py-2.5 text-right font-medium">Thành tiền</th>
                  <th className="w-[19%] px-3 py-2.5 text-right font-medium">Đã thanh toán</th>
                  <th className="w-[20%] px-3 py-2.5 text-right font-medium">Còn nợ</th>
                </tr>
              </thead>
              <tbody>
                {debtRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 text-slate-700">{formatDate(row.ngay)}</td>
                    <td className="px-3 py-2.5 text-slate-800">{row.so_phieu}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatNumber(row.so_tan, 2)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(row.thanh_tien)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{formatMoney(row.thanh_toan)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-700">{formatMoney(row.con_lai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
