'use client';

import { format } from 'date-fns';

type TruckRow = {
  id: number;
  customerId: number | null;
  customerName: string;
  ngay: string;
  bienSo: string;
  soTan: number;
  donGia: number;
  thanhTien: number;
  congNo: number;
  thanhToan: number;
  conLai: number;
  formulaText: string;
  khachHang: string;
  ghiChu: string;
};

type TruckTableProps = {
  rows: TruckRow[];
  loading?: boolean;
  submitting?: boolean;
  onEdit: (row: TruckRow) => void;
  onDelete: (id: number) => void;
  onCustomerClick: (customerId: number | null) => void;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

const widths = {
  stt: 'w-[50px] min-w-[50px]',
  ngay: 'w-[100px] min-w-[100px]',
  bienSo: 'w-[100px] min-w-[100px]',
  soTan: 'w-[80px] min-w-[80px]',
  donGia: 'w-[100px] min-w-[100px]',
  thanhTien: 'w-[120px] min-w-[120px]',
  congNo: 'w-[120px] min-w-[120px]',
  thanhToan: 'w-[120px] min-w-[120px]',
  conLai: 'w-[120px] min-w-[120px]',
  khachHang: 'w-[150px] min-w-[150px]',
  ghiChu: 'w-[150px] min-w-[150px]',
  action: 'w-[80px] min-w-[80px]',
};

export default function TruckTable({
  rows,
  loading = false,
  submitting = false,
  onEdit,
  onDelete,
  onCustomerClick,
}: TruckTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[800px] lg:min-w-full table-fixed divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-700">
          <tr>
            <th className={`px-2 py-2 ${widths.stt}`}>STT</th>
            <th className={`px-2 py-2 ${widths.ngay}`}>Ngày</th>
            <th className={`px-2 py-2 ${widths.bienSo}`}>Biển số</th>
            <th className={`px-2 py-2 ${widths.soTan}`}>Số tấn</th>
            <th className={`px-2 py-2 ${widths.donGia}`}>Đơn giá</th>
            <th className={`px-2 py-2 ${widths.thanhTien}`}>Thành tiền</th>
            <th className={`px-2 py-2 ${widths.congNo}`}>Công nợ</th>
            <th className={`px-2 py-2 ${widths.thanhToan}`}>Thanh toán</th>
            <th className={`px-2 py-2 ${widths.conLai}`}>Còn lại</th>
            <th className={`px-2 py-2 ${widths.khachHang}`}>Khách hàng</th>
            <th className={`px-2 py-2 ${widths.ghiChu}`}>Ghi chú</th>
            <th className={`px-2 py-2 ${widths.action}`}>Thao tác</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {loading && (
            <tr>
              <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                Chưa có phiếu cân nào.
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, index) => (
              <tr key={row.id} className="align-top">
                <td className={`px-2 py-3 text-slate-700 ${widths.stt}`}>{index + 1}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.ngay}`}>{format(new Date(row.ngay), 'dd/MM/yyyy')}</td>
                <td className={`px-2 py-3 font-medium text-slate-800 ${widths.bienSo}`}>{row.bienSo}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.soTan}`}>{row.soTan.toLocaleString('vi-VN')}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.donGia}`}>{formatCurrency(row.donGia)}</td>
                <td className={`px-2 py-3 font-semibold text-blue-700 ${widths.thanhTien}`}>{formatCurrency(row.thanhTien)}</td>
                <td className={`px-2 py-3 font-semibold text-amber-700 ${widths.congNo}`}>{formatCurrency(row.congNo)}</td>
                <td className={`px-2 py-3 font-semibold text-slate-700 ${widths.thanhToan}`}>{formatCurrency(row.thanhToan)}</td>
                <td className={`px-2 py-3 font-semibold ${row.conLai > 0 ? 'text-red-700' : 'text-emerald-700'} ${widths.conLai}`}>
                  {formatCurrency(row.conLai)}
                </td>
                <td className={`px-2 py-3 text-slate-700 truncate ${widths.khachHang}`} title={row.customerName}>
                  <button
                    type="button"
                    onClick={() => onCustomerClick(row.customerId)}
                    className="text-left hover:text-[#0B7285]"
                  >
                    {row.customerName}
                  </button>
                </td>
                <td className={`px-2 py-3 text-slate-600 truncate ${widths.ghiChu}`} title={row.ghiChu || '-'}>
                  {row.ghiChu || '-'}
                </td>
                <td className={`px-2 py-3 ${widths.action}`}>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      disabled={submitting}
                      className="rounded border border-[#0B7285] px-2 py-1 text-xs text-[#0B7285] hover:bg-[#0B7285]/10"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      disabled={submitting}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
