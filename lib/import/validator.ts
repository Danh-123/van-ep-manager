import { z } from 'zod';

export const duplicateModeSchema = z.enum(['update', 'skip']);

export const attendanceImportRowSchema = z.object({
  date: z.string().trim().min(1, 'Ngay la bat buoc'),
  worker: z.string().trim().min(1, 'Cong nhan la bat buoc'),
  status: z.string().trim().min(1, 'Trang thai la bat buoc'),
  note: z.string().optional(),
});

export const ticketImportRowSchema = z.object({
  ticketNo: z.string().trim().optional(),
  date: z.string().trim().min(1, 'Ngay can la bat buoc'),
  truckNo: z.string().trim().min(1, 'Xe so la bat buoc'),
  customer: z.string().trim().min(1, 'Khach hang la bat buoc'),
  weightKg: z.union([z.string(), z.number()]),
  unitPrice: z.union([z.string(), z.number()]),
  woodType: z.string().trim().optional(),
  note: z.string().optional(),
});

export const salaryImportRowSchema = z.object({
  month: z.union([z.string(), z.number()]),
  year: z.union([z.string(), z.number()]),
  worker: z.string().trim().min(1, 'Cong nhan la bat buoc'),
  totalSalary: z.union([z.string(), z.number()]),
  paidSalary: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
});

