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
    unlockAudio,
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

  // 상담 화면 진입 직후 한 번: 모바일 오디오 자동재생 정책 잠금 해제
  // (InfoForm "안내 시작하기" 클릭 제스처 컨텍스트가 살아있는 동안 호출)
  useEffect(() => {
    unlockAudio();
  }, [unlockAudio]);

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
        const errMsg = '죄송합니다. 잠시 후 다시 시도해 주세요.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errMsg, source: 'fallback' },
        ]);
        void speak(errMsg); // 에러 상황에서도 음성은 출력 (사용자가 침묵을 보지 않도록)
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
        <div className="flex items-center justify-between gap-3 border-b border-gold-500/20 px-4 py-3 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs text-cream/50 sm:text-sm">AI 안내 진행 중</p>
            <p className="truncate text-base font-semibold text-cream sm:text-xl">
              {visitor.name}님, 환영합니다
            </p>
          </div>
          <button
            onClick={() =>
              onEnd({
                questionCount: messages.filter((m) => m.role === 'user').length,
                topics: Array.from(topicsRef.current),
              })
            }
            className="shrink-0 rounded-lg border border-cream/30 px-3 py-2 text-sm text-cream/80 active:scale-95 sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
          >
            종료
          </button>
        </div>

        {/* 메시지 */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-8 sm:py-6"
        >
          {messages.length === 0 && (
            <div className="mt-2 rounded-2xl bg-cream/5 p-4 text-cream/80 sm:mt-4 sm:p-6">
              <p className="text-base sm:text-xl">
                안녕하세요, {visitor.name}님. 한빛내과의원 AI 안내입니다.
              </p>
              <p className="mt-2 text-sm text-cream/60 sm:text-base">
                아래 추천 질문을 누르거나, 마이크 버튼을 눌러 음성으로 물어보세요.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`animate-fade-up max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed sm:max-w-[80%] sm:px-5 sm:py-4 sm:text-lg ${
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
              <div className="rounded-2xl bg-cream/10 px-4 py-3 text-sm text-cream/60 sm:px-5 sm:py-4 sm:text-base">
                답변 생성 중…
              </div>
            </div>
          )}
          {listening && transcript && (
            <div className="flex justify-end">
              <div className="text-gold-200 max-w-[85%] rounded-2xl border border-gold-400/50 px-4 py-3 text-base sm:max-w-[80%] sm:px-5 sm:py-4 sm:text-lg">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* 추천 질문 (모바일에선 가로 스크롤로 한 줄) */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:overflow-visible sm:px-8 sm:pb-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className="shrink-0 whitespace-nowrap rounded-full border border-gold-500/40 px-3 py-1.5 text-xs text-cream/80 transition hover:bg-cream/10 active:scale-95 disabled:opacity-40 sm:px-4 sm:py-2 sm:text-sm"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 입력 바 */}
        <div className="flex items-center gap-2 border-t border-gold-500/20 px-4 py-3 sm:gap-3 sm:px-8 sm:py-5">
          <button
            onClick={onMic}
            disabled={!supported || loading}
            title={supported ? '음성으로 질문' : '이 브라우저는 음성 인식을 지원하지 않습니다'}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30 sm:h-16 sm:w-16 ${
              listening ? 'animate-pulse-ring bg-red-500 text-white' : 'bg-gold-500 text-navy-900'
            }`}
          >
            <svg
              className="h-5 w-5 sm:h-7 sm:w-7"
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
            placeholder={supported ? '입력 또는 마이크' : '질문을 입력하세요'}
            className="min-w-0 flex-1 rounded-xl border border-gold-500/30 bg-navy-900/60 px-3 py-3 text-base text-cream outline-none focus:border-gold-400 sm:px-5 sm:py-4 sm:text-lg"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-900 active:scale-95 disabled:opacity-40 sm:px-7 sm:py-4 sm:text-lg"
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
