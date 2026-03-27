import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type PersonalSalaryExportRow = {
  thang: string;
  luong_co_ban: number;
  thuong: number;
  phat: number;
  tong_luong: number;
};

export type PersonalSalaryEmployeeInfo = {
  ho_ten: string;
  ma_cong_nhan: string;
  so_dien_thoai: string;
  email: string;
  created_at: string;
};

type ExportPersonalSalaryInput = {
  rows: PersonalSalaryExportRow[];
  employee: PersonalSalaryEmployeeInfo;
  fileName: string;
};

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function applyFullBorder(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

export async function exportExcel({ rows, employee, fileName }: ExportPersonalSalaryInput) {
  const workbook = new ExcelJS.Workbook();

  const salarySheet = workbook.addWorksheet('Bang luong');
  salarySheet.columns = [
    { header: 'Thang', key: 'thang', width: 14 },
    { header: 'Luong co ban', key: 'luong_co_ban', width: 18 },
    { header: 'Thuong', key: 'thuong', width: 14 },
    { header: 'Phat', key: 'phat', width: 14 },
    { header: 'Tong luong', key: 'tong_luong', width: 18 },
  ];

  const salaryHeader = salarySheet.getRow(1);
  salaryHeader.font = { bold: true, color: { argb: 'FF1E293B' } };
  salaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  salaryHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  applyFullBorder(salaryHeader);

  rows.forEach((row) => {
    const excelRow = salarySheet.addRow({
      thang: row.thang,
      luong_co_ban: Math.round(row.luong_co_ban),
      thuong: Math.round(row.thuong),
      phat: Math.round(row.phat),
      tong_luong: Math.round(row.tong_luong),
    });
    applyFullBorder(excelRow);
  });

  const totals = rows.reduce(
    (acc, row) => ({
      luong_co_ban: acc.luong_co_ban + row.luong_co_ban,
      thuong: acc.thuong + row.thuong,
      phat: acc.phat + row.phat,
      tong_luong: acc.tong_luong + row.tong_luong,
    }),
    { luong_co_ban: 0, thuong: 0, phat: 0, tong_luong: 0 },
  );

  const totalRow = salarySheet.addRow({
    thang: 'Tong cong',
    luong_co_ban: Math.round(totals.luong_co_ban),
    thuong: Math.round(totals.thuong),
    phat: Math.round(totals.phat),
    tong_luong: Math.round(totals.tong_luong),
  });
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  applyFullBorder(totalRow);

  [2, 3, 4, 5].forEach((col) => {
    salarySheet.getColumn(col).numFmt = '#,##0 [$₫-vi-VN]';
  });

  const infoSheet = workbook.addWorksheet('Thong tin nhan vien');
  infoSheet.columns = [
    { header: 'Thong tin', key: 'label', width: 24 },
    { header: 'Gia tri', key: 'value', width: 40 },
  ];

  const infoHeader = infoSheet.getRow(1);
  infoHeader.values = ['Thong tin', 'Gia tri'];
  infoHeader.font = { bold: true, color: { argb: 'FF1E293B' } };
  infoHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  infoHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  });
  applyFullBorder(infoHeader);

  const infoRows: Array<{ label: string; value: string }> = [
    { label: 'Ho ten', value: employee.ho_ten || '-' },
    { label: 'Ma nhan vien', value: employee.ma_cong_nhan || '-' },
    { label: 'So dien thoai', value: employee.so_dien_thoai || '-' },
    { label: 'Email lien ket', value: employee.email || '-' },
    { label: 'Ngay tao', value: formatDate(employee.created_at) },
  ];

  infoRows.forEach((item) => {
    const row = infoSheet.addRow(item);
    applyFullBorder(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, fileName);
}
