'use client';

import * as Dialog from '@radix-ui/react-dialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Download, Loader2, X } from 'lucide-react';
import { useMemo, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';

type SalaryDetailModalProps = {
  open: boolean;
  workerId: number | null;
  workerName: string;
  month: string;
  onOpenChange: (open: boolean) => void;
};

type SalaryDetailResponse = {
  worker: {
    id: number;
    ho_ten: string;
    ma_cong_nhan: string;
  };
  month: string;
  total: number;
  details: Array<{
    ngay: string;
    trang_thai: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
    luong_ngay: number;
    thuong: number;
    phat: number;
    ghi_chu: string;
  }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem') {
  if (status === 'CoMat') return 'Có mặt';
  if (status === 'Nghi') return 'Nghỉ';
  if (status === 'NghiPhep') return 'Nghỉ phép';
  return 'Làm thêm';
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-');
  if (!year || !mon) return month;
  return `${mon}/${year}`;
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

export default function SalaryDetailModal({ open, workerId, workerName, month, onOpenChange }: SalaryDetailModalProps) {
  const [isExporting, startExport] = useTransition();

  const detailQuery = useQuery({
    queryKey: ['salary-detail', workerId, month],
    enabled: open && !!workerId && !!month,
    queryFn: async () => {
      const response = await fetch(`/api/salary/detail?workerId=${workerId}&month=${month}`, {
        cache: 'no-store',
      });

      const payload = (await response.json()) as SalaryDetailResponse | { error: string };
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Không thể tải chi tiết lương');
      }

      return payload;
    },
    staleTime: 60_000,
  });

  const titleName = useMemo(() => detailQuery.data?.worker.ho_ten || workerName || '', [detailQuery.data, workerName]);
  const titleMonth = useMemo(() => monthLabel(detailQuery.data?.month || month), [detailQuery.data, month]);

  const handleExport = () => {
    if (!detailQuery.data) return;

    startExport(() => {
      void (async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('ChiTietLuongNgay');

        sheet.columns = [
          { header: 'Ngày', key: 'ngay', width: 14 },
          { header: 'Trạng thái', key: 'trang_thai', width: 14 },
          { header: 'Lương ngày', key: 'luong_ngay', width: 18 },
          { header: 'Thưởng', key: 'thuong', width: 14 },
          { header: 'Phạt', key: 'phat', width: 14 },
          { header: 'Ghi chú', key: 'ghi_chu', width: 32 },
        ];

        sheet.getRow(1).font = { bold: true };

        detailQuery.data.details.forEach((item) => {
          sheet.addRow({
            ngay: format(new Date(item.ngay), 'dd/MM/yyyy'),
            trang_thai: statusLabel(item.trang_thai),
            luong_ngay: Math.round(item.luong_ngay),
            thuong: Math.round(item.thuong),
            phat: Math.round(item.phat),
            ghi_chu: item.ghi_chu || '',
          });
        });

        const totalRow = sheet.addRow({
          ngay: 'Tổng cộng',
          trang_thai: '',
          luong_ngay: '',
          thuong: '',
          phat: '',
          ghi_chu: formatMoney(detailQuery.data.total),
        });
        totalRow.font = { bold: true };

        [3, 4, 5].forEach((col) => {
          sheet.getColumn(col).numFmt = '#,##0 [$₫-vi-VN]';
        });

        const fileName = `Chi_tiet_luong_${normalizeFileName(detailQuery.data.worker.ho_ten)}_${normalizeFileName(detailQuery.data.month)}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, fileName);
      })();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Chi tiết lương: {titleName} - Tháng {titleMonth}
            </Dialog.Title>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || !detailQuery.data}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Xuất Excel
              </button>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-14 animate-pulse rounded bg-slate-100" />
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : detailQuery.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(detailQuery.error as Error).message}
            </p>
          ) : !detailQuery.data ? (
            <p className="text-sm text-slate-500">Không có dữ liệu.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Mã NV</p>
                  <p className="mt-1 font-semibold text-slate-900">{detailQuery.data.worker.ma_cong_nhan || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Họ tên</p>
                  <p className="mt-1 font-semibold text-slate-900">{detailQuery.data.worker.ho_ten}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Tổng lương</p>
                  <p className="mt-1 font-semibold text-[#1B5E20]">{formatMoney(detailQuery.data.total)}</p>
                </div>
              </div>

              <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 font-medium">Ngày</th>
                      <th className="px-3 py-2 font-medium">Trạng thái</th>
                      <th className="px-3 py-2 font-medium">Lương ngày</th>
                      <th className="px-3 py-2 font-medium">Thưởng</th>
                      <th className="px-3 py-2 font-medium">Phạt</th>
                      <th className="px-3 py-2 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQuery.data.details.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 text-slate-500">
                          Không có dữ liệu chi tiết trong tháng này.
                        </td>
                      </tr>
                    ) : (
                      detailQuery.data.details.map((detail) => (
                        <tr key={`${detail.ngay}-${detail.trang_thai}`} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">{format(new Date(detail.ngay), 'dd/MM/yyyy')}</td>
                          <td className="px-3 py-2">{statusLabel(detail.trang_thai)}</td>
                          <td className="px-3 py-2">{formatMoney(detail.luong_ngay)}</td>
                          <td className="px-3 py-2 text-emerald-700">{formatMoney(detail.thuong)}</td>
                          <td className="px-3 py-2 text-red-600">{formatMoney(detail.phat)}</td>
                          <td className="px-3 py-2 text-slate-600">{detail.ghi_chu || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
