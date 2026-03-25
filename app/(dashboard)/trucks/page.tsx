'use client';

import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getFilterOptions,
  getPaymentHistory,
  getTickets,
  type TicketPaymentHistory,
  type TicketRow,
} from '@/app/(dashboard)/trucks/actions';
import CreateTicketModal from '@/components/trucks/CreateTicketModal';
import HistoryModal from '@/components/trucks/HistoryModal';
import PaymentModal from '@/components/trucks/PaymentModal';
import TicketTable from '@/components/trucks/TicketTable';
import { useMounted } from '@/hooks/useMounted';

type PaymentFilter = 'TatCa' | 'ChuaThanhToan' | 'ThanhToanMotPhan' | 'DaThanhToan';

export default function TrucksPage() {
  const mounted = useMounted();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [dateFilter, setDateFilter] = useState('');
  const [truckFilter, setTruckFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('TatCa');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null);

  const [historyRows, setHistoryRows] = useState<TicketPaymentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const optionsQuery = useQuery({
    queryKey: ['truck-filter-options'],
    queryFn: async () => {
      const result = await getFilterOptions();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60_000,
  });

  const ticketsQuery = useQuery({
    queryKey: ['tickets', page, pageSize, dateFilter, truckFilter, paymentFilter],
    queryFn: async () => {
      const result = await getTickets({
        date: dateFilter || undefined,
        truckId: truckFilter ? Number(truckFilter) : undefined,
        paymentStatus: paymentFilter,
        page,
        pageSize,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60_000,
  });

  const tickets = ticketsQuery.data?.items ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const totalPages = ticketsQuery.data?.totalPages ?? 1;
  const loading = ticketsQuery.isLoading || ticketsQuery.isFetching;
  const trucks = optionsQuery.data?.trucks ?? [];
  const woodTypes = optionsQuery.data?.woodTypes ?? [];

  useEffect(() => {
    setPage(1);
  }, [dateFilter, truckFilter, paymentFilter]);

  const handleOpenHistory = async (ticket: TicketRow) => {
    setActiveTicket(ticket);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(true);
    setHistoryOpen(true);

    const result = await getPaymentHistory(ticket.id);
    if (!result.success) {
      setHistoryError(result.error);
      setHistoryLoading(false);
      return;
    }

    setHistoryRows(result.data);
    setHistoryLoading(false);
  };

  const [today, setToday] = useState('');

  useEffect(() => {
    if (!mounted) return;
    setToday(format(new Date(), 'yyyy-MM-dd'));
  }, [mounted]);

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quan ly xe hang va phieu can</h1>
          <p className="mt-1 text-sm text-slate-600">Theo doi phieu can, thanh toan va cong no theo tung xe.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setError(null);
            setSuccess(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
        >
          <Plus className="h-4 w-4" />
          Tao phieu moi
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              max={today || undefined}
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <select
            value={truckFilter}
            onChange={(event) => setTruckFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          >
            <option value="">Tat ca xe</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={String(truck.id)}>
                {truck.label}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          >
            <option value="TatCa">Tat ca trang thai</option>
            <option value="ChuaThanhToan">Chua thanh toan</option>
            <option value="ThanhToanMotPhan">Thanh toan mot phan</option>
            <option value="DaThanhToan">Da thanh toan</option>
          </select>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {ticketsQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(ticketsQuery.error as Error).message}
        </div>
      )}
      {optionsQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(optionsQuery.error as Error).message}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <TicketTable
        rows={tickets}
        loading={loading}
        onPayment={(ticket) => {
          setActiveTicket(ticket);
          setPaymentOpen(true);
        }}
        onHistory={(ticket) => void handleOpenHistory(ticket)}
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">
          Hien thi {tickets.length === 0 ? 0 : (page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, total)} / {total} phieu can
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Truoc
          </button>
          <span className="text-slate-600">
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </section>

      <CreateTicketModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        trucks={trucks}
        woodTypes={woodTypes}
        onCreated={() => {
          setSuccess('Tao phieu can thanh cong.');
          void queryClient.invalidateQueries({ queryKey: ['truck-filter-options'] });
          void queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />

      <PaymentModal
        open={paymentOpen}
        ticket={activeTicket}
        onOpenChange={setPaymentOpen}
        onSuccess={() => {
          setSuccess('Cap nhat thanh toan thanh cong.');
          void queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />

      <HistoryModal
        open={historyOpen}
        ticket={activeTicket}
        loading={historyLoading}
        rows={historyRows}
        error={historyError}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
