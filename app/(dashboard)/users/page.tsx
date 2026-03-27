'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import UserTable from '@/components/users/UserTable';
import { createClient } from '@/lib/supabase/client';

export default function UsersPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'Admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUserId(user.id);
      setIsAuthorized(true);
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-600">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  if (!isAuthorized || !currentUserId) {
    return null;
  }

  return <UserTable currentUserId={currentUserId} />;
}
