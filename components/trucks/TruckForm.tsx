'use client';

import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import { useLastDebt } from '@/hooks/useLastDebt';

type TicketForm = {
  soTan: string;
  donGia: string;
  congNoDau: string;
  thanhToan: string;
  khachHangId: string;
  ghiChu: string;
};

type CustomerOption = {
  id: number;
  code: string;
  name: string;
};

type TruckFormProps = {
  form: TicketForm;
  submitting?: boolean;
  exporting?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: (next: TicketForm) => void;
  onExport: () => void;
};

export default function TruckForm({
  form,
  submitting = false,
  exporting = false,
  onSubmit,
  onChange,
  onExport,
}: TruckFormProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const { previousRemain, customerName, isFirstTicket, loading: loadingLastDebt, error: lastDebtError } = useLastDebt(
    form.khachHangId,
  );

  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      setLoadingCustomers(true);
      setCustomerError(null);

      try {
        const response = await fetch('/api/customers?loaiKhachHang=mua', { cache: 'no-store' });
        const json = (await response.json()) as {
          success: boolean;
          error?: string;
          data?: CustomerOption[];
        };

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Không thể tải danh sách khách hàng');
        }

        if (!active) return;
        setCustomers(json.data);
      } catch (error) {
        if (!active) return;
        setCustomers([]);
        setCustomerError(error instanceof Error ? error.message : 'Không thể tải danh sách khách hàng');
      } finally {
        if (active) {
          setLoadingCustomers(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      active = false;
    };
  }, []);

  const thanhTien = useMemo(() => {
    const soTan = Number(form.soTan || 0);
    const donGia = Number(form.donGia || 0);
    return Math.max(0, soTan * donGia);
  }, [form.donGia, form.soTan]);

  const congNoDau = useMemo(() => Math.max(0, Number(form.congNoDau || 0)), [form.congNoDau]);
  const congNo = useMemo(() => Math.max(0, thanhTien + previousRemain + congNoDau), [congNoDau, thanhTien, previousRemain]);
  const conLai = useMemo(() => {
    const thanhToan = Math.max(0, Number(form.thanhToan || 0));
    return Math.max(0, congNo - thanhToan);
  }, [congNo, form.thanhToan]);

  const selectedCustomer = customers.find((item) => String(item.id) === form.khachHangId);
  const displayCustomerName = customerName || selectedCustomer?.name || 'khách hàng này';

  const formulaText = isFirstTicket
    ? `📐 Công thức: Công nợ = ${congNoDau.toLocaleString('vi-VN')} + ${thanhTien.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')} (khách hàng ${displayCustomerName})`
    : `📐 Công thức: Công nợ = ${congNoDau.toLocaleString('vi-VN')} + ${thanhTien.toLocaleString('vi-VN')} + ${previousRemain.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')}`;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Thêm phiếu mua hàng mới</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <select
          value={form.khachHangId}
          onChange={(event) => onChange({ ...form, khachHangId: event.target.value })}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          required
          disabled={loadingCustomers}
        >
          <option value="">{loadingCustomers ? 'Đang tải khách hàng...' : 'Chọn khách hàng mua'}</option>
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
          placeholder="Số tấn"
          value={form.soTan}
          onChange={(event) => onChange({ ...form, soTan: event.target.value })}
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
          placeholder="Công nợ đầu"
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
          <p className="text-slate-500">Thành tiền</p>
          <p className="mt-1 font-semibold text-blue-700">{thanhTien.toLocaleString('vi-VN')} đ</p>
        </div>
        <div>
          <p className="text-slate-500">Còn lại phiếu trước</p>
          <p className="mt-1 font-semibold text-slate-800">{previousRemain.toLocaleString('vi-VN')} đ</p>
        </div>
        <div>
          <p className="text-slate-500">Công nợ đầu</p>
          <p className="mt-1 font-semibold text-amber-700">{congNoDau.toLocaleString('vi-VN')} đ</p>
        </div>
        <div>
          <p className="text-slate-500">Công nợ</p>
          <p className="mt-1 font-semibold text-amber-700">{congNo.toLocaleString('vi-VN')} đ</p>
        </div>
        <div>
          <p className="text-slate-500">Còn lại</p>
          <p className={`mt-1 font-semibold ${conLai > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {conLai.toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{formulaText}</p>

      {(customerError || lastDebtError) && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {customerError || lastDebtError}
        </p>
      )}
      {loadingLastDebt && form.khachHangId && (
        <p className="mt-2 text-xs text-slate-500">Đang tải công nợ phiếu trước...</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
        >
          {submitting ? 'Đang lưu...' : 'Thêm phiếu'}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
        >
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>

        <span className="text-sm text-slate-600">Ngày tạo: {format(new Date(), 'dd/MM/yyyy')}</span>
      </div>
    </form>
  );
}