export const debtImportRowSchema = z.object({
  ticketNo: z.string().trim().min(1, 'So phieu la bat buoc'),
  paymentDate: z.string().trim().min(1, 'Ngay thanh toan la bat buoc'),
  amount: z.union([z.string(), z.number()]),
  collector: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

export type ImportError = {
  row: number;
  message: string;
};

export type AttendanceValidatedRow = {
  row: number;
  ngay: string;
  congNhanId: number;
  workerName: string;
  status: 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';
  note: string;
};

export type TicketValidatedRow = {
  row: number;
  soPhieu: string | null;
  ngayCan: string;
  xeHangId: number;
  truckNo: string;
  khachHang: string;
  khoiLuongTan: number;
  donGiaApDung: number;
  thanhTien: number;
  loaiVanEpId: number;
  note: string;
};

export type SalaryValidatedRow = {
  row: number;
  thang: number;
  nam: number;
  congNhanId: number;
  workerName: string;
  tongTienCong: number;
  tongDaThanhToan: number;
  trangThai: 'ChuaChot' | 'DaChot' | 'DaThanhToanMotPhan' | 'DaThanhToanHet';
};

export type DebtValidatedRow = {
  row: number;
  soPhieu: string;
  phieuCanId: number;
  ngayThanhToan: string;
  soTien: number;
  nguoiThu: string;
  phuongThuc: 'TienMat' | 'ChuyenKhoan' | 'Khac';
  ghiChu: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function parseNumber(value: string | number | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;

  const cleaned = value.trim().replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return NaN;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function excelSerialToDate(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

export function normalizeDateInput(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = excelSerialToDate(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const slashMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const dd = Number(slashMatch[1]);
    const mm = Number(slashMatch[2]);
    const yyyy = Number(slashMatch[3]);
    const date = new Date(yyyy, mm - 1, dd);
    if (
      date.getFullYear() === yyyy &&
      date.getMonth() === mm - 1 &&
      date.getDate() === dd
    ) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function normalizeAttendanceStatus(value: string) {
  const text = normalizeText(value);

  if (['comat', 'present', 'dilam', 'lam'].includes(text)) return 'CoMat' as const;
  if (['nghi', 'absent', 'vang'].includes(text)) return 'Nghi' as const;
  if (['nghiphep', 'phep', 'leave'].includes(text)) return 'NghiPhep' as const;
  if (['lamthem', 'ot', 'overtime'].includes(text)) return 'LamThem' as const;

  return null;
}

export function normalizeSalaryStatus(value?: string) {
  const text = normalizeText(value ?? '');
  if (!text) return 'ChuaChot' as const;
  if (['chuachot', 'open'].includes(text)) return 'ChuaChot' as const;
  if (['dachot', 'closed'].includes(text)) return 'DaChot' as const;
  if (['dathanhtoanmotphan', 'partialpaid'].includes(text)) return 'DaThanhToanMotPhan' as const;
  if (['dathanhtoanhet', 'paidfull', 'paid'].includes(text)) return 'DaThanhToanHet' as const;
  return null;
}

export function normalizePaymentMethod(value?: string) {
  const text = normalizeText(value ?? '');
  if (!text) return 'TienMat' as const;
  if (['tienmat', 'cash'].includes(text)) return 'TienMat' as const;
  if (['chuyenkhoan', 'bank', 'banking'].includes(text)) return 'ChuyenKhoan' as const;
  if (['khac', 'other'].includes(text)) return 'Khac' as const;
  return null;
}

export function buildWorkerLookup(
  workers: Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>,
) {
  const byCode = new Map<string, { id: number; name: string }>();
  const byName = new Map<string, { id: number; name: string }>();

  workers.forEach((worker) => {
    byCode.set(normalizeText(worker.ma_cong_nhan), { id: worker.id, name: worker.ho_ten });
    byName.set(normalizeText(worker.ho_ten), { id: worker.id, name: worker.ho_ten });
  });

  return {
    resolve(input: string) {
      const key = normalizeText(input);
      return byCode.get(key) ?? byName.get(key) ?? null;
    },
  };
}

export function validateAttendanceRows(
  rows: Array<z.input<typeof attendanceImportRowSchema>>,
  workers: Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>,
) {
  const workerLookup = buildWorkerLookup(workers);
  const errors: ImportError[] = [];
  const validRows: AttendanceValidatedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = attendanceImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' });
      return;
    }

    const payload = parsed.data;
    const ngay = normalizeDateInput(payload.date);
    if (!ngay) {
      errors.push({ row: index + 1, message: 'Ngay khong hop le' });
      return;
    }

    const worker = workerLookup.resolve(payload.worker);
    if (!worker) {
      errors.push({ row: index + 1, message: `Khong tim thay cong nhan: ${payload.worker}` });
      return;
    }

    const status = normalizeAttendanceStatus(payload.status);
    if (!status) {
      errors.push({ row: index + 1, message: `Trang thai khong hop le: ${payload.status}` });
      return;
    }

    validRows.push({
      row: index + 1,
      ngay,
      congNhanId: worker.id,
      workerName: worker.name,
      status,
      note: payload.note?.trim() ?? '',
    });
  });

  return { validRows, errors };
}

export function validateTicketRows(
  rows: Array<z.input<typeof ticketImportRowSchema>>,
  trucks: Array<{ id: number; bien_so: string }>,
  defaultWoodTypeId: number,
) {
  const truckMap = new Map<string, { id: number; bienSo: string }>();
  trucks.forEach((truck) => {
    truckMap.set(normalizeText(truck.bien_so), { id: truck.id, bienSo: truck.bien_so });
  });

  const errors: ImportError[] = [];
  const validRows: TicketValidatedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = ticketImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' });
      return;
    }

    const payload = parsed.data;
    const ngayCan = normalizeDateInput(payload.date);
    if (!ngayCan) {
      errors.push({ row: index + 1, message: 'Ngay can khong hop le' });
      return;
    }

    const truck = truckMap.get(normalizeText(payload.truckNo));
    if (!truck) {
      errors.push({ row: index + 1, message: `Khong tim thay xe so: ${payload.truckNo}` });
      return;
    }

    const khoiLuongKg = parseNumber(payload.weightKg);
    if (!Number.isFinite(khoiLuongKg) || khoiLuongKg <= 0) {
      errors.push({ row: index + 1, message: 'Trong luong phai > 0' });
      return;
    }

    const donGiaApDung = parseNumber(payload.unitPrice);
    if (!Number.isFinite(donGiaApDung) || donGiaApDung <= 0) {
      errors.push({ row: index + 1, message: 'Don gia phai > 0' });
      return;
    }

    validRows.push({
      row: index + 1,
      soPhieu: payload.ticketNo?.trim() || null,
      ngayCan,
      xeHangId: truck.id,
      truckNo: truck.bienSo,
      khachHang: payload.customer.trim(),
      khoiLuongTan: khoiLuongKg / 1000,
      donGiaApDung,
      thanhTien: (khoiLuongKg / 1000) * donGiaApDung,
      loaiVanEpId: defaultWoodTypeId,
      note: payload.note?.trim() ?? '',
    });
  });

  return { validRows, errors };
}

export function validateSalaryRows(
  rows: Array<z.input<typeof salaryImportRowSchema>>,
  workers: Array<{ id: number; ma_cong_nhan: string; ho_ten: string }>,
) {
  const workerLookup = buildWorkerLookup(workers);
  const errors: ImportError[] = [];
  const validRows: SalaryValidatedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = salaryImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' });
      return;
    }

    const payload = parsed.data;

    const thang = Math.trunc(parseNumber(payload.month));
    const nam = Math.trunc(parseNumber(payload.year));

    if (!Number.isFinite(thang) || thang < 1 || thang > 12) {
      errors.push({ row: index + 1, message: 'Thang khong hop le' });
      return;
    }

    if (!Number.isFinite(nam) || nam < 2000 || nam > 2100) {
      errors.push({ row: index + 1, message: 'Nam khong hop le' });
      return;
    }

    const worker = workerLookup.resolve(payload.worker);
    if (!worker) {
      errors.push({ row: index + 1, message: `Khong tim thay cong nhan: ${payload.worker}` });
      return;
    }

    const tongTienCong = parseNumber(payload.totalSalary);
    if (!Number.isFinite(tongTienCong) || tongTienCong < 0) {
      errors.push({ row: index + 1, message: 'Tong luong khong hop le' });
      return;
    }

    const tongDaThanhToan = parseNumber(payload.paidSalary ?? 0);
    if (!Number.isFinite(tongDaThanhToan) || tongDaThanhToan < 0 || tongDaThanhToan > tongTienCong) {
      errors.push({ row: index + 1, message: 'Tong da thanh toan khong hop le' });
      return;
    }

    const trangThai = normalizeSalaryStatus(payload.status);
    if (!trangThai) {
      errors.push({ row: index + 1, message: `Trang thai luong khong hop le: ${payload.status}` });
      return;
    }

    validRows.push({
      row: index + 1,
      thang,
      nam,
      congNhanId: worker.id,
      workerName: worker.name,
      tongTienCong,
      tongDaThanhToan,
      trangThai,
    });
  });

  return { validRows, errors };
}

