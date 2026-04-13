'use client';

import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import { formatNumber } from '@/lib/utils/format';

export type SaleCustomerOption = {
  id: number;
  code: string;
  name: string;
  phone?: string;
};

export type SaleFormValues = {
  khachHangId: string;
  soBo: string;
  soTo: string;
  doRong: string;
  doDay: string;
  doDai: string;
  donGia: string;
  congNoDau: string;
  thanhToan: string;
  ghiChu: string;
};

type SaleFormProps = {
  form: SaleFormValues;
  customers: SaleCustomerOption[];
  loadingCustomers?: boolean;
  customerError?: string | null;
  submitting?: boolean;
  exporting?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: (next: SaleFormValues) => void;
  onExport: () => void;
};

type LastSaleResponse = {
  success: boolean;
  error?: string;
  data?: {
    customerId: number;
    customerName: string;
    con_lai: number;
    isFirstTicket: boolean;
  };
};

function toNumber(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SaleForm({
  form,
  customers,
  loadingCustomers = false,
  customerError = null,
  submitting = false,
  exporting = false,
  onSubmit,
  onChange,
  onExport,
}: SaleFormProps) {
  const [previousRemain, setPreviousRemain] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [isFirstTicket, setIsFirstTicket] = useState(true);
  const [loadingLastSale, setLoadingLastSale] = useState(false);
  const [lastSaleError, setLastSaleError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(form.khachHangId);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setPreviousRemain(0);
      setCustomerName('');
      setIsFirstTicket(true);
      setLastSaleError(null);
      return;
    }

    let active = true;

    const loadLastSale = async () => {
      setLoadingLastSale(true);
      setLastSaleError(null);

      try {
        const response = await fetch(`/api/sales?mode=last&customerId=${parsed}`, { cache: 'no-store' });
        const json = (await response.json()) as LastSaleResponse;

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Không thể tải công nợ phiếu trước');
        }

        if (!active) return;

        setPreviousRemain(json.data.con_lai || 0);
        setCustomerName(json.data.customerName || '');
        setIsFirstTicket(Boolean(json.data.isFirstTicket));
      } catch (error) {
        if (!active) return;
        setPreviousRemain(0);
        setCustomerName('');
        setIsFirstTicket(true);
        setLastSaleError(error instanceof Error ? error.message : 'Không thể tải công nợ phiếu trước');
      } finally {
        if (active) {
          setLoadingLastSale(false);
        }
      }
    };

    void loadLastSale();

    return () => {
      active = false;
    };
  }, [form.khachHangId]);

  const soBo = toNumber(form.soBo);
  const soTo = toNumber(form.soTo);
  const doRong = toNumber(form.doRong);
  const doDay = toNumber(form.doDay);
  const doDai = toNumber(form.doDai);
  const donGia = toNumber(form.donGia);
  const congNoDau = Math.max(0, toNumber(form.congNoDau));
  const thanhToan = Math.max(0, toNumber(form.thanhToan));

  const soKhoi = useMemo(() => (soBo * soTo * doRong * doDay * doDai) / 1000000, [soBo, soTo, doRong, doDay, doDai]);
  const thanhTien = useMemo(() => Math.max(0, soKhoi * donGia), [donGia, soKhoi]);
  const congNo = useMemo(() => Math.max(0, congNoDau + thanhTien + previousRemain), [congNoDau, previousRemain, thanhTien]);
  const conLai = useMemo(() => Math.max(0, congNo - thanhToan), [congNo, thanhToan]);

  const selectedCustomer = customers.find((item) => String(item.id) === form.khachHangId);
  const displayCustomerName = customerName || selectedCustomer?.name || 'khách hàng này';

  const formulaText = isFirstTicket
    ? `📐 Công thức: Công nợ = ${formatNumber(congNoDau, 0)} + ${formatNumber(thanhTien, 0)} = ${formatNumber(congNo, 0)} (khách hàng ${displayCustomerName})`
    : `📐 Công thức: Công nợ = ${formatNumber(congNoDau, 0)} + ${formatNumber(thanhTien, 0)} + ${formatNumber(previousRemain, 0)} = ${formatNumber(congNo, 0)}`;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Thêm phiếu bán hàng mới</h2>
          <p className="mt-1 text-sm text-slate-600">Ngày tạo tự động là hôm nay: {format(new Date(), 'dd/MM/yyyy')}</p>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
        >
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <select
          value={form.khachHangId}
          onChange={(event) => onChange({ ...form, khachHangId: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
          disabled={loadingCustomers}
        >
          <option value="">{loadingCustomers ? 'Đang tải khách hàng...' : 'Chọn khách hàng bán'}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={String(customer.id)}>
              {customer.code} - {customer.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Số bó"
          value={form.soBo}
          onChange={(event) => onChange({ ...form, soBo: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Số tờ"
          value={form.soTo}
          onChange={(event) => onChange({ ...form, soTo: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Độ rộng (cm)"
          value={form.doRong}
          onChange={(event) => onChange({ ...form, doRong: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Độ dày (mm)"
          value={form.doDay}
          onChange={(event) => onChange({ ...form, doDay: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Độ dài (m)"
          value={form.doDai}
          onChange={(event) => onChange({ ...form, doDai: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Đơn giá"
          value={form.donGia}
          onChange={(event) => onChange({ ...form, donGia: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Công nợ ban đầu"
          value={form.congNoDau}
          onChange={(event) => onChange({ ...form, congNoDau: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
        />

        <input
          type="number"
          step="any"
          min="0"
          placeholder="Thanh toán"
          value={form.thanhToan}
          onChange={(event) => onChange({ ...form, thanhToan: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
        />

        <input
          type="text"
          placeholder="Ghi chú"
          value={form.ghiChu}
          onChange={(event) => onChange({ ...form, ghiChu: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <div>
          <p className="text-slate-500">Số khối</p>
          <p className="mt-1 font-semibold text-blue-700">{formatNumber(soKhoi, 6)}</p>
        </div>
        <div>
          <p className="text-slate-500">Thành tiền</p>
          <p className="mt-1 font-semibold text-blue-700">{formatMoney(thanhTien)}</p>
        </div>
        <div>
          <p className="text-slate-500">Còn lại phiếu trước</p>
          <p className="mt-1 font-semibold text-slate-800">{formatMoney(previousRemain)}</p>
        </div>
        <div>
          <p className="text-slate-500">Công nợ</p>
          <p className="mt-1 font-semibold text-amber-700">{formatMoney(congNo)}</p>
        </div>
        <div>
          <p className="text-slate-500">Còn lại</p>
          <p className={`mt-1 font-semibold ${conLai > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(conLai)}</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{formulaText}</p>

      {(customerError || lastSaleError) && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {customerError || lastSaleError}
        </p>
      )}
      {loadingLastSale && form.khachHangId && <p className="mt-2 text-xs text-slate-500">Đang tải công nợ phiếu trước...</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
        >
          {submitting ? 'Đang lưu...' : 'Thêm phiếu'}
        </button>
        <span className="text-sm text-slate-600">Chỉ dùng khách hàng loại Bán.</span>
      </div>
    </form>
  );
}