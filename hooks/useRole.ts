'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

export type AppRole = 'Admin' | 'KeToan' | 'Viewer';

type RoleQueryResult = {
  role: AppRole;
};

function normalizeRole(role: string | null | undefined): AppRole {
  if (role === 'Admin' || role === 'KeToan' || role === 'Viewer') {
    return role;
  }

  return 'Viewer';
}

export function useRole() {
  const query = useQuery<RoleQueryResult>({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return { role: 'Viewer' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      return {
        role: normalizeRole((profile?.role as string | null | undefined) ?? 'Viewer'),
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    role: query.data?.role ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
