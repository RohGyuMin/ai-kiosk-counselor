// 세션 생성 / 종료 — 방문객 정보(이름·전화번호) 수집 지점
import { NextRequest, NextResponse } from 'next/server';
import { createSession, endSession } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { name, phone, consent } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: '이름과 전화번호가 필요합니다.' }, { status: 400 });
    }
    // 데모용 단순 ID (crypto.randomUUID는 런타임 제공)
    const id = crypto.randomUUID();
    createSession(id, String(name).trim(), String(phone).trim(), !!consent);
    return NextResponse.json({ sessionId: id });
  } catch (err) {
    console.error('[session] 생성 실패:', err);
    return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (sessionId) endSession(String(sessionId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
