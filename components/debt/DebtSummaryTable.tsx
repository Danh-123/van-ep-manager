'use client';

type DebtSummaryItem = {
  id: number;
  ma_khach_hang: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  so_phieu: number;
  tong_no: number;
};

type DebtSummaryTableProps = {
  rows: DebtSummaryItem[];
  loading?: boolean;
  onViewDetail: (row: DebtSummaryItem) => void;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function DebtSummaryTable({ rows, loading = false, onViewDetail }: DebtSummaryTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-auto max-h-[600px]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">STT</th>
              <th className="px-4 py-3 font-medium">Mã khách hàng</th>
              <th className="px-4 py-3 font-medium">Tên khách hàng</th>
              <th className="px-4 py-3 font-medium">Số điện thoại</th>
              <th className="px-4 py-3 font-medium">Số phiếu</th>
              <th className="px-4 py-3 font-medium">Tổng nợ</th>
              <th className="px-4 py-3 text-center font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-5 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  Không có dữ liệu công nợ.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{row.ma_khach_hang}</td>
                  <td className="px-4 py-3 text-slate-800">{row.ten_khach_hang}</td>
                  <td className="px-4 py-3 text-slate-700">{row.so_dien_thoai || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.so_phieu}</td>
                  <td className={`px-4 py-3 font-semibold ${row.tong_no > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatMoney(row.tong_no)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onViewDetail(row)}
                      className="rounded-lg border border-[#0B7285] px-3 py-1.5 text-xs font-medium text-[#0B7285] hover:bg-[#0B7285]/10"
                    >
                      Xem chi tiết
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
