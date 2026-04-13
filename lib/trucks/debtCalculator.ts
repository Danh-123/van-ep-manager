export type DebtInputRow = {
  id: number;
  ngay: string;
  bienSo: string;
  soTan: number;
  donGia: number;
  congNoDau: number;
  thanhToan: number;
  khachHang: string;
  ghiChu: string;
};

export type DebtCalculatedRow = DebtInputRow & {
  thanhTien: number;
  congNo: number;
  conLai: number;
  formulaText: string;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

export function calculateDebt(rows: DebtInputRow[]): DebtCalculatedRow[] {
  let previousRemain = 0;

  return rows.map((row, index) => {
    const soTan = Math.max(0, toNumber(row.soTan));
    const donGia = Math.max(0, toNumber(row.donGia));
    const congNoDau = Math.max(0, toNumber(row.congNoDau));
    const thanhToan = Math.max(0, toNumber(row.thanhToan));

    const thanhTien = soTan * donGia;
    const congNo = congNoDau + thanhTien + previousRemain;
    const conLai = Math.max(0, congNo - thanhToan);

    const formulaText =
      index === 0 && congNoDau <= 0 && previousRemain <= 0
        ? `Công nợ = ${thanhTien.toLocaleString('vi-VN')} ₫ (phiếu đầu tiên)`
        : `Công nợ = ${congNoDau.toLocaleString('vi-VN')} + ${thanhTien.toLocaleString('vi-VN')} + ${previousRemain.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')} ₫`;

    previousRemain = conLai;

    return {
      ...row,
      congNoDau,
      soTan,
      donGia,
      thanhToan,
      thanhTien,
      congNo,
      conLai,
      formulaText,
    };
  });
}
