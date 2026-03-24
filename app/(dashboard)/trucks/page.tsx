'use client';

import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getFilterOptions,
  getPaymentHistory,
  getTickets,
  type TicketPaymentHistory,
  type TicketRow,
  type TicketOption,
  type WoodTypeOption,
} from '@/app/(dashboard)/trucks/actions';
import CreateTicketModal from '@/components/trucks/CreateTicketModal';
import HistoryModal from '@/components/trucks/HistoryModal';
import PaymentModal from '@/components/trucks/PaymentModal';
import TicketTable from '@/components/trucks/TicketTable';
import { useMounted } from '@/hooks/useMounted';

type PaymentFilter = 'TatCa' | 'ChuaThanhToan' | 'ThanhToanMotPhan' | 'DaThanhToan';

export default function TrucksPage() {
  const mounted = useMounted();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [trucks, setTrucks] = useState<TicketOption[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodTypeOption[]>([]);

  const [dateFilter, setDateFilter] = useState('');
  const [truckFilter, setTruckFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('TatCa');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null);

  const [historyRows, setHistoryRows] = useState<TicketPaymentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    const result = await getFilterOptions();

    if (!result.success) {
      setError(result.error);
      return;
    }

    setTrucks(result.data.trucks);
    setWoodTypes(result.data.woodTypes);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getTickets({
      date: dateFilter || undefined,
      truckId: truckFilter ? Number(truckFilter) : undefined,
      paymentStatus: paymentFilter,
    });

    if (!result.success) {
      setError(result.error);
      setTickets([]);
      setLoading(false);
      return;
    }

    setTickets(result.data);
    setLoading(false);
  }, [dateFilter, paymentFilter, truckFilter]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

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

      <CreateTicketModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        trucks={trucks}
        woodTypes={woodTypes}
        onCreated={() => {
          setSuccess('Tao phieu can thanh cong.');
          void loadOptions();
          void loadTickets();
        }}
      />

      <PaymentModal
        open={paymentOpen}
        ticket={activeTicket}
        onOpenChange={setPaymentOpen}
        onSuccess={() => {
          setSuccess('Cap nhat thanh toan thanh cong.');
          void loadTickets();
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
