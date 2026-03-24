import 'server-only';

import { createClient } from '@/lib/supabase/server';

type DefaultPriceParams = {
  woodTypeId?: number;
  woodTypeName?: string;
};

export async function getDefaultWoodTypePrice(params: DefaultPriceParams) {
  const supabase = await createClient();

  let query = supabase
    .from('loai_van_ep')
    .select('id, ten_loai, don_gia, don_vi')
    .eq('is_active', true);

  if (params.woodTypeId) {
    query = query.eq('id', params.woodTypeId);
  } else if (params.woodTypeName?.trim()) {
    query = query.ilike('ten_loai', params.woodTypeName.trim());
  }

  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const typed = data as {
    id: number;
    ten_loai: string;
    don_gia: number | string;
    don_vi: string;
  };

  return {
    id: typed.id,
    tenLoai: typed.ten_loai,
    donGia: typeof typed.don_gia === 'number' ? typed.don_gia : Number(typed.don_gia),
    donVi: typed.don_vi,
  };
}
