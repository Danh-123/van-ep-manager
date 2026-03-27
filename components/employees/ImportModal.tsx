'use client';

import * as Dialog from '@radix-ui/react-dialog';
import ExcelJS from 'exceljs';
import { Loader2, Upload, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { z } from 'zod';

import { importEmployees } from '@/app/(dashboard)/employees/actions';

const previewRowSchema = z.object({
  maCongNhan: z.string().trim().optional(),
  hoTen: z.string().trim().min(2, 'Họ tên bắt buộc'),
  soDienThoai: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{8,20}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  trangThai: z.enum(['DangLam', 'NghiViec']).optional(),
});

type ImportPreviewRow = z.infer<typeof previewRowSchema> & {
  rowNumber: number;
  error?: string;
};

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

function cellToString(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text?: string }).text ?? '').trim();
  }
  return String(value).trim();
}

function normalizeStatus(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return undefined;

  if (['danglam', 'dang lam', 'active', 'comat', 'co mat'].includes(text)) {
    return 'DangLam' as const;
  }

  if (['nghiviec', 'nghi viec', 'inactive', 'nghi'].includes(text)) {
    return 'NghiViec' as const;
  }

  return undefined;
}

export default function ImportModal({ open, onOpenChange, onImported }: ImportModalProps) {
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'update' | 'skip'>('update');
  const [isPending, startTransition] = useTransition();

  const validRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => row.error), [rows]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('Chỉ hỗ trợ file .xlsx hoặc .xls');
      setRows([]);
      return;
    }

    setSummary(null);
    setError(null);

    startTransition(async () => {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.worksheets[0];
        if (!sheet) {
          setError('Không tìm thấy worksheet trong file.');
          setRows([]);
          return;
        }

        const parsedRows: ImportPreviewRow[] = [];

        sheet.eachRow((row, index) => {
          if (index === 1) return;

          const maCongNhan = cellToString(row.getCell(1).value);
          const hoTen = cellToString(row.getCell(2).value);
          const soDienThoai = cellToString(row.getCell(3).value);
          const trangThaiText = cellToString(row.getCell(4).value);

          if (!maCongNhan && !hoTen && !soDienThoai && !trangThaiText) {
            return;
          }

          const normalized = {
            maCongNhan,
            hoTen,
            soDienThoai,
            trangThai: normalizeStatus(trangThaiText),
            rowNumber: index,
          };

          const validation = previewRowSchema.safeParse(normalized);
          parsedRows.push({
            ...normalized,
            error: validation.success ? undefined : validation.error.issues[0]?.message,
          });
        });

        setRows(parsedRows);
      } catch {
        setError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
        setRows([]);
      }
    });
  };

  const handleImport = () => {
    if (validRows.length === 0) {
      setError('Không có dòng hợp lệ để import.');
      return;
    }

    setError(null);
    setSummary(null);

    startTransition(async () => {
      const result = await importEmployees(
        validRows.map((row) => ({
          maCongNhan: row.maCongNhan,
          hoTen: row.hoTen,
          soDienThoai: row.soDienThoai,
          trangThai: row.trangThai,
        })),
        mode,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { inserted, updated, skipped, errors } = result.data;
      setSummary(`Import xong: thêm mới ${inserted}, cập nhật ${updated}, bỏ qua ${skipped}.`);

      if (errors.length > 0) {
        setError(`Có ${errors.length} dòng lỗi. Dòng đầu tiên: ${errors[0].row} - ${errors[0].message}`);
      }

      onImported();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Import Excel công nhân</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]">
                <Upload className="h-4 w-4" />
                Chọn file Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isPending}
                />
              </label>
              <p className="mt-2 text-xs text-slate-600">
                File mẫu: cột 1 Mã, cột 2 Họ tên, cột 3 Số điện thoại, cột 4 Trạng thái (DangLam/NghiViec).
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-700">
              <span className="font-medium">Khi trùng mã công nhân:</span>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === 'update'}
                  onChange={() => setMode('update')}
                  disabled={isPending}
                />
                Cập nhật
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === 'skip'}
                  onChange={() => setMode('skip')}
                  disabled={isPending}
                />
                Bỏ qua
              </label>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">Preview du lieu</span>
                <span className="text-slate-500">
                  Hợp lệ: {validRows.length} | Lỗi: {invalidRows.length}
                </span>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 font-medium">Dòng</th>
                      <th className="px-3 py-2 font-medium">Mã</th>
                      <th className="px-3 py-2 font-medium">Họ tên</th>
                      <th className="px-3 py-2 font-medium">Số điện thoại</th>
                      <th className="px-3 py-2 font-medium">Trạng thái</th>
                      <th className="px-3 py-2 font-medium">Kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-slate-500" colSpan={6}>
                          Chưa có dữ liệu preview.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.maCongNhan || '(auto)'}</td>
                          <td className="px-3 py-2">{row.hoTen}</td>
                          <td className="px-3 py-2">{row.soDienThoai || '-'}</td>
                          <td className="px-3 py-2">{row.trangThai || 'DangLam'}</td>
                          <td className={`px-3 py-2 text-xs ${row.error ? 'text-red-600' : 'text-emerald-700'}`}>
                            {row.error ?? 'Hợp lệ'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {summary && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{summary}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
              </Dialog.Close>

              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || validRows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận import
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
