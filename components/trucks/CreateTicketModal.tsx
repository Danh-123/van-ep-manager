'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format } from 'date-fns';
import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createTicket, type TicketOption, type WoodTypeOption } from '@/app/(dashboard)/trucks/actions';
import { useMounted } from '@/hooks/useMounted';

const createSchema = z.object({
  ngayCan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  xeHangId: z.string().optional(),
  xeSoText: z.string().optional(),
  loaiVanEpId: z.string().min(1, 'Vui lòng chọn loại ván ép'),
  khoiLuongKg: z.number().positive('Trọng lượng phải lớn hơn 0'),
  donGia: z.number().positive('Đơn giá phải lớn hơn 0'),
  khachHang: z.string().trim().min(2, 'Khách hàng bắt buộc').max(120),
  ghiChu: z.string().max(1000).optional(),
  thanhToanNgay: z.boolean(),
  soTienThanhToan: z.number().min(0),
});

type CreateValues = z.infer<typeof createSchema>;

type CreateTicketModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: TicketOption[];
  woodTypes: WoodTypeOption[];
  onCreated: () => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CreateTicketModal({
  open,
  onOpenChange,
  trucks,
  woodTypes,
  onCreated,
}: CreateTicketModalProps) {
  const mounted = useMounted();
  const [error, setError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState('');
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      ngayCan: '',
      xeHangId: '',
      xeSoText: '',
      loaiVanEpId: '',
      khoiLuongKg: 0,
      donGia: 0,
      khachHang: '',
      ghiChu: '',
      thanhToanNgay: false,
      soTienThanhToan: 0,
    },
  });

  const selectedWoodTypeId = watch('loaiVanEpId');
  const khoiLuongKg = watch('khoiLuongKg');
  const donGia = watch('donGia');
  const thanhToanNgay = watch('thanhToanNgay');

  const thanhTien = useMemo(() => Math.max(0, Number(khoiLuongKg || 0) * Number(donGia || 0)), [khoiLuongKg, donGia]);

  useEffect(() => {
    if (!mounted) return;
    setTodayKey(format(new Date(), 'yyyy-MM-dd'));
  }, [mounted]);

  useEffect(() => {
    if (!todayKey) return;
    setValue('ngayCan', todayKey, { shouldValidate: false });
  }, [todayKey, setValue]);

  const backdateMin = todayKey ? format(addDays(new Date(todayKey), -365), 'yyyy-MM-dd') : '';
  const backdateMax = todayKey;

  const onWoodTypeChange = (value: string) => {
    setValue('loaiVanEpId', value, { shouldValidate: true });
    const selected = woodTypes.find((item) => String(item.id) === value);
    if (selected) {
      setValue('donGia', selected.donGia, { shouldValidate: true });
    }
  };

  const onSubmit = (values: CreateValues) => {
    setError(null);

    startTransition(async () => {
      const result = await createTicket({
        ngayCan: values.ngayCan,
        xeHangId: values.xeHangId ? Number(values.xeHangId) : undefined,
        xeSoText: values.xeSoText,
        loaiVanEpId: Number(values.loaiVanEpId),
        khoiLuongKg: values.khoiLuongKg,
        donGia: values.donGia,
        khachHang: values.khachHang,
        ghiChu: values.ghiChu,
        thanhToanNgay: values.thanhToanNgay,
        soTienThanhToan: values.soTienThanhToan,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      reset();
      onCreated();
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Tạo phiếu cân mới</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ngayCan">Ngày</label>
                <input
                  id="ngayCan"
                  type="date"
                  min={backdateMin}
                  max={backdateMax}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('ngayCan')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="xeHangId">Xe số</label>
                <select
                  id="xeHangId"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('xeHangId')}
                >
                  <option value="">-- Chọn xe có sẵn --</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={String(truck.id)}>
                      {truck.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Hoặc nhập biển số mới"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('xeSoText')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="loaiVanEpId">Loại ván ép</label>
                <select
                  id="loaiVanEpId"
                  value={selectedWoodTypeId || ''}
                  onChange={(event) => onWoodTypeChange(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                >
                  <option value="">-- Chọn loại ván --</option>
                  {woodTypes.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.label} ({item.donVi})
                    </option>
                  ))}
                </select>
                {errors.loaiVanEpId && <p className="mt-1 text-xs text-red-600">{errors.loaiVanEpId.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="khoiLuongKg">Trọng lượng (kg)</label>
                <input
                  id="khoiLuongKg"
                  type="number"
                  min={0}
                  step="0.1"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('khoiLuongKg', { valueAsNumber: true })}
                />
                {errors.khoiLuongKg && <p className="mt-1 text-xs text-red-600">{errors.khoiLuongKg.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="donGia">Đơn giá</label>
                <input
                  id="donGia"
                  type="number"
                  min={0}
                  step="100"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('donGia', { valueAsNumber: true })}
                />
                {errors.donGia && <p className="mt-1 text-xs text-red-600">{errors.donGia.message}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="khachHang">Khách hàng</label>
                <input
                  id="khachHang"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('khachHang')}
                />
                {errors.khachHang && <p className="mt-1 text-xs text-red-600">{errors.khachHang.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ghiChu">Ghi chú</label>
                <textarea
                  id="ghiChu"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  {...register('ghiChu')}
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Thành tiền dự kiến: <span className="font-semibold">{formatMoney(thanhTien)}</span>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4" {...register('thanhToanNgay')} />
                Thanh toán ngay
              </label>
              {thanhToanNgay && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="soTienThanhToan">Số tiền thanh toán</label>
                  <input
                    id="soTienThanhToan"
                    type="number"
                    min={0}
                    max={Math.max(0, thanhTien)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                    {...register('soTienThanhToan', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-70"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo phiếu
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
