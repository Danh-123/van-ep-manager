'use client';

type CustomerDebtItem = {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalDebt: number;
  ticketCount: number;
};

type CustomerDebtCardProps = {
  items: CustomerDebtItem[];
  activeCustomerId: number | null;
  onSelect: (customerId: number | null) => void;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function CustomerDebtCard({ items, activeCustomerId, onSelect }: CustomerDebtCardProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Tong no theo khach hang</h2>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Bo loc khach hang
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const active = activeCustomerId === item.customerId;
          const isDebt = item.totalDebt > 0;

          return (
            <button
              key={item.customerId}
              type="button"
              onClick={() => onSelect(item.customerId)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                isDebt
                  ? 'border-red-200 bg-red-50 hover:border-red-300'
                  : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
              } ${active ? 'ring-2 ring-[#0B7285]' : ''}`}
            >
              <p className="text-xs font-medium text-slate-500">{item.customerCode}</p>
              <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{item.customerName}</p>
              <p className={`mt-2 text-lg font-bold ${isDebt ? 'text-red-700' : 'text-emerald-700'}`}>
                {formatCurrency(item.totalDebt)}
              </p>
              <p className="mt-1 text-xs text-slate-600">{item.ticketCount} phieu</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
