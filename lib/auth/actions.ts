'use server';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const registerSchema = z.object({
  email: z.string().trim().email('Email khong hop le'),
  password: z
    .string()
    .min(6, 'Mat khau phai co it nhat 6 ky tu')
    .max(100, 'Mat khau qua dai'),
  fullName: z.string().trim().min(2, 'Ho ten phai co it nhat 2 ky tu').max(120, 'Ho ten qua dai'),
});

type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function register(email: string, password: string, fullName: string): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({ email, password, fullName });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Du lieu dang ky khong hop le',
    };
  }

  const supabase = await createClient();
  const payload = parsed.data;

  const { error } = await supabase.auth.signUp({
    email: payload.email.toLowerCase(),
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Profile row is created by DB trigger public.handle_new_user after auth user is inserted.
  return { success: true };
}
