/* eslint-disable no-console */

import {
  TEST_DATE,
  distributeDailySalary,
  ensureTestWorkers,
  seedScenarioA,
  upsertAttendanceRow,
} from '@/lib/testing/seedData';
import { verifyDistribution } from '@/lib/testing/verifyRecalculation';

export async function runRecalculationConsoleSuite(date = TEST_DATE) {
  const workers = await ensureTestWorkers();

  console.log('[Scenario A] 3 cong nhan CoMat, tong 3,000,000');
  await seedScenarioA(date);
  const verifyA = await verifyDistribution({
    date,
    expectedPresentCount: 3,
    expectedPerPerson: 1_000_000,
    workerIds: workers.map((w) => w.id),
  });
  console.log(verifyA);

  console.log('[Scenario B] Them cong nhan thu 4 vao backdate');
  await upsertAttendanceRow({ date, workerId: workers[3].id, status: 'CoMat' });
  await distributeDailySalary(date, 3_000_000);
  const verifyB = await verifyDistribution({
    date,
    expectedPresentCount: 4,
    expectedPerPerson: 750_000,
    workerIds: workers.map((w) => w.id),
  });
  console.log(verifyB);

  console.log('[Scenario C] Sua 1 cong nhan tu CoMat -> Nghi');
  await upsertAttendanceRow({ date, workerId: workers[0].id, status: 'Nghi' });
  await distributeDailySalary(date, 3_000_000);
  const verifyC = await verifyDistribution({
    date,
    expectedPresentCount: 3,
    expectedPerPerson: 1_000_000,
    workerIds: workers.map((w) => w.id),
  });
  console.log(verifyC);

  console.log('[Scenario D] Tong tien cong ngay = 4,000,000');
  await distributeDailySalary(date, 4_000_000);
  const verifyD = await verifyDistribution({
    date,
    expectedPresentCount: 3,
    expectedPerPerson: 1_333_333,
    tolerance: 2,
    workerIds: workers.map((w) => w.id),
  });
  console.log(verifyD);

  return {
    A: verifyA,
    B: verifyB,
    C: verifyC,
    D: verifyD,
  };
}
