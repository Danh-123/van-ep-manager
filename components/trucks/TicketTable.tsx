'use client';

import { format } from 'date-fns';
import { History, ReceiptText } from 'lucide-react';

import { type TicketRow } from '@/app/(dashboard)/trucks/actions';

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
  if (status === 'DaThanhToan') return 'Da thanh toan';
  if (status === 'ThanhToanMotPhan') return 'Thanh toan mot phan';
  return 'Chua thanh toan';
}

function statusClass(status: TicketRow['paymentStatus']) {
  if (status === 'DaThanhToan') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'ThanhToanMotPhan') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

export default function TicketTable({ rows, loading, onPayment, onHistory }: TicketTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1300px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">Ngay</th>
              <th className="px-4 py-3 font-medium">Xe so</th>
              <th className="px-4 py-3 font-medium">Khach hang</th>
              <th className="px-4 py-3 font-medium">Loai van</th>
              <th className="px-4 py-3 font-medium">Trong luong (kg)</th>
              <th className="px-4 py-3 font-medium">Don gia</th>
              <th className="px-4 py-3 font-medium">Thanh tien</th>
              <th className="px-4 py-3 font-medium">Da tra</th>
              <th className="px-4 py-3 font-medium">Con no</th>
              <th className="px-4 py-3 font-medium">Trang thai</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                  Chua co phieu can nao phu hop bo loc.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{format(new Date(row.ngay), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.xeSo}</td>
                  <td className="px-4 py-3 text-slate-700">{row.khachHang}</td>
                  <td className="px-4 py-3 text-slate-700">{row.loaiVan}</td>
                  <td className="px-4 py-3 text-slate-700">{row.trongLuongKg.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(row.donGia)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(row.thanhTien)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(row.daTra)}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatMoney(row.conNo)}</td>
                  <td className="px-4 py-3">
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
                        Thanh toan
                      </button>
                      <button
                        type="button"
                        onClick={() => onHistory(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <History className="h-3.5 w-3.5" />
                        Xem lich su
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
