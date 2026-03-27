'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Loader2, Plus, Search, Upload } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import {
  deleteEmployee,
  getEmployees,
  type EmployeeItem,
} from '@/app/(dashboard)/employees/actions';

import EmployeeForm from '@/components/employees/EmployeeForm';
import LinkUserModal from '@/components/employees/LinkUserModal';
import EmployeeTable from '@/components/employees/EmployeeTable';
import ImportModal from '@/components/employees/ImportModal';

const filterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['TatCa', 'DangLam', 'NghiViec']),
});

type FilterValues = z.infer<typeof filterSchema>;

const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('vi-VN');
}

export default function EmployeeTab() {
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: '',
      status: 'TatCa',
    },
  });

  const watchedStatus = watch('status');
  const watchedSearch = watch('search');

  const employeesQuery = useQuery({
    queryKey: ['employees', page, watchedSearch ?? '', watchedStatus],
    queryFn: async () => {
      const result = await getEmployees({
        page,
        pageSize: PAGE_SIZE,
        search: watchedSearch?.trim(),
        status: watchedStatus,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 60_000,
  });

  const rows = employeesQuery.data?.items ?? [];
  const total = employeesQuery.data?.total ?? 0;
  const totalPages = employeesQuery.data?.totalPages ?? 1;
  const loading = employeesQuery.isLoading || employeesQuery.isFetching;

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const handleDelete = (item: EmployeeItem) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa công nhân ${item.hoTen}? Hành động này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteEmployee(item.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    });
  };

  const handleExportExcel = () => {
    startTransition(async () => {
      const result = await getEmployees({
        page: 1,
        pageSize: 1000,
        search: watchedSearch?.trim(),
        status: watchedStatus,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('CongNhan');

      worksheet.columns = [
        { header: 'Mã công nhân', key: 'maCongNhan', width: 18 },
        { header: 'Họ tên', key: 'hoTen', width: 30 },
        { header: 'Số điện thoại', key: 'soDienThoai', width: 18 },
        { header: 'Tài khoản liên kết', key: 'linkedEmail', width: 30 },
        { header: 'Trạng thái', key: 'trangThai', width: 14 },
        { header: 'Ngày tạo', key: 'createdAt', width: 16 },
      ];

      result.data.items.forEach((row) => {
        worksheet.addRow({
          maCongNhan: row.maCongNhan,
          hoTen: row.hoTen,
          soDienThoai: row.soDienThoai ?? '',
          linkedEmail: row.linkedUserEmail ?? '',
          trangThai: row.trangThai,
          createdAt: formatDate(row.createdAt),
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `cong-nhan-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  const totalDisplay = useMemo(() => `${total} công nhân`, [total]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Danh sách công nhân</h2>
          <p className="mt-1 text-sm text-slate-600">{totalDisplay}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-[#1B5E20] hover:bg-emerald-50"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>

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
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20]"
          >
            <Plus className="h-4 w-4" />
            Thêm công nhân
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]"
          onSubmit={handleSubmit(async () => {
            setPage(1);
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
          })}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Tim theo ten cong nhan..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
              {...register('search')}
            />
          </div>

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
            {...register('status')}
          >
            <option value="TatCa">Tất cả trạng thái</option>
            <option value="DangLam">Đang làm</option>
            <option value="NghiViec">Nghỉ việc</option>
          </select>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              reset({ search: '', status: 'TatCa' });
              setPage(1);
              void queryClient.invalidateQueries({ queryKey: ['employees'] });
            }}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Xóa lọc
          </button>
        </form>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {employeesQuery.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(employeesQuery.error as Error).message}
        </p>
      )}

      <EmployeeTable
        rows={rows}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        loading={loading || isPending}
        onPageChange={handlePageChange}
        onLink={(item) => {
          setSelectedEmployee(item);
          setLinkOpen(true);
        }}
        onUnlink={(item) => {
          setSelectedEmployee(item);
          setUnlinkOpen(true);
        }}
        onEdit={(item) => {
          setSelectedEmployee(item);
          setEditOpen(true);
        }}
        onDelete={handleDelete}
      />

      <EmployeeForm
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => void queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />

      <EmployeeForm
        mode="edit"
        open={editOpen}
        employee={selectedEmployee}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
        onSuccess={() => void queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          setPage(1);
          void queryClient.invalidateQueries({ queryKey: ['employees'] });
        }}
      />

      <LinkUserModal
        open={linkOpen}
        employee={selectedEmployee ? { id: selectedEmployee.id, hoTen: selectedEmployee.hoTen } : null}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
        submitting={isPending}
        onConfirm={async (userId) => {
          if (!selectedEmployee) return;

          startTransition(async () => {
            setError(null);

            const response = await fetch(`/api/employees/${selectedEmployee.id}/link`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            });

            const payload = (await response.json()) as { success?: boolean; error?: string };

            if (!response.ok || payload.success === false) {
              setError(payload.error ?? 'Không thể liên kết tài khoản');
              return;
            }

            setLinkOpen(false);
            setSelectedEmployee(null);
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
          });
        }}
      />

      <Dialog.Root
        open={unlinkOpen}
        onOpenChange={(open) => {
          setUnlinkOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Hủy liên kết tài khoản</Dialog.Title>
            <p className="mt-2 text-sm text-slate-700">
              {`Bạn có chắc muốn hủy liên kết tài khoản ${selectedEmployee?.linkedUserEmail ?? ''} khỏi công nhân ${selectedEmployee?.hoTen ?? ''}?`}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlinkOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!selectedEmployee) return;

                  startTransition(async () => {
                    setError(null);

                    const response = await fetch(`/api/employees/${selectedEmployee.id}/link`, {
                      method: 'DELETE',
                    });

                    const payload = (await response.json()) as { success?: boolean; error?: string };

                    if (!response.ok || payload.success === false) {
                      setError(payload.error ?? 'Không thể hủy liên kết tài khoản');
                      return;
                    }

                    setUnlinkOpen(false);
                    setSelectedEmployee(null);
                    await queryClient.invalidateQueries({ queryKey: ['employees'] });
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Xác nhận
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
