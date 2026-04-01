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
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) {
            setUserType('unknown');
            setIsLoading(false);
          }
          return;
        }

        const [workerResult, customerResult] = await Promise.all([
          supabase.from('cong_nhan').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
          supabase.from('khach_hang').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
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
