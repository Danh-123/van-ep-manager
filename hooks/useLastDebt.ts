'use client';

import { useEffect, useMemo, useState } from 'react';

type LastDebtResponse = {
  success: boolean;
  error?: string;
  data?: {
    customerId: number;
    customerName: string;
    con_lai: number;
    isFirstTicket: boolean;
  };
};

export function useLastDebt(customerId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousRemain, setPreviousRemain] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [isFirstTicket, setIsFirstTicket] = useState(true);

  useEffect(() => {
    const parsed = Number(customerId);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setPreviousRemain(0);
      setCustomerName('');
      setIsFirstTicket(true);
      setError(null);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trucks/last-debt?customerId=${parsed}`, { cache: 'no-store' });
        const json = (await response.json()) as LastDebtResponse;

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Khong the tai cong no phieu truoc');
        }

        if (!active) return;

        setPreviousRemain(json.data.con_lai || 0);
        setCustomerName(json.data.customerName || '');
        setIsFirstTicket(Boolean(json.data.isFirstTicket));
      } catch (loadError) {
        if (!active) return;
        setPreviousRemain(0);
        setCustomerName('');
        setIsFirstTicket(true);
        setError(loadError instanceof Error ? loadError.message : 'Khong the tai cong no phieu truoc');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [customerId]);

  return useMemo(
    () => ({
      loading,
      error,
      previousRemain,
      customerName,
      isFirstTicket,
    }),
    [customerName, error, isFirstTicket, loading, previousRemain],
  );
}
