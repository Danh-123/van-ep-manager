'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type AttendanceStatus = 'CoMat' | 'Nghi' | 'NghiPhep' | 'LamThem';

type WorkerAttendanceRow = {
  congNhanId: number;
  hoTen: string;
  status: AttendanceStatus;
};

type AttendanceLoadResponse = {
  date: string;
  rows: WorkerAttendanceRow[];
};

function todayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseNonNegative(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function isPresent(status: AttendanceStatus) {
  return status === 'CoMat' || status === 'LamThem';
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [rows, setRows] = useState<WorkerAttendanceRow[]>([]);
  const [caoSuKg, setCaoSuKg] = useState('0');
  const [donGiaCaoSu, setDonGiaCaoSu] = useState('0');
  const [dieuKg, setDieuKg] = useState('0');
  const [donGiaDieu, setDonGiaDieu] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/attendance?date=${selectedDate}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const data = (await response.json()) as
          | { success: true; data: AttendanceLoadResponse }
          | { success: false; error: string };

        if (!response.ok || !data.success) {
          setRows([]);
          setError(data.success ? 'Không thể tải dữ liệu chấm công.' : data.error);
          setLoading(false);
          return;
        }

        setRows(data.data.rows);
        setLoading(false);
      } catch {
        setRows([]);
        setError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
        setLoading(false);
      }
    };

    void load();
  }, [selectedDate]);

  const tongLuongNgay = useMemo(() => {
    const caoSuLuong = parseNonNegative(caoSuKg) * parseNonNegative(donGiaCaoSu);
    const dieuLuong = parseNonNegative(dieuKg) * parseNonNegative(donGiaDieu);
    return caoSuLuong + dieuLuong;
  }, [caoSuKg, donGiaCaoSu, dieuKg, donGiaDieu]);

  const soNguoiCoMat = useMemo(() => rows.filter((row) => isPresent(row.status)).length, [rows]);

  const luongMoiNguoi = useMemo(() => {
    if (soNguoiCoMat === 0) return 0;
    return tongLuongNgay / soNguoiCoMat;
  }, [tongLuongNgay, soNguoiCoMat]);

  const updateStatus = (congNhanId: number, status: AttendanceStatus) => {
    setRows((prev) => prev.map((row) => (row.congNhanId === congNhanId ? { ...row, status } : row)));
  };

  const validateBeforeSave = () => {
    if (!selectedDate) return 'Vui lòng chọn ngày chấm công.';
    if (rows.length === 0) return 'Không có công nhân để lưu chấm công.';
    if (parseNonNegative(caoSuKg) === 0 && parseNonNegative(dieuKg) === 0) {
      return 'Vui lòng nhập sản lượng cho ít nhất một loại.';
    }
    if (tongLuongNgay <= 0) return 'Tổng lương ngày phải lớn hơn 0.';
    if (soNguoiCoMat <= 0) return 'Phải có ít nhất 1 người Có mặt hoặc Làm thêm để chia lương.';
    return null;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          caoSuKg: parseNonNegative(caoSuKg),
          donGiaCaoSu: parseNonNegative(donGiaCaoSu),
          dieuKg: parseNonNegative(dieuKg),
          donGiaDieu: parseNonNegative(donGiaDieu),
          rows,
        }),
      });

      const data = (await response.json()) as
        | { success: true; data: { totalSalary: number; presentCount: number; salaryPerPerson: number } }
        | { success: false; error: string };

      if (!response.ok || !data.success) {
        setError(data.success ? 'Lưu chấm công thất bại.' : data.error);
        setSaving(false);
        return;
      }

      setSuccess(
        `Đã lưu chấm công thành công. Tổng lương: ${formatMoney(data.data.totalSalary)} | Số người có mặt: ${
          data.data.presentCount
        } | Lương mỗi người: ${formatMoney(data.data.salaryPerPerson)}.`,
      );
      setSaving(false);
    } catch {
      setError('Có lỗi kết nối khi lưu dữ liệu. Vui lòng thử lại.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Chấm công</h1>
        <p className="mt-1 text-sm text-slate-600">
          Giờ làm mặc định: <span className="font-semibold">07:00 - 19:00</span> (chỉ hiển thị, không cần nhập).
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="attendance-date">
          Chọn ngày
        </label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setSuccess(null);
            setError(null);
          }}
          className="h-10 w-full max-w-xs rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Danh sách công nhân</h2>
        <p className="mt-1 text-sm text-slate-600">Chỉ cần chọn trạng thái cho từng công nhân.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-3 font-medium">Họ tên</th>
                <th className="px-3 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td colSpan={2} className="px-3 py-3">
                      <div className="h-7 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-slate-500">
                    Không có công nhân trong hệ thống.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.congNhanId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 text-slate-800">{row.hoTen}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={row.status}
                        onChange={(event) => updateStatus(row.congNhanId, event.target.value as AttendanceStatus)}
                        className="h-10 w-full max-w-[220px] rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                      >
                        <option value="CoMat">Có mặt</option>
                        <option value="Nghi">Nghỉ</option>
                        <option value="NghiPhep">Nghỉ phép</option>
                        <option value="LamThem">Làm thêm</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
              value={caoSuKg}
              onChange={(event) => setCaoSuKg(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
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
              value={donGiaCaoSu}
              onChange={(event) => setDonGiaCaoSu(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
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
              value={dieuKg}
              onChange={(event) => setDieuKg(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
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
              value={donGiaDieu}
              onChange={(event) => setDonGiaDieu(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
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

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#2E7D32] px-5 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu chấm công
        </button>
      </section>
    </div>
  );
}
