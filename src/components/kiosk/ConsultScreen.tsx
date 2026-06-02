'use client';

// 상담 화면 — 음성/텍스트 질문 → AI 답변(음성+텍스트+동기 이미지)
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MEDIA, SUGGESTED_QUESTIONS } from '@/lib/knowledge';
import { useSpeech } from '@/lib/speech';
import type { ChatMessage, ChatResponse } from '@/lib/types';
import type { SummaryData, Visitor } from './KioskApp';

interface DisplayMessage extends ChatMessage {
  source?: 'llm' | 'fallback';
}

export default function ConsultScreen({
  visitor,
  onEnd,
}: {
  visitor: Visitor;
  onEnd: (data: SummaryData) => void;
}) {
  const {
    supported,
    listening,
    speaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useSpeech();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageKey, setImageKey] = useState<string>('overview');
  const topicsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || loading) return;
      stopSpeaking();
      setInput('');
      const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { role: 'user', content: q }]);
      setLoading(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: visitor.sessionId, message: q, history }),
        });
        const data = (await res.json()) as ChatResponse;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, source: data.source },
        ]);
        if (data.imageKey && MEDIA[data.imageKey]) setImageKey(data.imageKey);
        if (data.keyword) topicsRef.current.add(data.keyword);
        void speak(data.answer); // 서버(Gemini) TTS → 실패 시 브라우저 음성 자동 폴백
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '죄송합니다. 잠시 후 다시 시도해 주세요.',
            source: 'fallback',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, visitor.sessionId, speak, stopSpeaking],
  );

  const onMic = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening((text) => ask(text));
    }
  }, [listening, startListening, stopListening, ask]);

  const media = MEDIA[imageKey] ?? MEDIA.overview;

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-navy-800 to-navy-900">
      {/* 좌측: 동기 안내 이미지 */}
      <div className="relative hidden w-[42%] flex-col items-center justify-center border-r border-gold-500/20 p-8 lg:flex">
        <div
          className="animate-fade-up w-full overflow-hidden rounded-2xl shadow-2xl"
          key={imageKey}
        >
          <Image
            src={media.src}
            alt={media.alt}
            width={800}
            height={500}
            className="h-auto w-full"
            priority
          />
        </div>
        <p className="mt-6 text-center text-xl text-gold-400">{media.alt}</p>
        {speaking && (
          <div className="mt-6 flex items-end gap-1" aria-label="음성 안내 중">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-2 rounded bg-gold-400"
                style={{
                  height: 28,
                  transformOrigin: 'bottom',
                  animation: `soundwave 0.9s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 우측: 대화 */}
      <div className="flex flex-1 flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gold-500/20 px-8 py-5">
          <div>
            <p className="text-sm text-cream/50">AI 상담 진행 중</p>
            <p className="text-xl font-semibold text-cream">{visitor.name}님, 환영합니다</p>
          </div>
          <button
            onClick={() =>
              onEnd({
                questionCount: messages.filter((m) => m.role === 'user').length,
                topics: Array.from(topicsRef.current),
              })
            }
            className="rounded-xl border border-cream/30 px-6 py-3 text-cream/80 active:scale-95"
          >
            상담 종료
          </button>
        </div>

        {/* 메시지 */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-8 py-6">
          {messages.length === 0 && (
            <div className="mt-4 rounded-2xl bg-cream/5 p-6 text-cream/80">
              <p className="text-xl">
                안녕하세요, {visitor.name}님. 한빛자이 더 센트럴 AI 상담사입니다.
              </p>
              <p className="mt-2 text-cream/60">
                아래 추천 질문을 누르거나, 마이크 버튼을 눌러 음성으로 물어보세요.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`animate-fade-up max-w-[80%] rounded-2xl px-5 py-4 text-lg leading-relaxed ${
                  m.role === 'user' ? 'bg-gold-500 text-navy-900' : 'bg-cream/10 text-cream'
                }`}
              >
                {m.content}
                {m.role === 'assistant' && m.source === 'fallback' && (
                  <span className="ml-2 align-middle text-xs text-gold-400/70">
                    · 오프라인 안내
                  </span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-cream/10 px-5 py-4 text-cream/60">답변 생성 중…</div>
            </div>
          )}
          {listening && transcript && (
            <div className="flex justify-end">
              <div className="text-gold-200 max-w-[80%] rounded-2xl border border-gold-400/50 px-5 py-4 text-lg">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* 추천 질문 */}
        <div className="flex flex-wrap gap-2 px-8 pb-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className="rounded-full border border-gold-500/40 px-4 py-2 text-sm text-cream/80 transition hover:bg-cream/10 active:scale-95 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 입력 바 */}
        <div className="flex items-center gap-3 border-t border-gold-500/20 px-8 py-5">
          <button
            onClick={onMic}
            disabled={!supported || loading}
            title={supported ? '음성으로 질문' : '이 브라우저는 음성 인식을 지원하지 않습니다'}
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30 ${
              listening ? 'animate-pulse-ring bg-red-500 text-white' : 'bg-gold-500 text-navy-900'
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 11a3 3 0 0 0 6 0V5a3 3 0 0 0-6 0v6Z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder={
              supported
                ? '직접 입력하거나 마이크를 누르세요'
                : '질문을 입력하세요 (음성 미지원 브라우저)'
            }
            className="flex-1 rounded-xl border border-gold-500/30 bg-navy-900/60 px-5 py-4 text-lg text-cream outline-none focus:border-gold-400"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-gold-500 px-7 py-4 text-lg font-bold text-navy-900 active:scale-95 disabled:opacity-40"
          >
            전송
          </button>
        </div>
        {!supported && (
          <p className="px-8 pb-3 text-center text-sm text-gold-400/70">
            현재 브라우저가 음성 기능을 지원하지 않아 텍스트 모드로 동작합니다.
          </p>
        )}
      </div>
    </div>
  );
}
