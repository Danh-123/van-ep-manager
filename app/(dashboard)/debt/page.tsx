'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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

type CustomerDebtType = 'mua' | 'ban';

type DebtGroup = {
  customerId: number;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerDebtType;
  totalDebt: number;
  tickets: DebtDetailItem[];
};

type DebtApiResponse = {
  groups: DebtGroup[];
  totalDebt: number;
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
  const [activeTab, setActiveTab] = useState<CustomerDebtType>('mua');

  const [activeCustomer, setActiveCustomer] = useState<DebtSummaryItem | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<DebtDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    setActiveCustomer(null);
    setSelectedTicket(null);
    setDetailOpen(false);
    setPaymentOpen(false);
  }, [activeTab]);

  const summaryQuery = useQuery({
    queryKey: ['debt-summary', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/debt?loaiKhachHang=${activeTab}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Không thể tải tổng hợp công nợ');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: DebtApiResponse };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải tổng hợp công nợ');
      }

      return json.data;
    },
    staleTime: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: ['debt-detail', activeTab, activeCustomer?.id],
    enabled: detailOpen && !!activeCustomer,
    queryFn: async () => {
      if (!activeCustomer) return [] as DebtDetailItem[];

      const response = await fetch(`/api/debt/${activeCustomer.id}?loaiKhachHang=${activeTab}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Không thể tải chi tiết công nợ');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: DebtDetailItem[] };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải chi tiết công nợ');
      }

      return json.data;
    },
    staleTime: 30_000,
  });

  const rows = useMemo<DebtSummaryItem[]>(() => {
    const groups = summaryQuery.data?.groups ?? [];
    return groups.map((group) => ({
      id: group.customerId,
      ma_khach_hang: group.customerCode,
      ten_khach_hang: group.customerName,
      so_dien_thoai: group.customerPhone,
      so_phieu: group.tickets.length,
      tong_no: group.totalDebt,
    }));
  }, [summaryQuery.data]);

  const totalDebt = useMemo(() => summaryQuery.data?.totalDebt ?? 0, [summaryQuery.data]);
  const loading = summaryQuery.isLoading || summaryQuery.isFetching;
  const detailRows = useMemo(() => detailQuery.data ?? [], [detailQuery.data]);

  const customerCount = useMemo(() => rows.length, [rows.length]);

  const tabLabel = activeTab === 'mua' ? 'Khách hàng mua' : 'Khách hàng bán';

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
            <h1 className="text-2xl font-semibold text-slate-900">Công nợ khách hàng</h1>
            <p className="mt-1 text-sm text-slate-600">Đang xem: {tabLabel}</p>
            <p className="mt-1 text-sm text-slate-600">Số khách hàng: {customerCount}</p>
            <p className="mt-2 text-lg font-semibold text-red-600">Tổng công nợ: {formatMoney(totalDebt)}</p>
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

      <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as CustomerDebtType)} className="space-y-4">
        <Tabs.List className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <Tabs.Trigger
            value="mua"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-[#0B7285] data-[state=active]:text-white"
          >
            Khách hàng mua
          </Tabs.Trigger>
          <Tabs.Trigger
            value="ban"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-[#0B7285] data-[state=active]:text-white"
          >
            Khách hàng bán
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} className="space-y-4">
          <DebtSummaryTable rows={rows} loading={loading} onViewDetail={openDetailModal} />
        </Tabs.Content>
      </Tabs.Root>

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
