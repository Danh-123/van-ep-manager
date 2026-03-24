'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';

import {
  importAttendance,
  importDebt,
  importSalary,
  importTickets,
} from '@/app/(dashboard)/import/actions';

type TabKey = 'attendance' | 'tickets' | 'salary' | 'debt';
type DuplicateMode = 'update' | 'skip';

type MappingValue = Record<string, string>;

type ValidationResult = {
  successCount: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  preview: Array<Record<string, unknown>>;
};

const TAB_CONFIG: Record<
  TabKey,
  {
    label: string;
    fields: Array<{ key: string; label: string; required?: boolean }>;
    requiredForImport: string[];
    supportsDuplicateMode?: boolean;
  }
> = {
  attendance: {
    label: 'Import cham cong',
    fields: [
      { key: 'date', label: 'Ngay', required: true },
      { key: 'worker', label: 'Cong nhan', required: true },
      { key: 'status', label: 'Trang thai', required: true },
      { key: 'note', label: 'Ghi chu' },
    ],
    requiredForImport: ['date', 'worker', 'status'],
    supportsDuplicateMode: true,
  },
  tickets: {
    label: 'Import phieu can',
    fields: [
      { key: 'ticketNo', label: 'So phieu' },
      { key: 'date', label: 'Ngay can', required: true },
      { key: 'truckNo', label: 'Xe so', required: true },
      { key: 'customer', label: 'Khach hang', required: true },
      { key: 'weightKg', label: 'Trong luong (kg)', required: true },
      { key: 'unitPrice', label: 'Don gia', required: true },
      { key: 'woodType', label: 'Loai van ep' },
      { key: 'note', label: 'Ghi chu' },
    ],
    requiredForImport: ['date', 'truckNo', 'customer', 'weightKg', 'unitPrice'],
    supportsDuplicateMode: true,
  },
  salary: {
    label: 'Import luong',
    fields: [
      { key: 'month', label: 'Thang', required: true },
      { key: 'year', label: 'Nam', required: true },
      { key: 'worker', label: 'Cong nhan', required: true },
      { key: 'totalSalary', label: 'Tong luong', required: true },
      { key: 'paidSalary', label: 'Da thanh toan' },
      { key: 'status', label: 'Trang thai luong' },
    ],
    requiredForImport: ['month', 'year', 'worker', 'totalSalary'],
  },
  debt: {
    label: 'Import cong no',
    fields: [
      { key: 'ticketNo', label: 'So phieu', required: true },
      { key: 'paymentDate', label: 'Ngay thanh toan', required: true },
      { key: 'amount', label: 'So tien', required: true },
      { key: 'collector', label: 'Nguoi thu' },
      { key: 'method', label: 'Phuong thuc' },
      { key: 'note', label: 'Ghi chu' },
    ],
    requiredForImport: ['ticketNo', 'paymentDate', 'amount'],
  },
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function guessMapping(headers: string[], tab: TabKey): MappingValue {
  const mapping: MappingValue = {};
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    norm: normalizeText(header),
  }));

  const matchers: Record<string, string[]> = {
    date: ['ngay', 'ngaycan', 'date'],
    worker: ['congnhan', 'hoten', 'ten', 'worker', 'macongnhan'],
    status: ['trangthai', 'status'],
    note: ['ghichu', 'note'],
    ticketNo: ['sophieu', 'ticket', 'phieu'],
    truckNo: ['xeso', 'bienso', 'truck'],
    customer: ['khachhang', 'customer'],
    weightKg: ['trongluong', 'khoiluong', 'kg', 'weight'],
    unitPrice: ['dongia', 'unitprice', 'price'],
    woodType: ['loaivan', 'loaivanep', 'wood'],
    month: ['thang', 'month'],
    year: ['nam', 'year'],
    totalSalary: ['tongluong', 'tongtiencong', 'totalsalary'],
    paidSalary: ['dathanhtoan', 'paid'],
    paymentDate: ['ngaythanhtoan', 'paymentdate'],
    amount: ['sotien', 'amount'],
    collector: ['nguoithu', 'collector'],
    method: ['phuongthuc', 'method'],
  };

  TAB_CONFIG[tab].fields.forEach((field) => {
    const candidates = matchers[field.key] ?? [];
    const found = normalizedHeaders.find((header) =>
      candidates.some((candidate) => header.norm.includes(candidate)),
    );
    mapping[field.key] = found?.raw ?? '';
  });

  return mapping;
}

