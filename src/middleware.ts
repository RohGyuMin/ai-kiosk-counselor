// /admin 및 /api/admin 보호 — HTTP Basic Auth
//
// 설계 의도: 공개 URL에서 수집 데이터(이름·전화번호)가 노출되지 않도록
// 가장 단순한 표준 방식(Basic Auth)으로 잠근다. 브라우저가 기본 로그인
// 다이얼로그를 띄우므로 별도 로그인 화면이 필요 없다.
// 비밀번호는 ADMIN_PASSWORD 환경변수로 주입 (미설정 시 데모 기본값).

import { NextRequest, NextResponse } from 'next/server';

const USER = 'admin';

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || 'hanbit2026';

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const [u, p] = atob(auth.slice(6)).split(':');
      if (u === USER && p === password) return NextResponse.next();
    } catch {
      /* 잘못된 헤더 → 재인증 요구 */
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"' },
  });
}

export const config = {
  // API는 라우트 안에서 자체 인증한다 (미들웨어가 본문 있는 요청과 충돌하는 케이스 회피)
  matcher: ['/admin/:path*', '/admin'],
};
