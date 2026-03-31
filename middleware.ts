import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Chạy updateSession cho tất cả routes để maintain authentication
  return updateSession(request);
}

export const config = {
  matcher: [
    // Bỏ qua các file tĩnh và API routes
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};