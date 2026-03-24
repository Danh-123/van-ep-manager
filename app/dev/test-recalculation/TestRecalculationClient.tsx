'use client';

import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  type ScenarioResult,
} from '@/app/dev/test-recalculation/actions';

type RunState = {
  running: boolean;
  error: string | null;
  result: ScenarioResult | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TestRecalculationClient() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<RunState>({
    running: false,
    error: null,
    result: null,
  });

  const run = (task: () => Promise<{ success: boolean; data?: ScenarioResult; error?: string }>) => {
    setState((prev) => ({ ...prev, running: true, error: null }));

    startTransition(() => {
      void task().then((result) => {
        if (!result.success) {
          setState({ running: false, error: result.error ?? 'Loi khong xac dinh', result: null });
          return;
        }

        setState({ running: false, error: null, result: result.data ?? null });
      });
    });
  };

  const rows = state.result?.rows ?? [];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dev Test: Backdate & Recalculation</h1>
        <p className="mt-1 text-sm text-slate-600">Test tren ngay 2026-03-20 voi 4 scenario backdate/recalculation.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => run(runScenarioA)}
            disabled={isPending || state.running}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Scenario A
          </button>
          <button
            type="button"
            onClick={() => run(runScenarioB)}
            disabled={isPending || state.running}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Scenario B
          </button>
          <button
            type="button"
            onClick={() => run(runScenarioC)}
            disabled={isPending || state.running}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Scenario C
          </button>
          <button
            type="button"
            onClick={() => run(runScenarioD)}
            disabled={isPending || state.running}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Scenario D
          </button>
        </div>

        {(isPending || state.running) && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dang chay scenario...
          </p>
        )}

        {state.error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      </section>

      {state.result && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">{state.result.name}</h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                state.result.pass
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {state.result.pass ? 'PASS' : 'FAIL'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">So nguoi di lam</p>
              <p className="font-semibold text-slate-900">
                expected {state.result.expectedPresentCount} | actual {state.result.actualPresentCount}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">Luong/nguoi expected</p>
              <p className="font-semibold text-slate-900">{formatMoney(state.result.expectedPerPerson)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">Mismatch dong</p>
              <p className="font-semibold text-slate-900">{state.result.salaryMismatches.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">Cong nhan</th>
                  <th className="px-3 py-2 font-medium">Trang thai</th>
                  <th className="px-3 py-2 font-medium">So luong</th>
                  <th className="px-3 py-2 font-medium">Don gia</th>
                  <th className="px-3 py-2 font-medium">Thanh tien</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.workerId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{row.workerName}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.soLuong}</td>
                    <td className="px-3 py-2">{formatMoney(row.donGia)}</td>
                    <td className="px-3 py-2">{formatMoney(row.thanhTien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
