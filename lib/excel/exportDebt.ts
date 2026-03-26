import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type DebtExportTicket = {
  id: number;
  customer: string;
  ngay: string;
  xeSo: string;
  thanhTien: number;
  daTra: number;
  conNo: number;
  createdAt?: string;
  lastPaymentDate?: string | null;
};

export type DebtExportGroup = {
  customer: string;
  totalDebt: number;
  tickets: DebtExportTicket[];
};

function buildFileName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `Cong_no_${yyyymmdd}_${hhmmss}.xlsx`;
}

function parseDateValue(value: string | null) {
  if (!value) return '';
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
      fgColor: { argb: 'FF1E3A8A' },
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

export async function exportDebtExcel(groups: DebtExportGroup[]) {
  const debtGroups = groups.filter((group) => group.totalDebt > 0);
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Tổng hợp công nợ');
  summarySheet.columns = [
    { header: 'Khách hàng', key: 'customer', width: 28 },
    { header: 'Số phiếu', key: 'ticketCount', width: 12 },
    { header: 'Tổng nợ', key: 'totalDebt', width: 18 },
  ];
  styleHeader(summarySheet.getRow(1));

  debtGroups.forEach((group) => {
    summarySheet.addRow({
      customer: group.customer,
      ticketCount: group.tickets.length,
      totalDebt: group.totalDebt,
    });
  });

  summarySheet.getColumn('totalDebt').numFmt = '#,##0 "₫"';

  const detailSheet = workbook.addWorksheet('Chi tiết công nợ');
  detailSheet.columns = [
    { header: 'Khách hàng', key: 'customer', width: 28 },
    { header: 'Ngày cân', key: 'ngay', width: 14 },
    { header: 'Xe số', key: 'xeSo', width: 16 },
    { header: 'Thành tiền', key: 'thanhTien', width: 18 },
    { header: 'Đã trả', key: 'daTra', width: 18 },
    { header: 'Còn nợ', key: 'conNo', width: 18 },
    { header: 'Ngày tạo phiếu', key: 'createdAt', width: 16 },
    { header: 'Ngày thanh toán gần nhất', key: 'lastPaymentDate', width: 24 },
  ];
  styleHeader(detailSheet.getRow(1));

  debtGroups.forEach((group) => {
    group.tickets.forEach((ticket) => {
      detailSheet.addRow({
        customer: group.customer,
        ngay: parseDateValue(ticket.ngay),
        xeSo: ticket.xeSo,
        thanhTien: ticket.thanhTien,
        daTra: ticket.daTra,
        conNo: ticket.conNo,
        createdAt: parseDateValue(ticket.createdAt ?? null),
        lastPaymentDate: parseDateValue(ticket.lastPaymentDate ?? null),
      });
    });
  });

  ['thanhTien', 'daTra', 'conNo'].forEach((key) => {
    detailSheet.getColumn(key).numFmt = '#,##0 "₫"';
  });
  ['ngay', 'createdAt', 'lastPaymentDate'].forEach((key) => {
    detailSheet.getColumn(key).numFmt = 'dd/mm/yyyy';
  });

  applyBorders(summarySheet);
  applyBorders(detailSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, buildFileName());
}
