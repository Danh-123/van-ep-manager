'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment, memo } from 'react';

import { type CustomerDebtGroup, type DebtTicket } from '@/app/(dashboard)/debt/actions';

import CustomerDetail from './CustomerDetail';

type DebtTableProps = {
  groups: CustomerDebtGroup[];
  expandedCustomer: string | null;
  onToggleExpand: (customer: string) => void;
  onPayment: (ticket: DebtTicket) => void;
  onHistory: (ticket: DebtTicket) => void;
  loading?: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function DebtTableComponent({
  groups,
  expandedCustomer,
  onToggleExpand,
  onPayment,
  onHistory,
  loading,
}: DebtTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">Khach hang</th>
              <th className="px-4 py-3 font-medium">Tong no</th>
              <th className="px-4 py-3 font-medium">Qua han?</th>
              <th className="px-4 py-3 text-right font-medium">Chi tiet</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="px-4 py-3" colSpan={4}>
                    <div className="h-6 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Khong co du lieu cong no.
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const expanded = expandedCustomer === group.customer;

                return (
                    <Fragment key={group.customer}>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium text-slate-800 hover:text-[#1B5E20]"
                          onClick={() => onToggleExpand(group.customer)}
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {group.customer}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600">{formatMoney(group.totalDebt)}</td>
                      <td className="px-4 py-3">
                        {group.overdue ? (
                          <span className="inline-flex rounded-full border border-red-700 bg-red-700 px-2.5 py-1 text-xs font-medium text-white">
                            Qua han {'>'}30 ngay
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Khong
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{group.tickets.length} phieu</td>
                    </tr>

                    {expanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/40">
                        <td colSpan={4} className="px-4 py-3">
                          <CustomerDetail tickets={group.tickets} onPayment={onPayment} onHistory={onHistory} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const DebtTable = memo(DebtTableComponent);

export default DebtTable;
