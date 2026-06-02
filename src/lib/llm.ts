// LLM 답변 계층 — 멀티 프로바이더(Gemini / Claude) + 폴백
//
// 설계 의도:
// - 답변 생성은 반드시 서버에서만 수행해 API 키를 클라이언트에 노출하지 않는다
//   (Public 저장소 안전).
// - 키가 없거나 호출이 실패하면 즉시 시나리오 폴백으로 전환해, 발표 현장에서
//   네트워크/키 문제가 있어도 데모가 끊기지 않게 한다.
// - 프로바이더는 환경변수로 선택한다. 명시하지 않으면 보유한 키를 보고 자동 선택한다.
//   (Gemini는 무료 등급이 있어 우선순위를 앞에 둔다.)

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, classifyKeyword, getFallbackAnswer, inferImageKey } from './knowledge';
import type { ChatMessage, ChatResponse } from './types';

type Provider = 'gemini' | 'anthropic' | 'none';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const MAX_TOKENS = 400;

/** 사용할 프로바이더 결정: LLM_PROVIDER 환경변수 우선, 없으면 보유 키로 자동 선택 */
function resolveProvider(): Provider {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : 'none';
  if (forced === 'anthropic' || forced === 'claude')
    return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none';

  // 자동: Gemini(무료 등급) → Claude 순
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'none';
}

async function callGemini(message: string, history: ChatMessage[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  // Gemini는 assistant 역할을 'model'로 표기한다.
  const contents = [
    ...history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: buildSystemPrompt(),
      maxOutputTokens: MAX_TOKENS,
    },
  });

  return (res.text ?? '').trim();
}

async function callAnthropic(message: string, history: ChatMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    messages,
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export async function generateAnswer(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const provider = resolveProvider();

  if (provider === 'none') {
    const fb = getFallbackAnswer(message);
    return { answer: fb.answer, source: 'fallback', imageKey: fb.imageKey, keyword: fb.keyword };
  }

  try {
    const answer =
      provider === 'gemini'
        ? await callGemini(message, history)
        : await callAnthropic(message, history);

    if (!answer) throw new Error('empty answer');

    return {
      answer,
      source: 'llm',
      imageKey: inferImageKey(message),
      keyword: classifyKeyword(message),
    };
  } catch (err) {
    // 호출 실패 시에도 데모가 멈추지 않도록 폴백
    console.error(`[llm] ${provider} 호출 실패, 폴백 사용:`, err);
    const fb = getFallbackAnswer(message);
    return { answer: fb.answer, source: 'fallback', imageKey: fb.imageKey, keyword: fb.keyword };
  }
}
