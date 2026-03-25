'use client';

import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMounted } from '@/hooks/useMounted';
import type { DebtCalculatedRow } from '@/lib/trucks/debtCalculator';

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: DebtCalculatedRow[];
};

type TicketForm = {
  bienSo: string;
  soTan: string;
  donGia: string;
  thanhToan: string;
  khachHang: string;
  ghiChu: string;
};

const defaultForm: TicketForm = {
  bienSo: '',
  soTan: '',
  donGia: '',
  thanhToan: '',
  khachHang: '',
  ghiChu: '',
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export default function TrucksPage() {
  const mounted = useMounted();
  const [rows, setRows] = useState<DebtCalculatedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<TicketForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TicketForm>(defaultForm);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/trucks', { cache: 'no-store' });
      const json = (await response.json()) as ApiResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tải danh sách phiếu cân');
      }

      setRows(json.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách phiếu cân');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadRows();
  }, [mounted, loadRows]);

  const totalRemain = useMemo(() => rows.reduce((sum, row) => sum + row.conLai, 0), [rows]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bienSo: form.bienSo,
          soTan: Number(form.soTan),
          donGia: Number(form.donGia),
          thanhToan: Number(form.thanhToan || 0),
          khachHang: form.khachHang,
          ghiChu: form.ghiChu,
        }),
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tạo phiếu cân');
      }

      setRows(json.data);
      setForm(defaultForm);
      setSuccess('Đã thêm phiếu cân và cập nhật công nợ lũy kế.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const accepted = window.confirm('Bạn có chắc muốn xóa phiếu này? Công nợ các dòng sau sẽ tự tính lại.');
    if (!accepted) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trucks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể xóa phiếu cân');
      }

      setRows(json.data);
      if (editingId === id) {
        setEditingId(null);
        setEditForm(defaultForm);
      }
      setSuccess('Đã xóa phiếu và tính lại công nợ các dòng phía dưới.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (row: DebtCalculatedRow) => {
    setEditingId(row.id);
    setEditForm({
      bienSo: row.bienSo,
      soTan: String(row.soTan),
      donGia: String(row.donGia),
      thanhToan: String(row.thanhToan),
      khachHang: row.khachHang,
      ghiChu: row.ghiChu,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultForm);
  };

  const saveEdit = async (id: number) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trucks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          bienSo: editForm.bienSo,
          soTan: Number(editForm.soTan),
          donGia: Number(editForm.donGia),
          thanhToan: Number(editForm.thanhToan || 0),
          khachHang: editForm.khachHang,
          ghiChu: editForm.ghiChu,
        }),
      });

      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể cập nhật phiếu cân');
      }

      setRows(json.data);
      setEditingId(null);
      setEditForm(defaultForm);
      setSuccess('Đã lưu thay đổi và tính lại toàn bộ công nợ.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật phiếu cân');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Quản lý xe hàng và phiếu cân</h1>
        <p className="mt-1 text-sm text-slate-600">
          Công nợ được tính lũy kế theo công thức: dòng sau = Thành tiền hiện tại + Còn lại của dòng trước.
        </p>
      </section>

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Thêm phiếu mới</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            type="text"
            placeholder="Biển số"
            value={form.bienSo}
            onChange={(event) => setForm((prev) => ({ ...prev, bienSo: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Số tấn"
            value={form.soTan}
            onChange={(event) => setForm((prev) => ({ ...prev, soTan: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            required
          />
          <input
            type="number"
            step="1000"
            min="0"
            placeholder="Đơn giá"
            value={form.donGia}
            onChange={(event) => setForm((prev) => ({ ...prev, donGia: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            required
          />
          <input
            type="number"
            step="1000"
            min="0"
            placeholder="Thanh toán"
            value={form.thanhToan}
            onChange={(event) => setForm((prev) => ({ ...prev, thanhToan: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
          <input
            type="text"
            placeholder="Khách hàng"
            value={form.khachHang}
            onChange={(event) => setForm((prev) => ({ ...prev, khachHang: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
            required
          />
          <input
            type="text"
            placeholder="Ghi chú"
            value={form.ghiChu}
            onChange={(event) => setForm((prev) => ({ ...prev, ghiChu: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#0B7285]/30 focus:border-[#0B7285] focus:ring-4"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#0B7285] px-4 py-2 text-sm font-medium text-white hover:bg-[#095C6D] disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : 'Thêm phiếu'}
          </button>
          <span className="text-sm text-slate-600">Ngày tạo: {format(new Date(), 'dd/MM/yyyy')}</span>
        </div>
      </form>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          Tổng nợ còn lại: <span className="font-semibold text-red-700">{formatCurrency(totalRemain)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1320px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Biển số</th>
                <th className="px-3 py-2">Số tấn</th>
                <th className="px-3 py-2">Đơn giá</th>
                <th className="px-3 py-2">Thành tiền</th>
                <th className="px-3 py-2">Công nợ</th>
                <th className="px-3 py-2">Thanh toán</th>
                <th className="px-3 py-2">Còn lại</th>
                <th className="px-3 py-2">Công thức tính</th>
                <th className="px-3 py-2">Khách hàng</th>
                <th className="px-3 py-2">Ghi chú</th>
                <th className="px-3 py-2">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    Chưa có phiếu cân nào.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => {
                  const isEditing = editingId === row.id;

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-3 py-3 text-slate-700">{format(new Date(row.ngay), 'dd/MM/yyyy')}</td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.bienSo}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, bienSo: event.target.value }))}
                            className="h-9 w-28 rounded border border-slate-200 px-2"
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{row.bienSo}</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.soTan}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, soTan: event.target.value }))}
                            className="h-9 w-24 rounded border border-slate-200 px-2"
                          />
                        ) : (
                          <span className="text-slate-700">{row.soTan.toLocaleString('vi-VN')}</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={editForm.donGia}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, donGia: event.target.value }))}
                            className="h-9 w-28 rounded border border-slate-200 px-2"
                          />
                        ) : (
                          <span className="text-slate-700">{formatCurrency(row.donGia)}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-semibold text-emerald-700">{formatCurrency(row.thanhTien)}</td>

                      <td className="px-3 py-3 font-semibold text-amber-700">{formatCurrency(row.congNo)}</td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={editForm.thanhToan}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, thanhToan: event.target.value }))}
                            className="h-9 w-28 rounded border border-slate-200 px-2 text-blue-700"
                          />
                        ) : (
                          <span className="font-semibold text-blue-700">{formatCurrency(row.thanhToan)}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-semibold text-red-700">{formatCurrency(row.conLai)}</td>

                      <td className="max-w-xs px-3 py-3 text-xs text-slate-600">{row.formulaText}</td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.khachHang}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, khachHang: event.target.value }))}
                            className="h-9 w-36 rounded border border-slate-200 px-2"
                          />
                        ) : (
                          <span className="text-slate-700">{row.khachHang}</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.ghiChu}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, ghiChu: event.target.value }))}
                            className="h-9 w-40 rounded border border-slate-200 px-2"
                          />
                        ) : (
                          <span className="text-slate-600">{row.ghiChu || '-'}</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit(row.id)}
                              disabled={submitting}
                              className="rounded bg-[#0B7285] px-2 py-1 text-xs text-white hover:bg-[#095C6D] disabled:opacity-60"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              disabled={submitting}
                              className="rounded border border-[#0B7285] px-2 py-1 text-xs text-[#0B7285] hover:bg-[#0B7285]/10"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(row.id)}
                              disabled={submitting}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
