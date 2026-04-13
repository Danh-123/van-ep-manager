'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useRecalculateDebt } from '@/hooks/useRecalculateDebt';
import type { DebtCalculatedRow } from '@/lib/trucks/debtCalculator';

type EditTicketValues = {
  ngay: string;
  soTan: string;
  donGia: string;
  congNoDau: string;
  thanhToan: string;
  khachHang: string;
  ghiChu: string;
};

type EditTicketModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: DebtCalculatedRow | null;
  onSaved: (message: string) => Promise<void> | void;
};

const defaultForm: EditTicketValues = {
  ngay: '',
  soTan: '',
  donGia: '',
  congNoDau: '',
  thanhToan: '',
  khachHang: '',
  ghiChu: '',
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function EditTicketModal({ open, onOpenChange, ticket, onSaved }: EditTicketModalProps) {
  const [form, setForm] = useState<EditTicketValues>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recalculate, isRecalculating } = useRecalculateDebt();

  useEffect(() => {
    if (!ticket) {
      setForm(defaultForm);
      return;
    }

    setForm({
      ngay: ticket.ngay,
      soTan: String(ticket.soTan),
      donGia: String(ticket.donGia),
      congNoDau: String(ticket.congNoDau ?? 0),
      thanhToan: String(ticket.thanhToan),
      khachHang: ticket.khachHang,
      ghiChu: ticket.ghiChu,
    });
  }, [ticket]);

  const previewAmount = useMemo(() => {
    const soTan = Number(form.soTan || 0);
    const donGia = Number(form.donGia || 0);
    return Math.max(0, soTan * donGia);
  }, [form.donGia, form.soTan]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket) return;

    const dateChanged = form.ngay !== ticket.ngay;
    if (dateChanged) {
      const accepted = window.confirm(
        'Thay đổi ngày sẽ ảnh hưởng đến thứ tự và công nợ các phiếu sau. Bạn có chắc không?',
      );
      if (!accepted) {
        setForm((prev) => ({ ...prev, ngay: ticket.ngay }));
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trucks/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngay: form.ngay,
          soTan: Number(form.soTan),
          donGia: Number(form.donGia),
            congNoDau: Number(form.congNoDau || 0),
          thanhToan: Number(form.thanhToan || 0),
          khachHang: form.khachHang,
          ghiChu: form.ghiChu,
        }),
      });

      const json = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Không thể cập nhật phiếu cân');
      }

      if (dateChanged) {
        await recalculate();
      }

      await onSaved(dateChanged ? 'Đã cập nhật ngày và tính lại toàn bộ công nợ.' : 'Đã cập nhật phiếu cân thành công.');
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Sửa phiếu cân</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ngay">Ngày</label>
                <input
                  id="ngay"
                  type="date"
                  value={form.ngay}
                  onChange={(event) => setForm((prev) => ({ ...prev, ngay: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="soTan">Số tấn</label>
                <input
                  id="soTan"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.soTan}
                  onChange={(event) => setForm((prev) => ({ ...prev, soTan: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="donGia">Đơn giá</label>
                <input
                  id="donGia"
                  type="number"
                  min="0"
                  step="any"
                  value={form.donGia}
                  onChange={(event) => setForm((prev) => ({ ...prev, donGia: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="congNoDau">Công nợ đầu</label>
                <input
                  id="congNoDau"
                  type="number"
                  min="0"
                  step="any"
                  value={form.congNoDau}
                  onChange={(event) => setForm((prev) => ({ ...prev, congNoDau: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="thanhToan">Thanh toán</label>
                <input
                  id="thanhToan"
                  type="number"
                  min="0"
                  step="any"
                  value={form.thanhToan}
                  onChange={(event) => setForm((prev) => ({ ...prev, thanhToan: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="khachHang">Khách hàng</label>
                <input
                  id="khachHang"
                  type="text"
                  value={form.khachHang}
                  onChange={(event) => setForm((prev) => ({ ...prev, khachHang: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ghiChu">Ghi chú</label>
                <textarea
                  id="ghiChu"
                  rows={3}
                  value={form.ghiChu}
                  onChange={(event) => setForm((prev) => ({ ...prev, ghiChu: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Thành tiền dự kiến: <span className="font-semibold">{formatCurrency(previewAmount)}</span>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || isRecalculating}
                className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
              >
                {submitting || isRecalculating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
