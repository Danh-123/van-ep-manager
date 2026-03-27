'use client';

import * as Dialog from '@radix-ui/react-dialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Wallet, X } from 'lucide-react';

type SummaryRow = {
  id: number;
  ma_khach_hang: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  so_phieu: number;
  tong_no: number;
};

type DetailRow = {
  id: number;
  ngay_can: string;
  bien_so_xe: string;
  khoi_luong_tan: number;
  thanh_tien: number;
  so_tien_da_tra: number;
  cong_no: number;
  con_lai: number;
  ghi_chu: string;
};

type CustomerDetailModalProps = {
  open: boolean;
  loading?: boolean;
  customer: SummaryRow | null;
  rows: DetailRow[];
  onOpenChange: (open: boolean) => void;
  onPayment: (row: DetailRow) => void;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

export default function CustomerDetailModal({
  open,
  loading = false,
  customer,
  rows,
  onOpenChange,
  onPayment,
}: CustomerDetailModalProps) {
  const totalRemain = rows.reduce((sum, row) => sum + row.con_lai, 0);

  const handleExport = async () => {
    if (!customer) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cong no khach hang');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 7 },
      { header: 'Ngày cân', key: 'ngay_can', width: 14 },
      { header: 'Biển số xe', key: 'bien_so_xe', width: 14 },
      { header: 'Khối lượng (tấn)', key: 'khoi_luong_tan', width: 16 },
      { header: 'Thành tiền', key: 'thanh_tien', width: 16 },
      { header: 'Đã trả', key: 'so_tien_da_tra', width: 16 },
      { header: 'Công nợ', key: 'cong_no', width: 16 },
      { header: 'Còn lại', key: 'con_lai', width: 16 },
      { header: 'Ghi chú', key: 'ghi_chu', width: 28 },
    ];

    rows.forEach((row, index) => {
      sheet.addRow({
        stt: index + 1,
        ngay_can: formatDate(row.ngay_can),
        bien_so_xe: row.bien_so_xe,
        khoi_luong_tan: row.khoi_luong_tan,
        thanh_tien: row.thanh_tien,
        so_tien_da_tra: row.so_tien_da_tra,
        cong_no: row.cong_no,
        con_lai: row.con_lai,
        ghi_chu: row.ghi_chu || '',
      });
    });

    const header = sheet.getRow(1);
    header.font = { bold: true };

    const moneyColumns = [5, 6, 7, 8];
    moneyColumns.forEach((col) => {
      sheet.getColumn(col).numFmt = '#,##0';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeCode = customer.ma_khach_hang.replace(/\s+/g, '_');
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `cong-no-${safeCode}.xlsx`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">Chi tiết công nợ khách hàng</Dialog.Title>
              <p className="mt-1 text-sm text-slate-600">
                {customer ? `${customer.ma_khach_hang} - ${customer.ten_khach_hang}` : 'Chưa chọn khách hàng'}
              </p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
            <span className="font-medium">Tổng nợ hiện tại:</span>{' '}
            <span className={totalRemain > 0 ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
              {formatMoney(totalRemain)}
            </span>
          </div>

          <div className="max-h-[55vh] overflow-auto px-5 py-4">
            <table className="min-w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="w-[6%] px-3 py-2.5 font-medium">STT</th>
                  <th className="w-[12%] px-3 py-2.5 font-medium">Ngày cân</th>
                  <th className="w-[12%] px-3 py-2.5 font-medium">Biển số xe</th>
                  <th className="w-[10%] px-3 py-2.5 text-right font-medium">Khối lượng</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-medium">Thành tiền</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-medium">Đã trả</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-medium">Công nợ</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-medium">Còn lại</th>
                  <th className="w-[12%] px-3 py-2.5 text-center font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-3" colSpan={9}>
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={9}>
                      Không có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-2.5 text-slate-700">{index + 1}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatDate(row.ngay_can)}</td>
                      <td className="px-3 py-2.5 text-slate-800">{row.bien_so_xe}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{row.khoi_luong_tan.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(row.thanh_tien)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(row.so_tien_da_tra)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(row.cong_no)}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${row.con_lai > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {formatMoney(row.con_lai)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={row.con_lai <= 0}
                          onClick={() => onPayment(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0B7285] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#095C6D] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Thanh toán
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!customer || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