export function validateDebtRows(
  rows: Array<z.input<typeof debtImportRowSchema>>,
  tickets: Array<{ id: number; so_phieu: string }>,
) {
  const ticketMap = new Map<string, { id: number; soPhieu: string }>();
  tickets.forEach((ticket) => {
    ticketMap.set(normalizeText(ticket.so_phieu), { id: ticket.id, soPhieu: ticket.so_phieu });
  });

  const errors: ImportError[] = [];
  const validRows: DebtValidatedRow[] = [];

  rows.forEach((row, index) => {
    const parsed = debtImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues[0]?.message ?? 'Du lieu khong hop le' });
      return;
    }

    const payload = parsed.data;
    const ticket = ticketMap.get(normalizeText(payload.ticketNo));
    if (!ticket) {
      errors.push({ row: index + 1, message: `Khong tim thay so phieu: ${payload.ticketNo}` });
      return;
    }

    const ngayThanhToan = normalizeDateInput(payload.paymentDate);
    if (!ngayThanhToan) {
      errors.push({ row: index + 1, message: 'Ngay thanh toan khong hop le' });
      return;
    }

    const soTien = parseNumber(payload.amount);
    if (!Number.isFinite(soTien) || soTien <= 0) {
      errors.push({ row: index + 1, message: 'So tien thanh toan phai > 0' });
      return;
    }

    const phuongThuc = normalizePaymentMethod(payload.method);
    if (!phuongThuc) {
      errors.push({ row: index + 1, message: `Phuong thuc khong hop le: ${payload.method}` });
      return;
    }

    validRows.push({
      row: index + 1,
      soPhieu: ticket.soPhieu,
      phieuCanId: ticket.id,
      ngayThanhToan,
      soTien,
      nguoiThu: payload.collector?.trim() || 'Import',
      phuongThuc,
      ghiChu: payload.note?.trim() || 'Import tu file cu',
    });
  });

  return { validRows, errors };
}
