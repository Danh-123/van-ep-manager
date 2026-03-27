'use client';

import { format } from 'date-fns';
import { History, ReceiptText } from 'lucide-react';
import { memo } from 'react';

import { type TicketRow } from '@/app/(dashboard)/trucks/actions';
import { vi } from '@/lib/translations/vi';

type TicketTableProps = {
  rows: TicketRow[];
  loading?: boolean;
  onPayment: (row: TicketRow) => void;
  onHistory: (row: TicketRow) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: TicketRow['paymentStatus']) {
  if (status === 'DaThanhToan') return 'Đã thanh toán';
  if (status === 'ThanhToanMotPhan') return 'Thanh toán một phần';
  return 'Chưa thanh toán';
}

function statusClass(status: TicketRow['paymentStatus']) {
  if (status === 'DaThanhToan') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'ThanhToanMotPhan') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

function TicketTableComponent({ rows, loading, onPayment, onHistory }: TicketTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1300px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="w-[9%] px-4 py-3 font-medium">Ngày</th>
              <th className="w-[8%] px-4 py-3 font-medium">Xe số</th>
              <th className="w-[15%] px-4 py-3 font-medium">Khách hàng</th>
              <th className="w-[12%] px-4 py-3 font-medium">Loại ván</th>
              <th className="w-[11%] px-4 py-3 text-right font-medium">Trọng lượng (kg)</th>
              <th className="w-[9%] px-4 py-3 text-right font-medium">Đơn giá</th>
              <th className="w-[10%] px-4 py-3 text-right font-medium">Thành tiền</th>
              <th className="w-[8%] px-4 py-3 text-right font-medium">Đã trả</th>
              <th className="w-[8%] px-4 py-3 text-right font-medium">Còn nợ</th>
              <th className="w-[6%] px-4 py-3 text-center font-medium">{vi.common.status}</th>
              <th className="w-[14%] px-4 py-3 text-right font-medium">{vi.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="px-4 py-3" colSpan={11}>
                    <div className="h-6 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                  Chưa có phiếu cân nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{format(new Date(row.ngay), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.xeSo}</td>
                  <td className="px-4 py-3 text-slate-700">{row.khachHang}</td>
                  <td className="px-4 py-3 text-slate-700">{row.loaiVan}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.trongLuongKg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatMoney(row.donGia)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatMoney(row.thanhTien)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatMoney(row.daTra)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{formatMoney(row.conNo)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(row.paymentStatus)}`}>
                      {statusLabel(row.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onPayment(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs text-[#1B5E20] hover:bg-emerald-50"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        Thanh toán
                      </button>
                      <button
                        type="button"
                        onClick={() => onHistory(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <History className="h-3.5 w-3.5" />
                        Xem lịch sử
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TicketTable = memo(TicketTableComponent);

export default TicketTable;
