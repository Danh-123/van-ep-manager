'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { signIn } from '@/app/login/actions';

const loginSchema = z.object({
  email: z.string().trim().email('Email khong hop le'),
  password: z
    .string()
    .min(6, 'Mat khau phai co it nhat 6 ky tu')
    .max(100, 'Mat khau qua dai'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);

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
        <h2 className="text-2xl font-semibold tracking-tight text-[#1B5E20]">Dang nhap he thong</h2>
        <p className="mt-2 text-sm text-slate-600">
          Su dung tai khoan duoc cap de quan ly cham cong, luong va thong tin van ep.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            Mat khau
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nhap mat khau"
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
              Dang dang nhap...
            </>
          ) : (
            'Dang nhap'
          )}
        </button>
      </form>
    </div>
  );
}
