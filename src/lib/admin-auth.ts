// API 라우트용 Basic Auth 헬퍼 — 미들웨어가 본문 있는 요청과 충돌하는 케이스 회피용.
import { NextResponse } from 'next/server';

const USER = 'admin';

export function checkAdminAuth(req: Request): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD || 'hanbit2026';
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const [u, p] = atob(auth.slice(6)).split(':');
      if (u === USER && p === password) return null;
    } catch {
      /* 잘못된 헤더 → 재인증 요구 */
    }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"' },
  });
}
