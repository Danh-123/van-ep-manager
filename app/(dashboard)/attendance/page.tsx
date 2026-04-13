'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AttendanceForm from '@/components/attendance/AttendanceForm';
import AttendanceRow, { type AttendanceRowData, type AttendanceStatus } from '@/components/attendance/AttendanceRow';

type AttendanceLoadResponse = {
  date: string;
  rows: AttendanceRowData[];
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
  const [rows, setRows] = useState<AttendanceRowData[]>([]);
  const [caoSuKg, setCaoSuKg] = useState('');
  const [donGiaCaoSu, setDonGiaCaoSu] = useState('');
  const [dieuKg, setDieuKg] = useState('');
  const [donGiaDieu, setDonGiaDieu] = useState('');
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

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          setRows([]);
          setError('Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.');
          setLoading(false);
          return;
        }

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

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        setError('Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.');
        setSaving(false);
        return;
      }

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
                rows.map((row) => <AttendanceRow key={row.congNhanId} row={row} onChangeStatus={updateStatus} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AttendanceForm
        caoSuKg={caoSuKg}
        setCaoSuKg={setCaoSuKg}
        donGiaCaoSu={donGiaCaoSu}
        setDonGiaCaoSu={setDonGiaCaoSu}
        dieuKg={dieuKg}
        setDieuKg={setDieuKg}
        donGiaDieu={donGiaDieu}
        setDonGiaDieu={setDonGiaDieu}
        tongLuongNgay={tongLuongNgay}
        soNguoiCoMat={soNguoiCoMat}
        luongMoiNguoi={luongMoiNguoi}
        formatMoney={formatMoney}
        parseNonNegative={parseNonNegative}
      />

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
