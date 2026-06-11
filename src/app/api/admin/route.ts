// 관리자 데이터 조회 — 세션 목록 / 통계 / 특정 세션 대화
import { NextRequest, NextResponse } from 'next/server';
import { getMessages, getStats, listSessions } from '@/lib/db';
import { checkAdminAuth } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = checkAdminAuth(req);
  if (denied) return denied;
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (sessionId) {
    return NextResponse.json({ messages: getMessages(sessionId) });
  }
  return NextResponse.json({ sessions: listSessions(), stats: getStats() });
}
