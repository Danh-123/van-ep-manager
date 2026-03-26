'use client';

export type TruckFilterValues = {
  fromDate: string;
  toDate: string;
  plate: string;
  customer: string;
};

type TruckFilterProps = {
  values: TruckFilterValues;
  loading?: boolean;
  onChange: (next: TruckFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
};

export default function TruckFilter({ values, loading = false, onChange, onApply, onReset }: TruckFilterProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Từ ngày</label>
          <input
            type="date"
            value={values.fromDate}
            onChange={(event) => onChange({ ...values, fromDate: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Đến ngày</label>
          <input
            type="date"
            value={values.toDate}
            onChange={(event) => onChange({ ...values, toDate: event.target.value })}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
        </div>

        <div className="space-y-1 col-span-2 md:col-span-1">
          <label className="text-xs font-medium text-slate-600">Biển số xe</label>
          <input
            type="text"
            value={values.plate}
            onChange={(event) => onChange({ ...values, plate: event.target.value })}
            placeholder="Ví dụ: 51C"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Khách hàng</label>
          <input
            type="text"
            value={values.customer}
            onChange={(event) => onChange({ ...values, customer: event.target.value })}
            placeholder="Ví dụ: Công ty A"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
        </div>

        <div className="flex items-end gap-2 col-span-2 md:col-span-3 lg:col-span-1">
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="h-10 flex-1 rounded-lg bg-[#0B7285] px-3 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}
