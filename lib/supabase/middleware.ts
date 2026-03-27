import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (user) {
    requestHeaders.set('x-user-id', user.id);
    if (user.email) {
      requestHeaders.set('x-user-email', user.email);
    }
    const userRole = (user.user_metadata?.role ?? user.app_metadata?.role ?? '') as string;
    if (userRole) {
      requestHeaders.set('x-user-role', userRole);
    }
  }

  const isLoginRoute = pathname === '/login' || pathname.startsWith('/login/');
  const isRegisterRoute = pathname === '/register' || pathname.startsWith('/register/');
  const isAuthRoute = isLoginRoute || isRegisterRoute;

  let resolvedRole = '';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    resolvedRole = (profile?.role ?? '') as string;
    if (resolvedRole) {
      requestHeaders.set('x-user-role', resolvedRole);
    }
  }

  if (!user && !isAuthRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectedFrom', pathname);

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = resolvedRole === 'Viewer' ? '/my-salary' : '/dashboard';

    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (user && resolvedRole === 'Viewer') {
    const viewerAllowedPrefixes = ['/my-salary', '/my-attendance', '/my-debt'];
    const isAllowed = viewerAllowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (!isAllowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/my-salary';

      const redirectResponse = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}
