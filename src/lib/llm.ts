// LLM 답변 계층 — 실제 Claude 호출 + 폴백
//
// 설계 의도: 답변 생성은 반드시 서버에서만 수행해 API 키를 클라이언트에 노출하지
// 않는다(Public 저장소 안전). 키가 없거나 호출이 실패하면 즉시 시나리오 폴백으로
// 전환해, 발표 현장에서 네트워크/키 문제가 있어도 데모가 끊기지 않게 한다.

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, classifyKeyword, getFallbackAnswer, inferImageKey } from './knowledge';
import type { ChatMessage, ChatResponse } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

export async function generateAnswer(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // 키가 없으면 곧바로 폴백
  if (!apiKey) {
    const fb = getFallbackAnswer(message);
    return { answer: fb.answer, source: 'fallback', imageKey: fb.imageKey, keyword: fb.keyword };
  }

  try {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(),
      messages,
    });

    const answer = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!answer) throw new Error('empty answer');

    return {
      answer,
      source: 'llm',
      imageKey: inferImageKey(message),
      keyword: classifyKeyword(message),
    };
  } catch (err) {
    // 호출 실패 시에도 데모가 멈추지 않도록 폴백
    console.error('[llm] Claude 호출 실패, 폴백 사용:', err);
    const fb = getFallbackAnswer(message);
    return { answer: fb.answer, source: 'fallback', imageKey: fb.imageKey, keyword: fb.keyword };
  }
}
