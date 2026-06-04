// 상담 답변 — Claude 호출(서버 전용) + 폴백, 대화/통계 기록
import { NextRequest, NextResponse } from 'next/server';
import { generateAnswer } from '@/lib/llm';
import { addEvent, addMessage } from '@/lib/db';
import type { ChatRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, history } = (await req.json()) as ChatRequest;
    if (!message?.trim()) {
      return NextResponse.json({ error: '질문이 비어 있습니다.' }, { status: 400 });
    }

    const result = await generateAnswer(message.trim(), history || []);

    // 기록은 best-effort: 세션이 없거나 FK 위반(데이터 휘발 등)이 나도 답변은 정상 반환한다.
    // (Cloud Run에서 컨테이너 재시작 시 SQLite가 초기화돼 옛 sessionId가 사라질 수 있다)
    if (sessionId) {
      try {
        addMessage(sessionId, 'user', message.trim());
        addMessage(sessionId, 'assistant', result.answer, result.source);
        if (result.keyword) addEvent(sessionId, result.keyword);
      } catch (logErr) {
        console.warn('[chat] 기록 실패(답변은 정상 반환):', logErr);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[chat] 처리 실패:', err);
    return NextResponse.json({ error: '답변 생성 실패' }, { status: 500 });
  }
}
