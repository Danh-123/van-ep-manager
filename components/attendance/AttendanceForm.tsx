'use client';

type AttendanceFormProps = {
  caoSuKg: string;
  setCaoSuKg: (value: string) => void;
  donGiaCaoSu: string;
  setDonGiaCaoSu: (value: string) => void;
  dieuKg: string;
  setDieuKg: (value: string) => void;
  donGiaDieu: string;
  setDonGiaDieu: (value: string) => void;
  tongLuongNgay: number;
  soNguoiCoMat: number;
  luongMoiNguoi: number;
  formatMoney: (value: number) => string;
  parseNonNegative: (value: string) => number;
};

export default function AttendanceForm({
  caoSuKg,
  setCaoSuKg,
  donGiaCaoSu,
  setDonGiaCaoSu,
  dieuKg,
  setDieuKg,
  donGiaDieu,
  setDonGiaDieu,
  tongLuongNgay,
  soNguoiCoMat,
  luongMoiNguoi,
  formatMoney,
  parseNonNegative,
}: AttendanceFormProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Nhập sản lượng</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cao-su-kg">
            Cao su (kg)
          </label>
          <input
            id="cao-su-kg"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Nhập kg cao su"
            value={caoSuKg}
            onChange={(event) => setCaoSuKg(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="don-gia-cao-su">
            Đơn giá cao su
          </label>
          <input
            id="don-gia-cao-su"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Nhập đơn giá"
            value={donGiaCaoSu}
            onChange={(event) => setDonGiaCaoSu(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="dieu-kg">
            Điều (kg)
          </label>
          <input
            id="dieu-kg"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Nhập kg điều"
            value={dieuKg}
            onChange={(event) => setDieuKg(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="don-gia-dieu">
            Đơn giá điều
          </label>
          <input
            id="don-gia-dieu"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Nhập đơn giá"
            value={donGiaDieu}
            onChange={(event) => setDonGiaDieu(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4"
          />
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          Tổng lương = ({parseNonNegative(caoSuKg).toLocaleString('vi-VN')}kg × {formatMoney(parseNonNegative(donGiaCaoSu))}) + ({parseNonNegative(dieuKg).toLocaleString('vi-VN')}kg × {formatMoney(parseNonNegative(donGiaDieu))}) = <span className="font-semibold text-slate-900">{formatMoney(tongLuongNgay)}</span>
        </p>
        <p>
          Số người có mặt: <span className="font-semibold text-slate-900">{soNguoiCoMat}</span>
        </p>
        <p>
          Lương mỗi người: <span className="font-semibold text-slate-900">{formatMoney(luongMoiNguoi)}</span>
        </p>
      </div>
    </section>
  );
}