function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: Array<Record<string, string>> }> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { headers: [], rows: [] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    if (data.length === 0) {
      return { headers: [], rows: [] };
    }

    const headerRow = data[0] ?? [];
    const headers = headerRow.map((value, index) => {
      const text = String(value ?? '').trim();
      return text || `Column ${index + 1}`;
    });

    const rows = data.slice(1).map((line) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = String(line[index] ?? '').trim();
      });
      return row;
    });

    return { headers, rows: rows.filter((row) => Object.values(row).some((value) => value !== '')) };
  });
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

export default function ImportManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [mappingByTab, setMappingByTab] = useState<Record<TabKey, MappingValue>>({
    attendance: {},
    tickets: {},
    salary: {},
    debt: {},
  });
  const [duplicateModeByTab, setDuplicateModeByTab] = useState<Record<'attendance' | 'tickets', DuplicateMode>>({
    attendance: 'update',
    tickets: 'update',
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const activeConfig = TAB_CONFIG[activeTab];
  const activeMapping = useMemo(() => mappingByTab[activeTab] ?? {}, [activeTab, mappingByTab]);

  const mappedRows = useMemo(() => {
    if (!rows.length) return [];

    return rows.map((row) => {
      const output: Record<string, string> = {};
      activeConfig.fields.forEach((field) => {
        const column = activeMapping[field.key];
        output[field.key] = column ? row[column] ?? '' : '';
      });
      return output;
    });
  }, [activeConfig.fields, activeMapping, rows]);

  const previewRawRows = useMemo(() => rows.slice(0, 10), [rows]);

  const requiredMissing = useMemo(
    () => activeConfig.requiredForImport.filter((field) => !(activeMapping[field] || '').trim()),
    [activeConfig.requiredForImport, activeMapping],
  );

  const handleFile = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      setError('Chi ho tro file .xlsx, .xls, .csv');
      return;
    }

    startTransition(() => {
      void parseSpreadsheet(file)
        .then((parsed) => {
          if (parsed.headers.length === 0) {
            setError('Khong tim thay du lieu trong file');
            setRows([]);
            setHeaders([]);
            setValidation(null);
            return;
          }

          setHeaders(parsed.headers);
          setRows(parsed.rows);
          setFileName(file.name);
          setValidation(null);
          setSummary(null);
          setError(null);

          setMappingByTab((prev) => ({
            attendance: Object.keys(prev.attendance).length ? prev.attendance : guessMapping(parsed.headers, 'attendance'),
            tickets: Object.keys(prev.tickets).length ? prev.tickets : guessMapping(parsed.headers, 'tickets'),
            salary: Object.keys(prev.salary).length ? prev.salary : guessMapping(parsed.headers, 'salary'),
            debt: Object.keys(prev.debt).length ? prev.debt : guessMapping(parsed.headers, 'debt'),
          }));
        })
        .catch(() => {
          setError('Khong the doc file. Vui long kiem tra lai dinh dang.');
        });
    });
  };

  const onValidate = () => {
    if (requiredMissing.length > 0) {
      setError(`Thieu mapping cot bat buoc: ${requiredMissing.join(', ')}`);
      return;
    }

    setError(null);
    setSummary(null);

    startTransition(() => {
      const run = async () => {
        if (activeTab === 'attendance') {
          const result = await importAttendance(
            mappedRows.map((row) => ({
              date: row.date,
              worker: row.worker,
              status: row.status,
              note: row.note,
            })),
            {
              duplicateMode: duplicateModeByTab.attendance,
              dryRun: true,
            },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Validate xong: ${result.data.successCount} dong hop le, ${result.data.errors.length} dong loi.`);
          return;
        }

        if (activeTab === 'tickets') {
          const result = await importTickets(
            mappedRows.map((row) => ({
              ticketNo: row.ticketNo,
              date: row.date,
              truckNo: row.truckNo,
              customer: row.customer,
              weightKg: row.weightKg,
              unitPrice: row.unitPrice,
              woodType: row.woodType,
              note: row.note,
            })),
            {
              duplicateMode: duplicateModeByTab.tickets,
              dryRun: true,
            },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Validate xong: ${result.data.successCount} dong hop le, ${result.data.errors.length} dong loi.`);
          return;
        }

        if (activeTab === 'salary') {
          const result = await importSalary(
            mappedRows.map((row) => ({
              month: row.month,
              year: row.year,
              worker: row.worker,
              totalSalary: row.totalSalary,
              paidSalary: row.paidSalary,
              status: row.status,
            })),
            { dryRun: true },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Validate xong: ${result.data.successCount} dong hop le, ${result.data.errors.length} dong loi.`);
          return;
        }

        const result = await importDebt(
          mappedRows.map((row) => ({
            ticketNo: row.ticketNo,
            paymentDate: row.paymentDate,
            amount: row.amount,
            collector: row.collector,
            method: row.method,
            note: row.note,
          })),
          { dryRun: true },
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        setValidation(result.data as unknown as ValidationResult);
        setSummary(`Validate xong: ${result.data.successCount} dong hop le, ${result.data.errors.length} dong loi.`);
      };

      void run();
    });
  };

  const onConfirmImport = () => {
    if (requiredMissing.length > 0) {
      setError(`Thieu mapping cot bat buoc: ${requiredMissing.join(', ')}`);
      return;
    }

    setError(null);
    setSummary(null);

    startTransition(() => {
      const run = async () => {
        if (activeTab === 'attendance') {
          const result = await importAttendance(
            mappedRows.map((row) => ({
              date: row.date,
              worker: row.worker,
              status: row.status,
              note: row.note,
            })),
            { duplicateMode: duplicateModeByTab.attendance, dryRun: false },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Import thanh cong ${result.data.successCount} dong. Loi: ${result.data.errors.length}.`);
          return;
        }

        if (activeTab === 'tickets') {
          const result = await importTickets(
            mappedRows.map((row) => ({
              ticketNo: row.ticketNo,
              date: row.date,
              truckNo: row.truckNo,
              customer: row.customer,
              weightKg: row.weightKg,
              unitPrice: row.unitPrice,
              woodType: row.woodType,
              note: row.note,
            })),
            { duplicateMode: duplicateModeByTab.tickets, dryRun: false },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Import thanh cong ${result.data.successCount} dong. Loi: ${result.data.errors.length}.`);
          return;
        }

        if (activeTab === 'salary') {
          const result = await importSalary(
            mappedRows.map((row) => ({
              month: row.month,
              year: row.year,
              worker: row.worker,
              totalSalary: row.totalSalary,
              paidSalary: row.paidSalary,
              status: row.status,
            })),
            { dryRun: false },
          );

          if (!result.success) {
            setError(result.error);
            return;
          }

          setValidation(result.data as unknown as ValidationResult);
          setSummary(`Import thanh cong ${result.data.successCount} dong. Loi: ${result.data.errors.length}.`);
          return;
        }

        const result = await importDebt(
          mappedRows.map((row) => ({
            ticketNo: row.ticketNo,
            paymentDate: row.paymentDate,
            amount: row.amount,
            collector: row.collector,
            method: row.method,
            note: row.note,
          })),
          { dryRun: false },
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        setValidation(result.data as unknown as ValidationResult);
        setSummary(`Import thanh cong ${result.data.successCount} dong. Loi: ${result.data.errors.length}.`);
      };

      void run();
    });
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Import du lieu tu Excel cu</h1>
        <p className="mt-1 text-sm text-slate-600">Ho tro import cham cong, phieu can, luong va cong no. Chi Admin duoc phep thao tac.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle
          title="Tai file"
          description="Keo tha file vao khung hoac bam de chon file. Ho tro .xlsx, .xls, .csv"
        />

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition ${
            dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50/50'
          }`}
        >
          <UploadCloud className="h-6 w-6 text-[#1B5E20]" />
          <span className="text-sm font-medium text-slate-700">Keo tha file vao day hoac bam de chon</span>
          <span className="text-xs text-slate-500">Toi da 5000 dong, doc sheet dau tien cua file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={isPending}
          />
        </label>

        {fileName && (
          <p className="mt-2 text-sm text-slate-600">
            Da tai: <span className="font-medium text-slate-900">{fileName}</span> ({rows.length} dong du lieu)
          </p>
        )}
      </section>

      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as TabKey);
          setValidation(null);
          setSummary(null);
          setError(null);
        }}
      >
        <Tabs.List className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4">
          <Tabs.Trigger value="attendance" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#1B5E20]">
            Import cham cong
          </Tabs.Trigger>
          <Tabs.Trigger value="tickets" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#1B5E20]">
            Import phieu can
          </Tabs.Trigger>
          <Tabs.Trigger value="salary" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#1B5E20]">
            Import luong
          </Tabs.Trigger>
          <Tabs.Trigger value="debt" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#1B5E20]">
            Import cong no
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} className="mt-4 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionTitle
              title="Mapping cot"
              description="Chon cot trong file cu tuong ung voi truong du lieu trong he thong"
            />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {activeConfig.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-sm text-slate-700">
                    {field.label}
                    {field.required ? <span className="text-red-600"> *</span> : null}
                  </label>
                  <select
                    value={activeMapping[field.key] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setMappingByTab((prev) => ({
                        ...prev,
                        [activeTab]: {
                          ...prev[activeTab],
                          [field.key]: value,
                        },
                      }));
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none ring-[#2E7D32]/30 focus:border-[#2E7D32] focus:ring-4"
                  >
                    <option value="">-- Khong map --</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {(activeTab === 'attendance' || activeTab === 'tickets') && (
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-700">
                <span className="font-medium">Khi du lieu trung:</span>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={duplicateModeByTab[activeTab] === 'update'}
                    onChange={() =>
                      setDuplicateModeByTab((prev) => ({
                        ...prev,
                        [activeTab]: 'update',
                      }))
                    }
                  />
                  Update
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={duplicateModeByTab[activeTab] === 'skip'}
                    onChange={() =>
                      setDuplicateModeByTab((prev) => ({
                        ...prev,
                        [activeTab]: 'skip',
                      }))
                    }
                  />
                  Skip
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionTitle title="Preview file" description="Xem nhanh du lieu goc truoc khi validate" />
            <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    {headers.length === 0 ? (
                      <th className="px-3 py-2">Chua co du lieu</th>
                    ) : (
                      headers.map((header) => (
                        <th key={header} className="px-3 py-2 font-medium">
                          {header}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRawRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={Math.max(1, headers.length)}>
                        Chua co dong nao.
                      </td>
                    </tr>
                  ) : (
                    previewRawRows.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 last:border-0">
                        {headers.map((header) => (
                          <td key={`${index}-${header}`} className="px-3 py-2 text-slate-700">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onValidate}
              disabled={isPending || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Validate du lieu
            </button>
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={isPending || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Xac nhan import
            </button>
          </div>

          {summary && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-[#1B5E20]">{summary}</p>}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {validation && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionTitle title="Ket qua validate/import" description="Preview du lieu hop le va danh sach loi" />

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Thanh cong</p>
                  <p className="text-lg font-semibold text-slate-900">{validation.successCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Inserted</p>
                  <p className="text-lg font-semibold text-slate-900">{validation.inserted}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Updated</p>
                  <p className="text-lg font-semibold text-slate-900">{validation.updated}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Skipped</p>
                  <p className="text-lg font-semibold text-slate-900">{validation.skipped}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    Preview sau validate ({validation.preview.length})
                  </div>
                  <div className="max-h-72 overflow-auto p-3">
                    <pre className="whitespace-pre-wrap text-xs text-slate-700">
                      {JSON.stringify(validation.preview.slice(0, 50), null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    Danh sach loi ({validation.errors.length})
                  </div>
                  <div className="max-h-72 overflow-auto p-3">
                    {validation.errors.length === 0 ? (
                      <p className="text-sm text-emerald-700">Khong co loi validate.</p>
                    ) : (
                      <ul className="space-y-2 text-xs text-red-700">
                        {validation.errors.slice(0, 200).map((item, index) => (
                          <li key={`${item.row}-${index}`}>
                            Dong {item.row}: {item.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
