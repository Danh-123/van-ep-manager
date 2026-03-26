'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import CustomerDetailModal from '@/components/debt/CustomerDetailModal';
import DebtSummaryTable from '@/components/debt/DebtSummaryTable';
import PaymentModal from '@/components/debt/PaymentModal';

type DebtSummaryItem = {
  id: number;
  ma_khach_hang: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  so_phieu: number;
  tong_no: number;
};

type DebtDetailItem = {
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DebtPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeCustomer, setActiveCustomer] = useState<DebtSummaryItem | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<DebtDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ['debt-summary'],
    queryFn: async () => {
      const response = await fetch('/api/debt/summary', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Khong the tai tong hop cong no');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: DebtSummaryItem[] };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Khong the tai tong hop cong no');
      }

      return json.data;
    },
    staleTime: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: ['debt-detail', activeCustomer?.id],
    enabled: detailOpen && !!activeCustomer,
    queryFn: async () => {
      if (!activeCustomer) return [] as DebtDetailItem[];

      const response = await fetch(`/api/debt/${activeCustomer.id}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Khong the tai chi tiet cong no');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: DebtDetailItem[] };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Khong the tai chi tiet cong no');
      }

      return json.data;
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data]);
  const totalDebt = useMemo(() => rows.reduce((sum, item) => sum + item.tong_no, 0), [rows]);
  const loading = summaryQuery.isLoading || summaryQuery.isFetching;
  const detailRows = useMemo(() => detailQuery.data ?? [], [detailQuery.data]);

  const customerCount = useMemo(() => rows.length, [rows.length]);

  const openDetailModal = (customer: DebtSummaryItem) => {
    setActiveCustomer(customer);
    setSelectedTicket(null);
    setDetailOpen(true);
  };

  const openPaymentModal = (ticket: DebtDetailItem) => {
    setSelectedTicket(ticket);
    setPaymentOpen(true);
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Cong no khach hang</h1>
            <p className="mt-1 text-sm text-slate-600">So khach hang: {customerCount}</p>
            <p className="mt-2 text-lg font-semibold text-red-600">Tong no phai thu: {formatMoney(totalDebt)}</p>
          </div>
        </div>
      </header>

      {summaryQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(summaryQuery.error as Error).message}
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <DebtSummaryTable rows={rows} loading={loading} onViewDetail={openDetailModal} />

      <CustomerDetailModal
        open={detailOpen}
        loading={detailQuery.isLoading || detailQuery.isFetching}
        onOpenChange={setDetailOpen}
        customer={activeCustomer}
        rows={detailRows}
        onPayment={openPaymentModal}
      />

      <PaymentModal
        open={paymentOpen}
        ticket={selectedTicket}
        onOpenChange={setPaymentOpen}
        onSuccess={async (message) => {
          setError(null);
          setSuccessMessage(message);
          await queryClient.invalidateQueries({ queryKey: ['debt-summary'] });
          if (activeCustomer) {
            await queryClient.invalidateQueries({ queryKey: ['debt-detail', activeCustomer.id] });
          }
        }}
      />
    </div>
  );
}
