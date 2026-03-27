import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auth | VanEpManager',
  description: 'Authentication pages for VanEpManager',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#C8E6C9_0%,#E8F5E9_35%,#F4FBF4_100%)]">
      <div className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-[#81C784]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-8 h-72 w-72 rounded-full bg-[#2E7D32]/20 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-200/70 bg-white/90 shadow-[0_24px_90px_-40px_rgba(46,125,50,0.6)] backdrop-blur sm:grid-cols-2">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] p-10 text-white sm:flex">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-lime-200" />
                VanEpManager
              </div>
              <h1 className="mt-6 text-3xl font-semibold leading-tight">
                Quản lý ván ép và tiền công nhanh, rõ ràng.
              </h1>
              <p className="mt-4 max-w-sm text-sm text-emerald-100/90">
                Đăng nhập để tiếp tục truy cập hệ thống quản lý công nhân, chấm công và báo cáo.
              </p>
            </div>
            <p className="text-xs text-emerald-100/80">© {new Date().getFullYear()} VanEpManager</p>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10">{children}</div>
        </section>
      </main>
    </div>
  );
}
