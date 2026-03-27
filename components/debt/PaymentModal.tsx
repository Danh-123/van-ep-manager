'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

type DebtTicket = {
  id: number;
  ngay_can: string;
  bien_so_xe: string;
  khoi_luong_tan: number;
  thanh_tien: number;
  so_tien_da_tra: number;
  cong_no: number;
  con_lai: number;
  ghi_chu: string;
};

type PaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: DebtTicket | null;
  onSuccess: (message: string) => Promise<void> | void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PaymentModal({ open, onOpenChange, ticket, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [collector, setCollector] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setCollector('');
      setPaidDate('');
      setError(null);
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPaidDate(`${yyyy}-${mm}-${dd}`);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket) return;

    setSubmitting(true);
    setError(null);

    try {
      const value = Number(amount || 0);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Vui lòng nhập số tiền thanh toán hợp lệ');
      }
      if (ticket && value > ticket.con_lai) {
        throw new Error('Số tiền thanh toán không được vượt quá số còn lại');
      }

      const response = await fetch('/api/debt/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phieu_can_id: ticket.id,
          so_tien: value,
          ngay_thanh_toan: paidDate,
          nguoi_thu: collector,
        }),
      });

      const json = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Không thể cập nhật thanh toán');
      }

      await onSuccess('Thanh toán thành công, công nợ đã được cập nhật.');
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể cập nhật thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Thanh toán công nợ</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-700">Biển số xe: <span className="font-medium">{ticket?.bien_so_xe ?? '-'}</span></p>
              <p className="text-slate-700">Ngày cân: <span className="font-medium">{ticket?.ngay_can ?? '-'}</span></p>
              <p className="text-slate-700">Còn nợ hiện tại: <span className="font-semibold text-red-600">{formatMoney(ticket?.con_lai ?? 0)}</span></p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="amount">Số tiền thanh toán</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="paid-date">Ngày thanh toán</label>
              <input
                id="paid-date"
                type="date"
                value={paidDate}
                onChange={(event) => setPaidDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="collector">Người thu</label>
              <input
                id="collector"
                type="text"
                value={collector}
                onChange={(event) => setCollector(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                placeholder="Nhập người thu (tùy chọn)"
              />
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
              >
                {submitting ? 'Đang lưu...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
