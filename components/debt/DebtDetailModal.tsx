'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { X } from 'lucide-react';

type DebtTicket = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  customer: string;
  ngay: string;
  xeSo: string;
  soTan: number;
  thanhTien: number;
  daTra: number;
  conNo: number;
};

type CustomerDebtGroup = {
  customer: string;
  totalDebt: number;
  tickets: DebtTicket[];
};

type DebtDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CustomerDebtGroup | null;
  onPayment: (ticket: DebtTicket) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DebtDetailModal({ open, onOpenChange, group, onPayment }: DebtDetailModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">Chi tiết công nợ</Dialog.Title>
              <p className="mt-1 text-sm text-slate-600">
                Khách hàng: <span className="font-medium text-slate-800">{group?.customer ?? '-'}</span>
              </p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2">Ngày</th>
                  <th className="px-3 py-2">Biển số</th>
                  <th className="px-3 py-2">Số tấn</th>
                  <th className="px-3 py-2">Thành tiền</th>
                  <th className="px-3 py-2">Đã thanh toán</th>
                  <th className="px-3 py-2">Còn nợ</th>
                  <th className="px-3 py-2 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(group?.tickets ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      Không có phiếu công nợ.
                    </td>
                  </tr>
                ) : (
                  (group?.tickets ?? []).map((ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{format(new Date(ticket.ngay), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2 text-slate-700">{ticket.xeSo}</td>
                      <td className="px-3 py-2 text-slate-700">{ticket.soTan.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2 text-emerald-700">{formatMoney(ticket.thanhTien)}</td>
                      <td className="px-3 py-2 text-blue-700">{formatMoney(ticket.daTra)}</td>
                      <td className="px-3 py-2 font-semibold text-red-600">{formatMoney(ticket.conNo)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onPayment(ticket)}
                          className="rounded-lg border border-[#0B7285] px-3 py-1.5 text-xs font-medium text-[#0B7285] hover:bg-[#0B7285]/10"
                        >
                          Thanh toán
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
