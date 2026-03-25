'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { register as registerUser } from '@/lib/auth/actions';
import { vi } from '@/lib/translations/vi';

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(120, 'Họ tên quá dài'),
    email: z.string().trim().email('Email không hợp lệ'),
    password: z
      .string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu quá dài'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Xác nhận mật khẩu không khớp',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setRegisterError(null);

    startTransition(async () => {
      const result = await registerUser(values.email, values.password, values.fullName);

      if (!result.success) {
        setRegisterError(result.error);
        return;
      }

      router.replace('/login?registered=1');
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
        <h2 className="text-2xl font-semibold tracking-tight text-[#1B5E20]">Đăng ký tài khoản</h2>
        <p className="mt-2 text-sm text-slate-600">Tạo tài khoản mới để truy cập hệ thống VanEpManager.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">
            Họ tên
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nguyen Van A"
              {...register('fullName')}
            />
          </div>
          {errors.fullName && <p className="mt-1.5 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>

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
              autoComplete="new-password"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none ring-[#2E7D32]/30 transition focus:border-[#2E7D32] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Nhập lại mật khẩu"
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {registerError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{registerError}</div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(46,125,50,0.85)] transition hover:bg-[#1B5E20] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang đăng ký...
            </>
          ) : (
            vi.auth.register
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-medium text-[#1B5E20] hover:underline">
          {vi.auth.login}
        </Link>
      </p>
    </div>
  );
}
