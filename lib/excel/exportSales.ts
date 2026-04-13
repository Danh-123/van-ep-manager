import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import type { SaleListRow } from '@/components/sales/SaleTable';

type CustomerSummaryRow = {
  customer: string;
  ticketCount: number;
  totalDebt: number;
  totalAmount: number;
  totalPaid: number;
};

function buildFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `Ban_hang_${yyyymmdd}_${hhmmss}.xlsx`;
}

function parseDateValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };

  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
  });
}

function applyBorders(sheet: ExcelJS.Worksheet) {
  for (let r = 1; r <= sheet.rowCount; r += 1) {
    for (let c = 1; c <= sheet.columnCount; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    }
  }
}

function groupByCustomer(rows: SaleListRow[]): CustomerSummaryRow[] {
  const map = new Map<string, CustomerSummaryRow>();

  rows.forEach((row) => {
    const customer = row.customerName?.trim() || 'Khach hang';
    const current = map.get(customer) ?? {
      customer,
      ticketCount: 0,
      totalDebt: 0,
      totalAmount: 0,
      totalPaid: 0,
    };

    current.ticketCount += 1;
    current.totalDebt += row.conLai;
    current.totalAmount += row.thanhTien;
    current.totalPaid += row.thanhToan;

    map.set(customer, current);
  });

  return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
}

export async function exportSalesExcel(rows: SaleListRow[]) {
  const workbook = new ExcelJS.Workbook();

  const listSheet = workbook.addWorksheet('Danh sách phiếu bán');
  listSheet.columns = [
    { header: 'Ngày', key: 'ngay', width: 14 },
    { header: 'Khách hàng', key: 'khachHang', width: 28 },
    { header: 'Số bó', key: 'soBo', width: 12 },
    { header: 'Số tờ', key: 'soTo', width: 12 },
    { header: 'Rộng', key: 'doRong', width: 12 },
    { header: 'Dày', key: 'doDay', width: 12 },
    { header: 'Dài', key: 'doDai', width: 12 },
    { header: 'Số khối', key: 'soKhoi', width: 16 },
    { header: 'Đơn giá', key: 'donGia', width: 16 },
    { header: 'Thành tiền', key: 'thanhTien', width: 18 },
    { header: 'Công nợ đầu', key: 'congNoDau', width: 18 },
    { header: 'Còn lại phiếu trước', key: 'previousRemain', width: 20 },
    { header: 'Công nợ', key: 'congNo', width: 18 },
    { header: 'Thanh toán', key: 'thanhToan', width: 18 },
    { header: 'Còn lại', key: 'conLai', width: 18 },
    { header: 'Ghi chú', key: 'ghiChu', width: 30 },
  ];

  styleHeader(listSheet.getRow(1));

  rows.forEach((row) => {
    listSheet.addRow({
      ngay: parseDateValue(row.ngay),
      khachHang: `${row.customerCode} - ${row.customerName}`,
      soBo: row.soBo,
      soTo: row.soTo,
      doRong: row.doRong,
      doDay: row.doDay,
      doDai: row.doDai,
      soKhoi: row.soKhoi,
      donGia: row.donGia,
      thanhTien: row.thanhTien,
      congNoDau: row.congNoDau,
      previousRemain: row.previousRemain,
      congNo: row.congNo,
      thanhToan: row.thanhToan,
      conLai: row.conLai,
      ghiChu: row.ghiChu || '',
    });
  });

  listSheet.getColumn('ngay').numFmt = 'dd/mm/yyyy';
  ['doRong', 'doDay', 'doDai'].forEach((key) => {
    listSheet.getColumn(key).numFmt = '#,##0.00';
  });
  listSheet.getColumn('soKhoi').numFmt = '#,##0.000000';
  ['donGia', 'thanhTien', 'congNoDau', 'previousRemain', 'congNo', 'thanhToan', 'conLai'].forEach((key) => {
    listSheet.getColumn(key).numFmt = '#,##0 "₫"';
  });

  const summarySheet = workbook.addWorksheet('Tổng hợp bán hàng');
  summarySheet.columns = [
    { header: 'Khách hàng', key: 'customer', width: 28 },
    { header: 'Số phiếu', key: 'ticketCount', width: 12 },
    { header: 'Tổng thành tiền', key: 'totalAmount', width: 18 },
    { header: 'Tổng đã trả', key: 'totalPaid', width: 18 },
    { header: 'Tổng nợ', key: 'totalDebt', width: 18 },
  ];

  styleHeader(summarySheet.getRow(1));

  const summaryRows = groupByCustomer(rows);
  summaryRows.forEach((row) => {
    summarySheet.addRow(row);
  });

  ['totalAmount', 'totalPaid', 'totalDebt'].forEach((key) => {
    summarySheet.getColumn(key).numFmt = '#,##0 "₫"';
  });

  applyBorders(listSheet);
  applyBorders(summarySheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, buildFileName());
}