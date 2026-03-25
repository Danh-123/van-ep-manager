'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { signIn } from '@/app/login/actions';
import { vi } from '@/lib/translations/vi';

const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100, 'Mật khẩu quá dài'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);
  const isRegistered = searchParams.get('registered') === '1';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setAuthError(null);

    startTransition(async () => {
      const result = await signIn(values.email, values.password);

      if (!result.success) {
        setAuthError(result.error);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-7 text-center sm:hidden">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-[#1B5E20]">
          <span className="h-2 w-2 rounded-full bg-[#2E7D32]" />
          VanEpManager
        </div>
      </div>

      <header className="mb-6 text-left">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1B5E20]">Đăng nhập hệ thống</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sử dụng tài khoản được cấp để quản lý chấm công, lương và thông tin ván ép.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {isRegistered && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-[#1B5E20]">
            Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="you@company.com"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {authError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(46,125,50,0.85)] transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            vi.auth.login
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="font-medium text-[#1B5E20] hover:underline">
          {vi.auth.registerAccount}
        </Link>
      </p>
    </div>
  );
}
