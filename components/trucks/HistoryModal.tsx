'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { Loader2, X } from 'lucide-react';

import { type TicketPaymentHistory } from '@/app/(dashboard)/trucks/actions';

type HistoryTicket = {
  khachHang: string;
};

type HistoryModalProps = {
  open: boolean;
  ticket: HistoryTicket | null;
  loading: boolean;
  rows: TicketPaymentHistory[];
  error: string | null;
  onOpenChange: (open: boolean) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HistoryModal({ open, ticket, loading, rows, error, onOpenChange }: HistoryModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Lich su thanh toan {ticket ? `- ${ticket.khachHang}` : ''}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 font-medium">Ngay</th>
                  <th className="px-3 py-2 font-medium">So tien</th>
                  <th className="px-3 py-2 font-medium">Nguoi thu</th>
                  <th className="px-3 py-2 font-medium">Ghi chu</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai lich su...
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      Chua co lich su thanh toan.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">{format(new Date(row.ngayThanhToan), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{formatMoney(row.soTien)}</td>
                      <td className="px-3 py-2">{row.nguoiThu}</td>
                      <td className="px-3 py-2 text-slate-600">{row.ghiChu || '-'}</td>
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
