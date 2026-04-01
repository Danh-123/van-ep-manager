'use client';

type DebtTicket = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  customer: string;
  ngay: string;
  xeSo: string;
  soTan: number;
  thanhTien: number;
  daTra: number;
  conNo: number;
};

type CustomerDebtGroup = {
  customerId: number;
  customerCode: string;
  customerName: string;
  customer: string;
  totalDebt: number;
  tickets: DebtTicket[];
};

type DebtTableProps = {
  groups: CustomerDebtGroup[];
  loading?: boolean;
  onViewDetail: (group: CustomerDebtGroup) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DebtTable({ groups, loading = false, onViewDetail }: DebtTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-auto max-h-[600px]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">STT</th>
              <th className="px-4 py-3 font-medium">Mã KH</th>
              <th className="px-4 py-3 font-medium">Tên khách hàng</th>
              <th className="px-4 py-3 font-medium">Số phiếu</th>
              <th className="px-4 py-3 font-medium">Tổng nợ</th>
              <th className="px-4 py-3 text-center font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-6 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Không có khách hàng còn nợ.
                </td>
              </tr>
            ) : (
              groups.map((group, index) => (
                <tr key={group.customerId} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{group.customerCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <button
                      type="button"
                      onClick={() => onViewDetail(group)}
                      className="text-left hover:text-[#1B5E20]"
                    >
                      {group.customerName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{group.tickets.length}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatMoney(group.totalDebt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onViewDetail(group)}
                      className="rounded-lg border border-[#1B5E20] px-3 py-1.5 text-xs font-medium text-[#1B5E20] hover:bg-emerald-50"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
