'use server';

import {
  TEST_DATE,
  distributeDailySalary,
  ensureTestWorkers,
  seedScenarioA,
  upsertAttendanceRow,
} from '@/lib/testing/seedData';
import { verifyDistribution } from '@/lib/testing/verifyRecalculation';

export type ScenarioResult = {
  name: string;
  pass: boolean;
  expectedPresentCount: number;
  actualPresentCount: number;
  expectedPerPerson: number;
  rows: Array<{
    workerId: number;
    workerName: string;
    status: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
  }>;
  salaryMismatches: Array<{
    workerId: number;
    workerName: string;
    status: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
  }>;
};

type ActionResult =
  | { success: true; data: ScenarioResult }
  | { success: false; error: string };

async function runVerify(name: string, expectedPresentCount: number, expectedPerPerson: number) {
  const workers = await ensureTestWorkers();

  const verify = await verifyDistribution({
    date: TEST_DATE,
    expectedPresentCount,
    expectedPerPerson,
    tolerance: 2,
    workerIds: workers.map((w) => w.id),
  });

  return {
    name,
    ...verify,
  } satisfies ScenarioResult;
}

export async function runScenarioA(): Promise<ActionResult> {
  try {
    await seedScenarioA(TEST_DATE);

    return {
      success: true,
      data: await runVerify('Scenario A: 3 nguoi, tong 3,000,000', 3, 1_000_000),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scenario A that bai',
    };
  }
}

export async function runScenarioB(): Promise<ActionResult> {
  try {
    const workers = await ensureTestWorkers();
    await upsertAttendanceRow({ date: TEST_DATE, workerId: workers[3].id, status: 'CoMat' });
    await distributeDailySalary(TEST_DATE, 3_000_000);

    return {
      success: true,
      data: await runVerify('Scenario B: them nguoi thu 4 -> 750,000', 4, 750_000),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scenario B that bai',
    };
  }
}

export async function runScenarioC(): Promise<ActionResult> {
  try {
    const workers = await ensureTestWorkers();
    await upsertAttendanceRow({ date: TEST_DATE, workerId: workers[0].id, status: 'Nghi' });
    await distributeDailySalary(TEST_DATE, 3_000_000);

    return {
      success: true,
      data: await runVerify('Scenario C: 1 nguoi nghi -> 1,000,000', 3, 1_000_000),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scenario C that bai',
    };
  }
}

export async function runScenarioD(): Promise<ActionResult> {
  try {
    await distributeDailySalary(TEST_DATE, 4_000_000);

    return {
      success: true,
      data: await runVerify('Scenario D: tong 4,000,000 -> 1,333,333', 3, 1_333_333),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scenario D that bai',
    };
  }
}
