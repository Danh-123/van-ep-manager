'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import SaleForm, { type SaleCustomerOption, type SaleFormValues } from '@/components/sales/SaleForm';
import SaleTable, { type SaleListRow } from '@/components/sales/SaleTable';
import { useMounted } from '@/hooks/useMounted';
import { exportSalesExcel } from '@/lib/excel/exportSales';

type SalesApiResponse = {
  success: boolean;
  error?: string;
  data?: SaleListRow[];
  customerSummary?: Array<{
    customerId: number;
    customerCode: string;
    customerName: string;
    totalDebt: number;
    ticketCount: number;
  }>;
  total?: number;
  page?: number;
  totalPages?: number;
};

type CustomerApiResponse = {
  success: boolean;
  error?: string;
  data?: SaleCustomerOption[];
};

const defaultForm: SaleFormValues = {
  khachHangId: '',
  soBo: '',
  soTo: '',
  doRong: '',
  doDay: '',
  doDai: '',
  donGia: '',
  congNoDau: '',
  thanhToan: '',
  ghiChu: '',
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function SalesPage() {
  const mounted = useMounted();
  const [rows, setRows] = useState<SaleListRow[]>([]);
  const [customers, setCustomers] = useState<SaleCustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<SaleFormValues>(defaultForm);
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftCustomerId, setDraftCustomerId] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedCustomerId, setAppliedCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomerError(null);

    try {
      const response = await fetch('/api/customers?loaiKhachHang=ban', { cache: 'no-store' });
      const json = (await response.json()) as CustomerApiResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải danh sách khách hàng bán');
      }

      setCustomers(json.data);
    } catch (loadError) {
      setCustomers([]);
      setCustomerError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khách hàng bán');
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const fetchSalesPage = useCallback(
    async (targetPage: number, targetLimit: number, fromDate: string, toDate: string, customerId: string) => {
      const searchParams = new URLSearchParams({
        page: String(targetPage),
        limit: String(targetLimit),
      });

      if (fromDate) searchParams.set('fromDate', fromDate);
      if (toDate) searchParams.set('toDate', toDate);
      if (customerId) searchParams.set('customerId', customerId);

      const response = await fetch(`/api/sales?${searchParams.toString()}`, { cache: 'no-store' });
      const json = (await response.json()) as SalesApiResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải danh sách phiếu bán');
      }

      return {
        rows: json.data,
        total: json.total ?? 0,
        totalPages: json.totalPages ?? 1,
        page: json.page ?? targetPage,
      };
    },
    [],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchSalesPage(page, limit, appliedFromDate, appliedToDate, appliedCustomerId);
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch (loadError) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách phiếu bán');
    } finally {
      setLoading(false);
    }
  }, [appliedCustomerId, appliedFromDate, appliedToDate, fetchSalesPage, limit, page]);

  useEffect(() => {
    if (!mounted) return;

    void loadCustomers();
  }, [loadCustomers, mounted]);

  useEffect(() => {
    if (!mounted) return;

    void loadRows();
  }, [loadRows, mounted]);

  const totalRemain = useMemo(() => rows.reduce((sum, row) => sum + row.conLai, 0), [rows]);
  const totalRevenue = useMemo(() => rows.reduce((sum, row) => sum + row.thanhTien, 0), [rows]);
  const customerCount = useMemo(() => new Set(rows.map((row) => row.customerId)).size, [rows]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngay_ban: new Date().toISOString().slice(0, 10),
          so_bo: Number(form.soBo || 0),
          so_to: Number(form.soTo || 0),
          do_rong: Number(form.doRong || 0),
          do_day: Number(form.doDay || 0),
          do_dai: Number(form.doDai || 0),
          don_gia: Number(form.donGia || 0),
          cong_no_dau: Number(form.congNoDau || 0),
          so_tien_da_tra: Number(form.thanhToan || 0),
          khach_hang_id: Number(form.khachHangId),
          ghi_chu: form.ghiChu,
        }),
      });

      const json = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Không thể tạo phiếu bán');
      }

      await loadRows();
      setForm(defaultForm);
      setSuccess('Đã thêm phiếu bán và cập nhật công nợ lũy kế.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo phiếu bán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFromDate(draftFromDate);
    setAppliedToDate(draftToDate);
    setAppliedCustomerId(draftCustomerId);
  };

  const handleResetFilters = () => {
    setPage(1);
    setDraftFromDate('');
    setDraftToDate('');
    setDraftCustomerId('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedCustomerId('');
  };

  const handleSelectCustomer = (customerId: number | null) => {
    const nextValue = customerId ? String(customerId) : '';
    setPage(1);
    setDraftCustomerId(nextValue);
    setAppliedCustomerId(nextValue);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const first = await fetchSalesPage(1, 50, appliedFromDate, appliedToDate, appliedCustomerId);
      const allRows: SaleListRow[] = [...first.rows];

      for (let currentPage = 2; currentPage <= first.totalPages; currentPage += 1) {
        const next = await fetchSalesPage(currentPage, 50, appliedFromDate, appliedToDate, appliedCustomerId);
        allRows.push(...next.rows);
      }

      await exportSalesExcel(allRows);
      setSuccess('Xuất Excel bán hàng thành công.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Không thể xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5 px-4 md:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Bán hàng</h1>
            <p className="mt-1 text-sm text-slate-600">Chỉ hiển thị cho Admin và Kế toán. Công nợ được tính lũy kế theo từng khách hàng.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng thành tiền</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng công nợ</p>
              <p className="mt-1 text-lg font-semibold text-red-700">{formatCurrency(totalRemain)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Số khách hàng</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{customerCount}</p>
            </div>
          </div>
        </div>
      </section>

      <SaleForm
        form={form}
        customers={customers}
        loadingCustomers={loadingCustomers}
        customerError={customerError}
        submitting={submitting}
        exporting={exporting}
        onSubmit={handleCreate}
        onChange={setForm}
        onExport={() => void handleExport()}
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fromDate">
                Từ ngày
              </label>
              <input
                id="fromDate"
                type="date"
                value={draftFromDate}
                onChange={(event) => setDraftFromDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="toDate">
                Đến ngày
              </label>
              <input
                id="toDate"
                type="date"
                value={draftToDate}
                onChange={(event) => setDraftToDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="customerFilter">
                Khách hàng
              </label>
              <select
                id="customerFilter"
                value={draftCustomerId}
                onChange={(event) => setDraftCustomerId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
                disabled={loadingCustomers}
              >
                <option value="">Tất cả khách hàng bán</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={String(customer.id)}>
                    {customer.code} - {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading || submitting}
              className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
            >
              Áp dụng lọc
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={loading || submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Đặt lại
            </button>
            <span className="text-sm text-slate-600">Tổng phiếu: {total}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Tổng công nợ còn lại</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(totalRemain)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SaleTable rows={rows} loading={loading} onCustomerClick={handleSelectCustomer} />

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Hiển thị {rows.length} / {total} phiếu</div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="limit">
              Số dòng/trang
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(event) => handleLimitChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading || submitting}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Trước
            </button>
            <span className="text-sm text-slate-600">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading || submitting}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}