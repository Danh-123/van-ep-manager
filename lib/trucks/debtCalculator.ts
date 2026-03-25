export type DebtInputRow = {
  id: number;
  ngay: string;
  bienSo: string;
  soTan: number;
  donGia: number;
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
    const thanhToan = Math.max(0, toNumber(row.thanhToan));

    const thanhTien = soTan * donGia;
    const congNo = thanhTien + previousRemain;
    const conLai = Math.max(0, congNo - thanhToan);

    const formulaText =
      index === 0
        ? `Công nợ = ${congNo.toLocaleString('vi-VN')} ₫ (phiếu đầu tiên)`
        : `Công nợ = ${thanhTien.toLocaleString('vi-VN')} + ${previousRemain.toLocaleString('vi-VN')} = ${congNo.toLocaleString('vi-VN')} ₫`;

    previousRemain = conLai;

    return {
      ...row,
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
