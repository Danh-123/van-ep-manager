'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export type ViewerUserType = 'worker' | 'customer' | 'unknown';

type UseUserTypeResult = {
  userType: ViewerUserType;
  isLoading: boolean;
};

export function useUserType(enabled = true): UseUserTypeResult {
  const [userType, setUserType] = useState<ViewerUserType>('unknown');
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setUserType('unknown');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const resolveUserType = async () => {
      setIsLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!cancelled) {
            setUserType('unknown');
            setIsLoading(false);
          }
          return;
        }

        const userId = session.user.id;

        const [workerResult, customerResult] = await Promise.all([
          supabase.from('cong_nhan').select('id').eq('user_id', userId).limit(1).maybeSingle(),
          supabase.from('khach_hang').select('id').eq('user_id', userId).limit(1).maybeSingle(),
        ]);

        if (cancelled) {
          return;
        }

        if (workerResult.data) {
          setUserType('worker');
          setIsLoading(false);
          return;
        }

        if (customerResult.data) {
          setUserType('customer');
          setIsLoading(false);
          return;
        }

        setUserType('unknown');
        setIsLoading(false);
      } catch {
        if (cancelled) {
          return;
        }

        setUserType('unknown');
        setIsLoading(false);
      }
    };

    void resolveUserType();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    userType,
    isLoading,
  };
}
