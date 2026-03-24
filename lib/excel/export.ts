import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import type {
  AttendanceReportRow,
  DebtReportGroup,
  RevenueReportRow,
  SalaryReportRow,
} from '@/app/(dashboard)/reports/actions';

type DateRangeLabel = {
  startDate: string;
  endDate: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function setTitleRow(sheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { bold: true, size: 14 };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = subtitle;
  sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2F3E7' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

function addBorders(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, colCount: number) {
  for (let r = fromRow; r <= toRow; r += 1) {
    for (let c = 1; c <= colCount; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  }
}

function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  return workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  });
}

export async function exportAttendanceReport(
  rows: AttendanceReportRow[],
  range: DateRangeLabel,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BaoCaoChamCong');

  setTitleRow(sheet, 'BAO CAO CHAM CONG', `Tu ${range.startDate} den ${range.endDate}`);

  sheet.columns = [
    { header: 'Ngay', key: 'date', width: 16 },
    { header: 'So cong nhan di lam', key: 'present', width: 20 },
    { header: 'So nghi', key: 'absent', width: 12 },
    { header: 'Tong tien cong ngay', key: 'totalSalary', width: 22 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = sheet.columns.map((col) => col.header as string);
  styleHeaderRow(headerRow);

  rows.forEach((row) => {
    sheet.addRow({
      date: row.date,
      present: row.presentCount,
      absent: row.absentCount,
      totalSalary: Math.round(row.totalSalary),
    });
  });

  addBorders(sheet, 4, sheet.rowCount, 4);

  const summarySheet = workbook.addWorksheet('TongHop');
  summarySheet.columns = [
    { header: 'Chi so', key: 'metric', width: 28 },
    { header: 'Gia tri', key: 'value', width: 24 },
  ];
  summarySheet.addRow({ metric: 'Tong so ngay co du lieu', value: rows.length });
  summarySheet.addRow({
    metric: 'Tong tien cong',
    value: formatMoney(rows.reduce((sum, row) => sum + row.totalSalary, 0)),
  });
  styleHeaderRow(summarySheet.getRow(1));
  addBorders(summarySheet, 1, summarySheet.rowCount, 2);

  await downloadWorkbook(workbook, `bao-cao-cham-cong-${range.startDate}-${range.endDate}.xlsx`);
}

export async function exportSalaryReport(
  rows: SalaryReportRow[],
  monthlyTotals: Record<string, number>,
  range: DateRangeLabel,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BaoCaoLuong');

  setTitleRow(sheet, 'BAO CAO LUONG', `Tu ${range.startDate} den ${range.endDate}`);

  sheet.columns = [
    { header: 'Thang', key: 'month', width: 12 },
    { header: 'Cong nhan', key: 'worker', width: 28 },
    { header: 'Luong co ban', key: 'base', width: 18 },
    { header: 'Thuong', key: 'bonus', width: 16 },
    { header: 'Phat', key: 'penalty', width: 16 },
    { header: 'Tong luong', key: 'total', width: 18 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = sheet.columns.map((col) => col.header as string);
  styleHeaderRow(headerRow);

  rows.forEach((row) => {
    sheet.addRow({
      month: row.monthLabel,
      worker: row.workerName,
      base: Math.round(row.baseSalary),
      bonus: Math.round(row.bonus),
      penalty: Math.round(row.penalty),
      total: Math.round(row.totalSalary),
    });
  });

  addBorders(sheet, 4, sheet.rowCount, 6);

  const summarySheet = workbook.addWorksheet('TongHop');
  summarySheet.columns = [
    { header: 'Thang', key: 'month', width: 14 },
    { header: 'Tong luong thang', key: 'total', width: 22 },
  ];

  Object.entries(monthlyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([month, total]) => {
      summarySheet.addRow({
        month,
        total: formatMoney(total),
      });
    });

  styleHeaderRow(summarySheet.getRow(1));
  addBorders(summarySheet, 1, summarySheet.rowCount, 2);

  await downloadWorkbook(workbook, `bao-cao-luong-${range.startDate}-${range.endDate}.xlsx`);
}

export async function exportRevenueReport(
  rows: RevenueReportRow[],
  totals: { revenue: number; paid: number; debt: number },
  range: DateRangeLabel,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('BaoCaoDoanhThu');

  setTitleRow(sheet, 'BAO CAO DOANH THU', `Tu ${range.startDate} den ${range.endDate}`);

  sheet.columns = [
    { header: 'Ngay', key: 'date', width: 14 },
    { header: 'Xe so', key: 'truck', width: 16 },
    { header: 'Thanh tien', key: 'amount', width: 18 },
    { header: 'Da thu', key: 'paid', width: 18 },
    { header: 'Con no', key: 'debt', width: 18 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = sheet.columns.map((col) => col.header as string);
  styleHeaderRow(headerRow);

  rows.forEach((row) => {
    sheet.addRow({
      date: row.date,
      truck: row.truckNo,
      amount: Math.round(row.amount),
      paid: Math.round(row.paid),
      debt: Math.round(row.debt),
    });
  });

  addBorders(sheet, 4, sheet.rowCount, 5);

  const summarySheet = workbook.addWorksheet('TongHop');
  summarySheet.columns = [
    { header: 'Chi so', key: 'metric', width: 24 },
    { header: 'Gia tri', key: 'value', width: 24 },
  ];
  summarySheet.addRow({ metric: 'Tong doanh thu', value: formatMoney(totals.revenue) });
  summarySheet.addRow({ metric: 'Tong da thu', value: formatMoney(totals.paid) });
  summarySheet.addRow({ metric: 'Tong no', value: formatMoney(totals.debt) });
  styleHeaderRow(summarySheet.getRow(1));
  addBorders(summarySheet, 1, summarySheet.rowCount, 2);

  await downloadWorkbook(workbook, `bao-cao-doanh-thu-${range.startDate}-${range.endDate}.xlsx`);
}

export async function exportDebtReport(
  groups: DebtReportGroup[],
  totalDebt: number,
  range: DateRangeLabel,
) {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('TongHopCongNo');

  setTitleRow(summary, 'BAO CAO CONG NO', `Tu ${range.startDate} den ${range.endDate}`);

  summary.columns = [
    { header: 'Khach hang', key: 'customer', width: 28 },
    { header: 'Tong no', key: 'debt', width: 20 },
    { header: 'Qua han', key: 'overdue', width: 18 },
  ];

  const headerRow = summary.getRow(4);
  headerRow.values = summary.columns.map((col) => col.header as string);
  styleHeaderRow(headerRow);

  groups.forEach((group) => {
    summary.addRow({
      customer: group.customer,
      debt: Math.round(group.totalDebt),
      overdue: group.overdue ? 'Qua han >30 ngay' : 'Khong',
    });
  });

  const totalRow = summary.addRow({
    customer: 'Tong cong',
    debt: Math.round(totalDebt),
    overdue: '',
  });
  totalRow.font = { bold: true };

  addBorders(summary, 4, summary.rowCount, 3);

  const detail = workbook.addWorksheet('ChiTietPhieu');
  detail.columns = [
    { header: 'Khach hang', key: 'customer', width: 28 },
    { header: 'Ngay', key: 'date', width: 14 },
    { header: 'Xe so', key: 'truck', width: 14 },
    { header: 'Thanh tien', key: 'amount', width: 18 },
    { header: 'Da tra', key: 'paid', width: 18 },
    { header: 'Con no', key: 'debt', width: 18 },
    { header: 'Ngay thanh toan gan nhat', key: 'lastPaymentDate', width: 22 },
  ];

  styleHeaderRow(detail.getRow(1));

  groups.forEach((group) => {
    group.tickets.forEach((ticket) => {
      detail.addRow({
        customer: group.customer,
        date: ticket.date,
        truck: ticket.truckNo,
        amount: Math.round(ticket.amount),
        paid: Math.round(ticket.paid),
        debt: Math.round(ticket.debt),
        lastPaymentDate: ticket.lastPaymentDate ?? '',
      });
    });
  });

  addBorders(detail, 1, detail.rowCount, 7);

  await downloadWorkbook(workbook, `bao-cao-cong-no-${range.startDate}-${range.endDate}.xlsx`);
}
