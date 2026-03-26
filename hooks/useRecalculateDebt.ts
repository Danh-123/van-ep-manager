'use client';

import { useCallback, useState } from 'react';

import type { DebtCalculatedRow } from '@/lib/trucks/debtCalculator';

type RecalculateResponse = {
  success: boolean;
  error?: string;
  data?: DebtCalculatedRow[];
};

export function useRecalculateDebt() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const recalculate = useCallback(async () => {
    setIsRecalculating(true);

    try {
      const response = await fetch('/api/trucks/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = (await response.json()) as RecalculateResponse;
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Không thể tính lại công nợ');
      }

      return json.data;
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  return {
    recalculate,
    isRecalculating,
  };
}
