'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  importCustomers,
  updateCustomer,
  type CustomerItem,
} from '@/app/(dashboard)/employees/customer-actions';

type CustomerFormValues = {
  maKhachHang: string;
  tenKhachHang: string;
  soDienThoai: string;
  diaChi: string;
};

type ImportPreviewRow = {
  rowNumber: number;
  maKhachHang: string;
  tenKhachHang: string;
  soDienThoai: string;
  diaChi: string;
  error?: string;
};

const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('vi-VN');
}

function cellToString(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text?: string }).text ?? '').trim();
  }
  return String(value).trim();
}

function validatePreviewRow(row: ImportPreviewRow) {
  if (!row.tenKhachHang.trim() || row.tenKhachHang.trim().length < 2) {
    return 'Tên khách hàng bắt buộc và tối thiểu 2 ký tự';
  }

  if (row.soDienThoai.trim() && !/^[0-9+\-() ]{8,20}$/.test(row.soDienThoai.trim())) {
    return 'Số điện thoại không hợp lệ';
  }

  return undefined;
}

export default function CustomerTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formValues, setFormValues] = useState<CustomerFormValues>({
    maKhachHang: '',
    tenKhachHang: '',
    soDienThoai: '',
    diaChi: '',
  });

  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importMode, setImportMode] = useState<'update' | 'skip'>('update');

  const customersQuery = useQuery({
    queryKey: ['customers', page, keyword],
    queryFn: async () => {
      const result = await getCustomers({
        page,
        pageSize: PAGE_SIZE,
        search: keyword.trim(),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 60_000,
  });

  const rows = customersQuery.data?.items ?? [];
  const total = customersQuery.data?.total ?? 0;
  const totalPages = customersQuery.data?.totalPages ?? 1;
  const loading = customersQuery.isLoading || customersQuery.isFetching;

  const validImportRows = useMemo(() => importRows.filter((row) => !row.error), [importRows]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormValues({ maKhachHang: '', tenKhachHang: '', soDienThoai: '', diaChi: '' });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const openEditModal = (item: CustomerItem) => {
    setEditingCustomer(item);
    setFormValues({
      maKhachHang: item.maKhachHang,
      tenKhachHang: item.tenKhachHang,
      soDienThoai: item.soDienThoai ?? '',
      diaChi: item.diaChi ?? '',
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const refreshCustomers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const handleSubmitCustomer = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const payload = {
        maKhachHang: formValues.maKhachHang,
        tenKhachHang: formValues.tenKhachHang,
        soDienThoai: formValues.soDienThoai,
        diaChi: formValues.diaChi,
      };

      const result = editingCustomer
        ? await updateCustomer({
            id: editingCustomer.id,
            ...payload,
          })
        : await createCustomer(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setModalOpen(false);
      setSuccess(editingCustomer ? 'Cập nhật khách hàng thành công.' : 'Thêm khách hàng thành công.');
      await refreshCustomers();
    });
  };

  const handleDelete = (item: CustomerItem) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa khách hàng ${item.tenKhachHang}? Hành động này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await deleteCustomer(item.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess('Xóa khách hàng thành công.');
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await refreshCustomers();
    });
  };

  const handleExportExcel = () => {
    setError(null);

    startTransition(async () => {
      const result = await getCustomers({
        page: 1,
        pageSize: 5000,
        search: keyword.trim(),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('KhachHang');

      worksheet.columns = [
        { header: 'Ma KH', key: 'maKhachHang', width: 16 },
        { header: 'Tên khách hàng', key: 'tenKhachHang', width: 30 },
        { header: 'Số điện thoại', key: 'soDienThoai', width: 18 },
        { header: 'Địa chỉ', key: 'diaChi', width: 40 },
        { header: 'Ngày tạo', key: 'createdAt', width: 16 },
      ];

      result.data.items.forEach((row) => {
        worksheet.addRow({
          maKhachHang: row.maKhachHang,
          tenKhachHang: row.tenKhachHang,
          soDienThoai: row.soDienThoai ?? '',
          diaChi: row.diaChi ?? '',
          createdAt: formatDate(row.createdAt),
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `khach-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.worksheets[0];
        if (!sheet) {
          setError('Không tìm thấy worksheet trong file.');
          setImportRows([]);
          return;
        }

        const parsedRows: ImportPreviewRow[] = [];

        sheet.eachRow((row, index) => {
          if (index === 1) return;

          const maKhachHang = cellToString(row.getCell(1).value);
          const tenKhachHang = cellToString(row.getCell(2).value);
          const soDienThoai = cellToString(row.getCell(3).value);
          const diaChi = cellToString(row.getCell(4).value);

          if (!maKhachHang && !tenKhachHang && !soDienThoai && !diaChi) {
            return;
          }

          const previewRow: ImportPreviewRow = {
            rowNumber: index,
            maKhachHang,
            tenKhachHang,
            soDienThoai,
            diaChi,
          };

          previewRow.error = validatePreviewRow(previewRow);
          parsedRows.push(previewRow);
        });

        setImportRows(parsedRows);
      } catch {
        setError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
        setImportRows([]);
      }
    });
  };

  const handleConfirmImport = () => {
    if (validImportRows.length === 0) {
      setError('Không có dòng hợp lệ để import.');
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await importCustomers(
        validImportRows.map((row) => ({
          maKhachHang: row.maKhachHang,
          tenKhachHang: row.tenKhachHang,
          soDienThoai: row.soDienThoai,
          diaChi: row.diaChi,
        })),
        importMode,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { inserted, updated, skipped, errors } = result.data;
      setSuccess(`Import xong: thêm mới ${inserted}, cập nhật ${updated}, bỏ qua ${skipped}.`);
      if (errors.length > 0) {
        setError(`Có ${errors.length} dòng lỗi. Dòng đầu tiên: ${errors[0].row} - ${errors[0].message}`);
      }

      setImportRows([]);
      await refreshCustomers();
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Danh sách khách hàng</h2>
          <p className="mt-1 text-sm text-slate-600">{total} khách hàng</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50">
            <Upload className="h-4 w-4" />
            Import Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất Excel
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
          >
            <Plus className="h-4 w-4" />
            Thêm khách hàng
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã, tên hoặc số điện thoại..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              setKeyword(search);
            }}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Tìm kiếm
          </button>
        </div>
      </section>

      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {customersQuery.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(customersQuery.error as Error).message}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-4 py-3 font-medium">STT</th>
                <th className="px-4 py-3 font-medium">Ma KH</th>
                <th className="px-4 py-3 font-medium">Tên khách hàng</th>
                <th className="px-4 py-3 font-medium">SĐT</th>
                <th className="px-4 py-3 font-medium">Địa chỉ</th>
                <th className="px-4 py-3 text-right font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    Chưa có dữ liệu khách hàng.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.maKhachHang}</td>
                    <td className="px-4 py-3">{row.tenKhachHang}</td>
                    <td className="px-4 py-3">{row.soDienThoai ?? '-'}</td>
                    <td className="px-4 py-3">{row.diaChi ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Hiển thị {(rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1)}-
            {(page - 1) * PAGE_SIZE + rows.length} / {total}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              Trang {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Preview import</h3>
          <div className="flex items-center gap-4 text-sm text-slate-700">
        <span>Hợp lệ: {validImportRows.length}</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={importMode === 'update'}
                onChange={() => setImportMode('update')}
              />
              Cập nhật
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={importMode === 'skip'}
                onChange={() => setImportMode('skip')}
              />
              Bỏ qua
            </label>
          </div>
        </div>

        <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-3 py-2 font-medium">Dòng</th>
                <th className="px-3 py-2 font-medium">Ma KH</th>
                <th className="px-3 py-2 font-medium">Tên</th>
                <th className="px-3 py-2 font-medium">SDT</th>
                <th className="px-3 py-2 font-medium">Địa chỉ</th>
                <th className="px-3 py-2 font-medium">Kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              {importRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Chưa có dữ liệu import.
                  </td>
                </tr>
              ) : (
                importRows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.maKhachHang || '(auto)'}</td>
                    <td className="px-3 py-2">{row.tenKhachHang}</td>
                    <td className="px-3 py-2">{row.soDienThoai || '-'}</td>
                    <td className="px-3 py-2">{row.diaChi || '-'}</td>
                    <td className={`px-3 py-2 ${row.error ? 'text-red-600' : 'text-emerald-700'}`}>
                      {row.error ?? 'Hợp lệ'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isPending || validImportRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận import
          </button>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 p-4">
          <div className="mx-auto mt-12 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ma KH</label>
                <input
                  value={formValues.maKhachHang}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, maKhachHang: event.target.value }))}
                  placeholder="Để trống để tự động sinh"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tên khách hàng *</label>
                <input
                  value={formValues.tenKhachHang}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, tenKhachHang: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">SDT</label>
                <input
                  value={formValues.soDienThoai}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, soDienThoai: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ</label>
                <textarea
                  value={formValues.diaChi}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, diaChi: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitCustomer}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
