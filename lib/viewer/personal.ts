import { createClient } from '@/lib/supabase/server';

export type ViewerRole = 'Admin' | 'KeToan' | 'Viewer';

export type PersonalWorker = {
  id: number;
  maCongNhan: string;
  hoTen: string;
  soDienThoai: string | null;
};

export type ViewerContext = {
  role: ViewerRole;
  profile: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  worker: PersonalWorker | null;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function mapWorker(row: {
  id: number;
  ma_cong_nhan: string;
  ho_ten: string;
  so_dien_thoai: string | null;
}) {
  return {
    id: row.id,
    maCongNhan: row.ma_cong_nhan,
    hoTen: row.ho_ten,
    soDienThoai: row.so_dien_thoai,
  } satisfies PersonalWorker;
}

async function findWorkerByPhone(phone: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai')
    .eq('so_dien_thoai', phone)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return mapWorker(
    data as {
      id: number;
      ma_cong_nhan: string;
      ho_ten: string;
      so_dien_thoai: string | null;
    },
  );
}

async function findWorkerByName(fullName: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai, trang_thai, created_at')
    .ilike('ho_ten', fullName)
    .order('trang_thai', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return null;

  const normalizedTarget = normalizeText(fullName);
  const exact = data.find((row) => normalizeText((row as { ho_ten: string }).ho_ten) === normalizedTarget);
  const picked = exact ?? data[0];

  return mapWorker(
    picked as {
      id: number;
      ma_cong_nhan: string;
      ho_ten: string;
      so_dien_thoai: string | null;
    },
  );
}

async function findWorkerByEmailPrefix(email: string) {
  const prefix = email.split('@')[0]?.trim();
  if (!prefix) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('cong_nhan')
    .select('id, ma_cong_nhan, ho_ten, so_dien_thoai')
    .ilike('ho_ten', `%${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return mapWorker(
    data as {
      id: number;
      ma_cong_nhan: string;
      ho_ten: string;
      so_dien_thoai: string | null;
    },
  );
}

export async function getViewerContext(): Promise<ViewerContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role ?? 'Viewer') as ViewerRole;

  const profileData = {
    id: user.id,
    fullName: profile?.full_name?.trim() || user.user_metadata?.full_name || (user.email ?? 'Nguoi dung'),
    email: profile?.email?.trim() || user.email || '',
    phone: profile?.phone?.trim() || '',
  };

  let worker: PersonalWorker | null = null;

  if (profileData.phone) {
    worker = await findWorkerByPhone(profileData.phone);
  }

  if (!worker && profileData.fullName) {
    worker = await findWorkerByName(profileData.fullName);
  }

  if (!worker && profileData.email) {
    worker = await findWorkerByEmailPrefix(profileData.email);
  }

  return {
    role,
    profile: profileData,
    worker,
  };
}
