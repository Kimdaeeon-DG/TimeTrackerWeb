import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 보호된 경로 목록
  const protectedRoutes = ['/dashboard', '/timer', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );
  
  // 로그인 페이지
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');

  // 로그인하지 않은 사용자가 보호된 경로에 접근하려고 할 때
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 이미 로그인한 사용자가 로그인 페이지에 접근하려고 할 때
  if (session && isLoginPage) {
    const redirectUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
