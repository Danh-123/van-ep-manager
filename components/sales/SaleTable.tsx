'use client';

import { format } from 'date-fns';

import { formatNumber } from '@/lib/utils/format';

export type SaleListRow = {
  id: number;
  customerId: number;
  customerCode: string;
  customerName: string;
  ngay: string;
  soBo: number;
  soTo: number;
  doRong: number;
  doDay: number;
  doDai: number;
  soKhoi: number;
  donGia: number;
  congNoDau: number;
  previousRemain: number;
  thanhTien: number;
  congNo: number;
  thanhToan: number;
  conLai: number;
  ghiChu: string;
  formulaText: string;
};

type SaleTableProps = {
  rows: SaleListRow[];
  loading?: boolean;
  onCustomerClick: (customerId: number | null) => void;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

const widths = {
  stt: 'w-[50px] min-w-[50px]',
  ngay: 'w-[100px] min-w-[100px]',
  khachHang: 'w-[190px] min-w-[190px]',
  soBo: 'w-[70px] min-w-[70px]',
  soTo: 'w-[70px] min-w-[70px]',
  doRong: 'w-[85px] min-w-[85px]',
  doDay: 'w-[85px] min-w-[85px]',
  doDai: 'w-[85px] min-w-[85px]',
  soKhoi: 'w-[100px] min-w-[100px]',
  donGia: 'w-[120px] min-w-[120px]',
  thanhTien: 'w-[130px] min-w-[130px]',
  congNoDau: 'w-[120px] min-w-[120px]',
  previousRemain: 'w-[130px] min-w-[130px]',
  congNo: 'w-[120px] min-w-[120px]',
  thanhToan: 'w-[120px] min-w-[120px]',
  conLai: 'w-[120px] min-w-[120px]',
  ghiChu: 'w-[180px] min-w-[180px]',
};

export default function SaleTable({ rows, loading = false, onCustomerClick }: SaleTableProps) {
  return (
    <div className="overflow-auto max-h-[650px]">
      <table className="min-w-[1800px] table-fixed divide-y divide-slate-200 text-sm lg:min-w-full">
        <thead className="sticky top-0 z-10 bg-white shadow-sm">
          <tr>
            <th className={`px-2 py-2 ${widths.stt}`}>STT</th>
            <th className={`px-2 py-2 ${widths.ngay}`}>Ngày</th>
            <th className={`px-2 py-2 ${widths.khachHang}`}>Khách hàng</th>
            <th className={`px-2 py-2 ${widths.soBo}`}>Số bó</th>
            <th className={`px-2 py-2 ${widths.soTo}`}>Số tờ</th>
            <th className={`px-2 py-2 ${widths.doRong}`}>Rộng</th>
            <th className={`px-2 py-2 ${widths.doDay}`}>Dày</th>
            <th className={`px-2 py-2 ${widths.doDai}`}>Dài</th>
            <th className={`px-2 py-2 ${widths.soKhoi}`}>Số khối</th>
            <th className={`px-2 py-2 ${widths.donGia}`}>Đơn giá</th>
            <th className={`px-2 py-2 ${widths.thanhTien}`}>Thành tiền</th>
            <th className={`px-2 py-2 ${widths.congNoDau}`}>CN ban đầu</th>
            <th className={`px-2 py-2 ${widths.previousRemain}`}>Còn lại phiếu trước</th>
            <th className={`px-2 py-2 ${widths.congNo}`}>Công nợ</th>
            <th className={`px-2 py-2 ${widths.thanhToan}`}>Thanh toán</th>
            <th className={`px-2 py-2 ${widths.conLai}`}>Còn lại</th>
            <th className={`px-2 py-2 ${widths.ghiChu}`}>Ghi chú</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {loading && (
            <tr>
              <td colSpan={17} className="px-3 py-8 text-center text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={17} className="px-3 py-8 text-center text-slate-500">
                Chưa có phiếu bán nào.
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, index) => (
              <tr key={row.id} className="align-top">
                <td className={`px-2 py-3 text-slate-700 ${widths.stt}`}>{index + 1}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.ngay}`}>{format(new Date(row.ngay), 'dd/MM/yyyy')}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.khachHang}`} title={row.customerName}>
                  <button type="button" onClick={() => onCustomerClick(row.customerId)} className="text-left font-medium text-slate-800 hover:text-[#0B7285]">
                    {row.customerCode} - {row.customerName}
                  </button>
                </td>
                <td className={`px-2 py-3 text-slate-700 ${widths.soBo}`}>{formatNumber(row.soBo, 0)}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.soTo}`}>{formatNumber(row.soTo, 0)}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.doRong}`}>{formatNumber(row.doRong, 2)}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.doDay}`}>{formatNumber(row.doDay, 2)}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.doDai}`}>{formatNumber(row.doDai, 2)}</td>
                <td className={`px-2 py-3 font-semibold text-blue-700 ${widths.soKhoi}`}>{formatNumber(row.soKhoi, 6)}</td>
                <td className={`px-2 py-3 text-slate-700 ${widths.donGia}`}>{formatCurrency(row.donGia)}</td>
                <td className={`px-2 py-3 font-semibold text-blue-700 ${widths.thanhTien}`}>{formatCurrency(row.thanhTien)}</td>
                <td className={`px-2 py-3 font-semibold text-amber-700 ${widths.congNoDau}`}>{formatCurrency(row.congNoDau)}</td>
                <td className={`px-2 py-3 font-semibold text-slate-700 ${widths.previousRemain}`}>{formatCurrency(row.previousRemain)}</td>
                <td className={`px-2 py-3 font-semibold text-amber-700 ${widths.congNo}`}>{formatCurrency(row.congNo)}</td>
                <td className={`px-2 py-3 font-semibold text-slate-700 ${widths.thanhToan}`}>{formatCurrency(row.thanhToan)}</td>
                <td className={`px-2 py-3 font-semibold ${row.conLai > 0 ? 'text-red-700' : 'text-emerald-700'} ${widths.conLai}`}>
                  {formatCurrency(row.conLai)}
                </td>
                <td className={`px-2 py-3 text-slate-600 truncate ${widths.ghiChu}`} title={row.ghiChu || '-'}>
                  {row.ghiChu || '-'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}