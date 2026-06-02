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

    // 기록 (세션이 있을 때만)
    if (sessionId) {
      addMessage(sessionId, 'user', message.trim());
      addMessage(sessionId, 'assistant', result.answer, result.source);
      if (result.keyword) addEvent(sessionId, result.keyword);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[chat] 처리 실패:', err);
    return NextResponse.json({ error: '답변 생성 실패' }, { status: 500 });
  }
}
