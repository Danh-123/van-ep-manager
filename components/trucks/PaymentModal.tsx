'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { updatePayment } from '@/app/(dashboard)/trucks/actions';
import { useMounted } from '@/hooks/useMounted';

type PaymentTicket = {
  id: number;
  khachHang: string;
  thanhTien: number;
  conNo: number;
};

type PaymentModalProps = {
  open: boolean;
  ticket: PaymentTicket | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PaymentModal({ open, ticket, onOpenChange, onSuccess }: PaymentModalProps) {
  const mounted = useMounted();
  const [soTien, setSoTien] = useState('0');
  const [ngayThanhToan, setNgayThanhToan] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!mounted) return;
    setNgayThanhToan(format(new Date(), 'yyyy-MM-dd'));
  }, [mounted]);

  useEffect(() => {
    if (!ticket) return;
    setSoTien(String(ticket.conNo));
    if (mounted) {
      setNgayThanhToan(format(new Date(), 'yyyy-MM-dd'));
    }
    setGhiChu('');
    setError(null);
  }, [ticket, mounted]);

  if (!mounted) {
    return null;
  }

  const handleSubmit = () => {
    if (!ticket) return;

    setError(null);

    startTransition(async () => {
      const amount = Number(soTien);
      const result = await updatePayment({
        ticketId: ticket.id,
        soTien: amount,
        ngayThanhToan,
        ghiChu,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Thanh toan phieu can</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {!ticket ? (
            <p className="text-sm text-slate-500">Khong co du lieu phieu can.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-slate-600">Khach hang: <span className="font-medium text-slate-900">{ticket.khachHang}</span></p>
                <p className="mt-1 text-slate-600">Thanh tien: <span className="font-medium text-slate-900">{formatMoney(ticket.thanhTien)}</span></p>
                <p className="mt-1 text-slate-600">No hien tai: <span className="font-semibold text-red-600">{formatMoney(ticket.conNo)}</span></p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="soTienThanhToan">So tien thanh toan</label>
                <input
                  id="soTienThanhToan"
                  type="number"
                  min={0}
                  max={Math.max(0, ticket.conNo)}
                  value={soTien}
                  onChange={(event) => setSoTien(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ngayThanhToan">Ngay thanh toan</label>
                <input
                  id="ngayThanhToan"
                  type="date"
                  value={ngayThanhToan}
                  onChange={(event) => setNgayThanhToan(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ghiChuThanhToan">Ghi chu</label>
                <textarea
                  id="ghiChuThanhToan"
                  rows={3}
                  value={ghiChu}
                  onChange={(event) => setGhiChu(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Huy
                  </button>
                </Dialog.Close>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-70"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xac nhan
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
