'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { X } from 'lucide-react';

import { type MonthlySalaryRow } from '@/lib/salary/calculator';

type SalaryDetailModalProps = {
  open: boolean;
  row: MonthlySalaryRow | null;
  onOpenChange: (open: boolean) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem') {
  if (status === 'CoMat') return 'Co mat';
  if (status === 'Nghi') return 'Nghi';
  if (status === 'NghiPhep') return 'Nghi phep';
  return 'Lam them';
}

export default function SalaryDetailModal({ open, row, onOpenChange }: SalaryDetailModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Chi tiet luong - {row?.workerName ?? ''}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {!row ? (
            <p className="text-sm text-slate-500">Khong co du lieu.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Luong co ban</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatMoney(row.baseSalary)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Thuong</p>
                  <p className="mt-1 font-semibold text-emerald-700">{formatMoney(row.bonus)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Phat</p>
                  <p className="mt-1 font-semibold text-red-600">{formatMoney(row.penalty)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Tong luong</p>
                  <p className="mt-1 font-semibold text-[#1B5E20]">{formatMoney(row.totalSalary)}</p>
                </div>
              </div>

              <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 font-medium">Ngay</th>
                      <th className="px-3 py-2 font-medium">Trang thai</th>
                      <th className="px-3 py-2 font-medium">Luong ngay</th>
                      <th className="px-3 py-2 font-medium">Thuong</th>
                      <th className="px-3 py-2 font-medium">Phat</th>
                      <th className="px-3 py-2 font-medium">Ghi chu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.details.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 text-slate-500">
                          Khong co du lieu chi tiet trong thang nay.
                        </td>
                      </tr>
                    ) : (
                      row.details.map((detail) => (
                        <tr key={`${detail.date}-${detail.status}`} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">{format(new Date(detail.date), 'dd/MM/yyyy')}</td>
                          <td className="px-3 py-2">{statusLabel(detail.status)}</td>
                          <td className="px-3 py-2">{formatMoney(detail.dailySalary)}</td>
                          <td className="px-3 py-2 text-emerald-700">{formatMoney(detail.bonus)}</td>
                          <td className="px-3 py-2 text-red-600">{formatMoney(detail.penalty)}</td>
                          <td className="px-3 py-2 text-slate-600">{detail.note || '-'}</td>
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
