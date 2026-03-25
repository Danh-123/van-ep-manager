'use client';

import { format } from 'date-fns';
import { History, ReceiptText } from 'lucide-react';

import { vi } from '@/lib/translations/vi';

type DebtTicket = {
  id: number;
  customer: string;
  ngay: string;
  xeSo: string;
  thanhTien: number;
  daTra: number;
  conNo: number;
  createdAt: string;
  lastPaymentDate: string | null;
  status: 'DaThanhToan' | 'ThanhToanMotPhan' | 'ChuaThanhToan' | 'QuaHan';
  overdue: boolean;
};

type CustomerDetailProps = {
  tickets: DebtTicket[];
  onPayment: (ticket: DebtTicket) => void;
  onHistory: (ticket: DebtTicket) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function badgeClass(status: DebtTicket['status']) {
  if (status === 'DaThanhToan') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'ThanhToanMotPhan') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'QuaHan') return 'border-red-700 bg-red-700 text-white';
  return 'border-red-200 bg-red-50 text-red-700';
}

function badgeText(status: DebtTicket['status']) {
  if (status === 'DaThanhToan') return 'Đã thanh toán đủ';
  if (status === 'ThanhToanMotPhan') return 'Thanh toán một phần';
  if (status === 'QuaHan') return 'Quá hạn > 30 ngày';
  return 'Chưa thanh toán';
}

export default function CustomerDetail({ tickets, onPayment, onHistory }: CustomerDetailProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <th className="px-3 py-2 font-medium">Ngay</th>
            <th className="px-3 py-2 font-medium">Xe số</th>
            <th className="px-3 py-2 font-medium">Thành tiền</th>
            <th className="px-3 py-2 font-medium">Đã trả</th>
            <th className="px-3 py-2 font-medium">Còn nợ</th>
            <th className="px-3 py-2 font-medium">Ngày tạo phiếu</th>
            <th className="px-3 py-2 font-medium">Ngày thanh toán gần nhất</th>
            <th className="px-3 py-2 font-medium">{vi.common.status}</th>
            <th className="px-3 py-2 text-right font-medium">{vi.common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-4 text-slate-500">
                Không có phiếu nào.
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{format(new Date(ticket.ngay), 'dd/MM/yyyy')}</td>
                <td className="px-3 py-2">{ticket.xeSo}</td>
                <td className="px-3 py-2">{formatMoney(ticket.thanhTien)}</td>
                <td className="px-3 py-2">{formatMoney(ticket.daTra)}</td>
                <td className="px-3 py-2 font-semibold text-red-600">{formatMoney(ticket.conNo)}</td>
                <td className="px-3 py-2 text-slate-600">{format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</td>
                <td className="px-3 py-2 text-slate-600">
                  {ticket.lastPaymentDate ? format(new Date(ticket.lastPaymentDate), 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass(ticket.status)}`}>
                    {badgeText(ticket.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPayment(ticket)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-[11px] text-[#1B5E20] hover:bg-emerald-50"
                    >
                      <ReceiptText className="h-3 w-3" />
                      Thanh toán
                    </button>
                    <button
                      type="button"
                      onClick={() => onHistory(ticket)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      <History className="h-3 w-3" />
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
