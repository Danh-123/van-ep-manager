'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Search } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getPaymentHistory, type TicketPaymentHistory } from '@/app/(dashboard)/trucks/actions';
import DebtTable from '@/components/debt/DebtTable';
import HistoryModal from '@/components/trucks/HistoryModal';
import PaymentModal from '@/components/trucks/PaymentModal';

type DebtTicket = {
  id: number;
  customer: string;
  ngay: string;
  xeSo: string;
  thanhTien: number;
  daTra: number;
  conNo: number;
  createdAt: string;
  lastPaymentDate: string | null;
  status: 'DaThanhToan' | 'ThanhToanMotPhan' | 'ChuaThanhToan' | 'QuaHan';
  overdue: boolean;
};

type CustomerDebtGroup = {
  customer: string;
  totalDebt: number;
  overdue: boolean;
  tickets: DebtTicket[];
};

type DebtReportResponse = {
  groups: CustomerDebtGroup[];
  totalDebt: number;
  customerOptions: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DebtPage() {
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const [activeTicket, setActiveTicket] = useState<DebtTicket | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<TicketPaymentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const debtQuery = useQuery({
    queryKey: ['debt-report', search, customerFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: search || '',
        customer: customerFilter || '',
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetch(`/api/debt?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Không thể tải báo cáo công nợ');
      }

      const json = (await response.json()) as { success: boolean; error?: string; data?: DebtReportResponse };
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải báo cáo công nợ');
      }

      return json.data;
    },
    staleTime: 60_000,
  });

  const groups = debtQuery.data?.groups ?? [];
  const customerOptions = debtQuery.data?.customerOptions ?? [];
  const totalDebt = debtQuery.data?.totalDebt ?? 0;
  const totalPages = debtQuery.data?.totalPages ?? 1;
  const total = debtQuery.data?.total ?? 0;
  const loading = debtQuery.isLoading || debtQuery.isFetching;

  const handleOpenHistory = async (ticket: DebtTicket) => {
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

  const handleExport = () => {
    startTransition(async () => {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('TongHopCongNo');

      summarySheet.columns = [
        { header: 'Khach hang', key: 'customer', width: 28 },
        { header: 'Tong no', key: 'totalDebt', width: 20 },
        { header: 'Qua han', key: 'overdue', width: 16 },
      ];

      groups.forEach((group) => {
        summarySheet.addRow({
          customer: group.customer,
          totalDebt: Math.round(group.totalDebt),
          overdue: group.overdue ? 'Qua han >30 ngay' : 'Khong',
        });
      });

      summarySheet.addRow({
        customer: 'Tong cong',
        totalDebt: Math.round(totalDebt),
        overdue: '',
      });

      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(summarySheet.rowCount).font = { bold: true };

      const detailSheet = workbook.addWorksheet('ChiTietPhieu');
      detailSheet.columns = [
        { header: 'Khach hang', key: 'customer', width: 28 },
        { header: 'Ngay', key: 'ngay', width: 14 },
        { header: 'Xe so', key: 'xeSo', width: 14 },
        { header: 'Thanh tien', key: 'thanhTien', width: 18 },
        { header: 'Da tra', key: 'daTra', width: 16 },
        { header: 'Con no', key: 'conNo', width: 16 },
        { header: 'Ngay tao phieu', key: 'createdAt', width: 16 },
        { header: 'Ngay thanh toan gan nhat', key: 'lastPaymentDate', width: 22 },
        { header: 'Trang thai', key: 'status', width: 20 },
      ];

      groups.forEach((group) => {
        group.tickets.forEach((ticket) => {
          detailSheet.addRow({
            customer: group.customer,
            ngay: ticket.ngay,
            xeSo: ticket.xeSo,
            thanhTien: Math.round(ticket.thanhTien),
            daTra: Math.round(ticket.daTra),
            conNo: Math.round(ticket.conNo),
            createdAt: ticket.createdAt,
            lastPaymentDate: ticket.lastPaymentDate ?? '',
            status: ticket.status,
          });
        });
      });

      detailSheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      saveAs(blob, `bao-cao-cong-no-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  const customerCount = useMemo(() => groups.length, [groups.length]);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Quan ly cong no</h1>
            <p className="mt-1 text-sm text-slate-600">Tong khach hang co du lieu: {customerCount}</p>
            <p className="mt-2 text-lg font-semibold text-red-600">Tong no phai thu: {formatMoney(totalDebt)}</p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Xuat Excel
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tim theo ten khach hang..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <select
            value={customerFilter}
            onChange={(event) => {
              setCustomerFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
          >
            <option value="">Tat ca khach hang</option>
            {customerOptions.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </div>
      </header>

      {debtQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(debtQuery.error as Error).message}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <DebtTable
        groups={groups}
        loading={loading}
        expandedCustomer={expandedCustomer}
        onToggleExpand={(customer) => setExpandedCustomer((prev) => (prev === customer ? null : customer))}
        onPayment={(ticket) => {
          setActiveTicket(ticket);
          setPaymentOpen(true);
        }}
        onHistory={(ticket) => void handleOpenHistory(ticket)}
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">
          Hien thi {groups.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / {total}{' '}
          khach hang
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

      <PaymentModal
        open={paymentOpen}
        ticket={
          activeTicket
            ? {
                id: activeTicket.id,
                khachHang: activeTicket.customer,
                thanhTien: activeTicket.thanhTien,
                conNo: activeTicket.conNo,
              }
            : null
        }
        onOpenChange={setPaymentOpen}
        onSuccess={() => {
          setSuccess('Cap nhat thanh toan thanh cong.');
          void queryClient.invalidateQueries({ queryKey: ['debt-report'] });
        }}
      />

      <HistoryModal
        open={historyOpen}
        ticket={activeTicket ? { khachHang: activeTicket.customer } : null}
        loading={historyLoading}
        rows={historyRows}
        error={historyError}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
