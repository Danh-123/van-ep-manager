'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import TruckFilter, { type TruckFilterValues } from '@/components/trucks/TruckFilter';
import CustomerDebtCard from '@/components/trucks/CustomerDebtCard';
import TruckForm from '@/components/trucks/TruckForm';
import TruckPagination from '@/components/trucks/TruckPagination';
import EditTicketModal from '@/components/trucks/EditTicketModal';
import TruckTable from '@/components/trucks/TruckTable';
import { useMounted } from '@/hooks/useMounted';
import { exportTrucksExcel } from '@/lib/excel/exportTrucks';
import type { DebtCalculatedRow } from '@/lib/trucks/debtCalculator';

type TruckRow = DebtCalculatedRow & {
  customerId: number | null;
  customerCode: string;
  customerName: string;
};

type CustomerDebtItem = {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalDebt: number;
  ticketCount: number;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: TruckRow[];
  customerDebts?: CustomerDebtItem[];
  total?: number;
  page?: number;
  totalPages?: number;
};

type TicketForm = {
  soTan: string;
  donGia: string;
  congNoDau: string;
  thanhToan: string;
  khachHangId: string;
  ghiChu: string;
};

const defaultForm: TicketForm = {
  soTan: '',
  donGia: '',
  congNoDau: '',
  thanhToan: '',
  khachHangId: '',
  ghiChu: '',
};

const defaultFilter: TruckFilterValues = {
  fromDate: '',
  toDate: '',
  customer: '',
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function TrucksPage() {
  const mounted = useMounted();
  const [rows, setRows] = useState<TruckRow[]>([]);
  const [customerDebts, setCustomerDebts] = useState<CustomerDebtItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<TicketForm>(defaultForm);
  const [editingTicket, setEditingTicket] = useState<DebtCalculatedRow | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<TruckFilterValues>(defaultFilter);
  const [appliedFilter, setAppliedFilter] = useState<TruckFilterValues>(defaultFilter);
  const [activeCustomerId, setActiveCustomerId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (appliedFilter.fromDate) searchParams.set('fromDate', appliedFilter.fromDate);
      if (appliedFilter.toDate) searchParams.set('toDate', appliedFilter.toDate);
      if (appliedFilter.customer.trim()) searchParams.set('customer', appliedFilter.customer.trim());
      if (activeCustomerId) searchParams.set('customerId', String(activeCustomerId));

      const response = await fetch(`/api/trucks?${searchParams.toString()}`, { cache: 'no-store' });
      const json = (await response.json()) as ApiResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải danh sách phiếu cân');
      }

      setRows(json.data);
      setCustomerDebts(json.customerDebts ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      setPage(json.page ?? page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách phiếu cân');
      setRows([]);
      setCustomerDebts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeCustomerId, appliedFilter.customer, appliedFilter.fromDate, appliedFilter.toDate, limit, page]);

  const fetchTruckPage = useCallback(
    async (targetPage: number, targetLimit: number, filters: TruckFilterValues) => {
      const searchParams = new URLSearchParams({
        page: String(targetPage),
        limit: String(targetLimit),
      });

      if (filters.fromDate) searchParams.set('fromDate', filters.fromDate);
      if (filters.toDate) searchParams.set('toDate', filters.toDate);
      if (filters.customer.trim()) searchParams.set('customer', filters.customer.trim());
      if (activeCustomerId) searchParams.set('customerId', String(activeCustomerId));

      const response = await fetch(`/api/trucks?${searchParams.toString()}`, { cache: 'no-store' });
      const json = (await response.json()) as ApiResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải danh sách phiếu cân');
      }

      return {
        rows: json.data,
        total: json.total ?? 0,
        totalPages: json.totalPages ?? 1,
        page: json.page ?? targetPage,
      };
    },
    [activeCustomerId],
  );

  useEffect(() => {
    if (!mounted) return;
    void loadRows();
  }, [mounted, loadRows]);

  const totalRemain = useMemo(() => rows.reduce((sum, row) => sum + row.conLai, 0), [rows]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngay_can: new Date().toISOString().slice(0, 10),
          khoi_luong_tan: Number(form.soTan),
          don_gia_ap_dung: Number(form.donGia),
          cong_no_dau: Number(form.congNoDau || 0),
          so_tien_da_tra: Number(form.thanhToan || 0),
          khach_hang_id: Number(form.khachHangId),
          ghi_chu: form.ghiChu,
        }),
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Không thể tạo phiếu cân');
      }

      await loadRows();
      setForm(defaultForm);
      setSuccess('Đã thêm phiếu cân và cập nhật công nợ lũy kế.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const accepted = window.confirm('Bạn có chắc muốn xóa phiếu này? Công nợ các dòng sau sẽ tự tính lại.');
    if (!accepted) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/trucks/${id}`, {
        method: 'DELETE',
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Không thể xóa phiếu cân');
      }

      await loadRows();
      setSuccess('Đã xóa phiếu và tính lại công nợ các dòng phía dưới.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (row: DebtCalculatedRow) => {
    setEditingTicket(row);
    setEditModalOpen(true);
  };

  const handleSavedFromModal = async (message: string) => {
    setError(null);
    setSuccess(message);
    await loadRows();
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilter(draftFilter);
  };

  const handleResetFilters = () => {
    setPage(1);
    setActiveCustomerId(null);
    setDraftFilter(defaultFilter);
    setAppliedFilter(defaultFilter);
  };

  const handleSelectCustomer = (customerId: number | null) => {
    setPage(1);
    setActiveCustomerId(customerId);
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
      const first = await fetchTruckPage(1, 50, appliedFilter);
      const allRows: DebtCalculatedRow[] = [...first.rows];

      for (let currentPage = 2; currentPage <= first.totalPages; currentPage += 1) {
        const next = await fetchTruckPage(currentPage, 50, appliedFilter);
        allRows.push(...next.rows);
      }

      await exportTrucksExcel(allRows);
      setSuccess('Xuất Excel công nợ thành công.');
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
        <h1 className="text-2xl font-semibold text-slate-900">Quản lý mua hàng và phiếu cân</h1>
        <p className="mt-1 text-sm text-slate-600">
          Công nợ được tính lũy kế theo công thức: Công nợ đầu + Thành tiền hiện tại + Còn lại của dòng trước.
        </p>
      </section>

      <TruckForm
        form={form}
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

      <CustomerDebtCard items={customerDebts} activeCustomerId={activeCustomerId} onSelect={handleSelectCustomer} />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px] xl:items-start">
        <TruckFilter
          values={draftFilter}
          loading={loading || submitting}
          onChange={setDraftFilter}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Tổng nợ còn lại</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(totalRemain)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <TruckTable
          rows={rows}
          loading={loading}
          submitting={submitting}
          onEdit={openEditModal}
          onDelete={(id) => void handleDelete(id)}
          onCustomerClick={handleSelectCustomer}
        />

        <TruckPagination
          page={page}
          totalPages={totalPages}
          limit={limit}
          total={total}
          loading={loading || submitting}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </section>

      <EditTicketModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        ticket={editingTicket}
        onSaved={handleSavedFromModal}
      />
    </div>
  );
}
