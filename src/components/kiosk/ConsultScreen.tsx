'use client';

// 상담 화면 — 음성/텍스트 질문 → AI 답변(음성+텍스트+동기 이미지)
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MEDIA, SUGGESTED_QUESTIONS, buildGreeting, getFollowupSuggestions } from '@/lib/knowledge';
import { useSpeech } from '@/lib/speech';
import type { ChatMessage, ChatResponse } from '@/lib/types';
import type { SummaryData, Visitor } from './KioskApp';

interface DisplayMessage extends ChatMessage {
  source?: 'llm' | 'fallback';
  /** 글자 스트리밍 타이핑용 — true면 마운트 시 한 글자씩 표시 */
  stream?: boolean;
}

/** 답변 텍스트를 한 글자씩 표시 (~25ms/char) */
function StreamedText({ text }: { text: string }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [text]);
  return (
    <>
      {shown}
      {shown.length < text.length && (
        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-gold-400/80 align-middle" />
      )}
    </>
  );
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
  // 직전 답변 키워드 — 추천 질문 갱신용
  const [lastKeyword, setLastKeyword] = useState<string | undefined>(undefined);
  // 큰 글자 모드 (고령 사용자 접근성)
  const [largeText, setLargeText] = useState(false);
  // 키오스크(lg+)에서 텍스트 입력창 표시 여부 — 기본은 음성 중심이라 숨김
  const [showKeyboard, setShowKeyboard] = useState(false);
  const topicsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  // StrictMode 이중 마운트 / 재렌더에 대비한 인사 1회 가드
  const greetedRef = useRef(false);
  // 자동 청취에서 최신 ask/supported를 참조하기 위한 ref (의존성 순환 방지)
  const askRef = useRef<(q: string) => void>(() => {});
  const supportedRef = useRef(false);
  supportedRef.current = supported;

  /** 답변 음성이 정상 종료되면 자동으로 마이크를 켜 다음 질문을 기다린다 (대화형 핑퐁) */
  const autoListen = useCallback(
    (done: boolean) => {
      if (done && supportedRef.current) {
        startListening((text) => askRef.current(text));
      }
    },
    [startListening],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // 상담 화면 진입 직후 한 번:
  // (1) 모바일 자동재생 정책 잠금 해제 (InfoForm "안내 시작하기" 제스처 컨텍스트 활용)
  // (2) 인사 메시지를 어시스턴트 발화로 추가하고 즉시 음성 출력 → 첫 문장부터 들리도록
  //     인사가 끝나면 자동으로 청취 시작
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    unlockAudio();
    const greeting = buildGreeting({ name: visitor.name, anonymous: visitor.anonymous });
    setMessages([{ role: 'assistant', content: greeting, source: 'llm' }]);
    void speak(greeting).then(autoListen);
  }, [unlockAudio, speak, autoListen, visitor.name, visitor.anonymous]);

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
          { role: 'assistant', content: data.answer, source: data.source, stream: true },
        ]);
        if (data.imageKey && MEDIA[data.imageKey]) setImageKey(data.imageKey);
        if (data.keyword) {
          topicsRef.current.add(data.keyword);
          setLastKeyword(data.keyword);
        }
        void speak(data.answer).then(autoListen); // 음성 종료 후 자동 청취
      } catch {
        const errMsg = '죄송합니다. 잠시 후 다시 시도해 주세요.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errMsg, source: 'fallback', stream: true },
        ]);
        void speak(errMsg).then(autoListen); // 에러 상황에서도 음성은 출력 (사용자가 침묵을 보지 않도록)
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, visitor.sessionId, speak, stopSpeaking, autoListen],
  );
  askRef.current = ask;

  const onMic = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening((text) => ask(text));
    }
  }, [listening, startListening, stopListening, ask]);

  const media = MEDIA[imageKey] ?? MEDIA.overview;

  // AI 엠블럼 상태
  const orbMode: 'idle' | 'thinking' | 'speaking' =
    loading || listening ? 'thinking' : speaking ? 'speaking' : 'idle';
  const coreClass =
    orbMode === 'thinking'
      ? 'ai-core ai-core-thinking'
      : orbMode === 'speaking'
        ? 'ai-core ai-core-speaking'
        : 'ai-core';
  const rippleClass =
    orbMode === 'thinking'
      ? 'ai-ripple ai-ripple-thinking'
      : orbMode === 'speaking'
        ? 'ai-ripple ai-ripple-speaking'
        : 'ai-ripple';
  return (
    <div className="relative flex h-full w-full">
      {/* 앰비언트 오로라 배경 */}
      <div className="aurora" />

      {/* 좌측: AI 상담사 캐릭터(주인공) + 동기 안내 이미지 */}
      <div className="relative z-10 hidden w-[42%] flex-col items-center justify-center border-r border-gold-500/20 p-8 lg:flex">
        {/* 상담사 캐릭터 — 발화 시 글로우가 호흡(coreClass) */}
        <div className={`relative mb-3 w-44 overflow-hidden rounded-3xl xl:w-52 ${coreClass}`}>
          <Image
            src="/media/counselor.png"
            alt="AI 상담사"
            width={1024}
            height={1536}
            className="h-auto w-full"
            priority
          />
          {/* 발화 중 사운드웨이브 — 캐릭터 하단에 겹쳐서 */}
          {speaking && (
            <div
              className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1 bg-gradient-to-t from-deep/80 to-transparent pb-3 pt-8"
              aria-label="음성 안내 중"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded bg-gold-400"
                  style={{
                    height: 20,
                    transformOrigin: 'bottom',
                    animation: `soundwave 0.9s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-gold-500/80">
          {orbMode === 'thinking' ? 'Listening' : orbMode === 'speaking' ? 'Speaking' : 'Ready'}
        </p>

        <div
          className="animate-fade-up w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
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
        <p className="mt-4 text-center text-lg text-gold-500">{media.alt}</p>
      </div>

      {/* 우측: 대화 — min-w-0 으로 flex 자식 가로 넘침 방지 */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 border-b border-gold-500/20 px-4 py-3 sm:px-8 sm:py-5">
          {/* 상담사 아바타 (모바일) — 발화/사고 시 펄스 링 */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center lg:hidden">
            {orbMode !== 'idle' && (
              <span
                className={`absolute inset-0 rounded-full border border-gold-400/50 ${rippleClass}`}
              />
            )}
            <span className="absolute inset-0 rounded-full border border-gold-500/30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/counselor.png"
              alt="AI 상담사"
              className="relative h-9 w-9 rounded-full object-cover object-top"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {/* 상태 점: 준비 중(골드 펄스) / 안내 중(골드) / 듣는 중(빨강) / 대기(녹색) */}
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  loading
                    ? 'animate-pulse bg-gold-400 shadow-[0_0_8px_rgba(216,189,133,0.7)]'
                    : speaking
                      ? 'bg-gold-400 shadow-[0_0_8px_rgba(216,189,133,0.7)]'
                      : listening
                        ? 'animate-pulse bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                        : 'bg-emerald-400'
                }`}
              />
              <p className="text-xs font-medium text-ink/70 sm:text-sm">
                {loading
                  ? '답변 준비 중'
                  : speaking
                    ? '안내 중'
                    : listening
                      ? '듣는 중'
                      : '대기 중'}
              </p>
            </div>
            <p className="mt-0.5 truncate text-base font-semibold text-ink sm:text-xl">
              {visitor.anonymous ? '한빛내과의원' : `${visitor.name}님, 환영합니다`}
            </p>
          </div>
          <button
            onClick={() => setLargeText((v) => !v)}
            aria-pressed={largeText}
            title="큰 글자 모드"
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm active:scale-95 sm:rounded-xl sm:px-4 sm:py-3 sm:text-base ${
              largeText
                ? 'border-gold-400 bg-gold-500 font-bold text-navy-900'
                : 'border-ink/30 text-ink/80'
            }`}
          >
            가<span className="align-super text-[0.7em]">+</span>
          </button>
          <button
            onClick={() =>
              onEnd({
                questionCount: messages.filter((m) => m.role === 'user').length,
                topics: Array.from(topicsRef.current),
              })
            }
            className="shrink-0 rounded-lg border border-ink/30 px-3 py-2 text-sm text-ink/80 active:scale-95 sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
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
            <div className="mt-2 rounded-2xl bg-ink/5 p-4 text-ink/80 sm:mt-4 sm:p-6">
              <p className={largeText ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'}>
                {visitor.anonymous
                  ? '안녕하세요, 한빛내과의원 AI 안내입니다.'
                  : `안녕하세요, ${visitor.name}님. 한빛내과의원 AI 안내입니다.`}
              </p>
              <p
                className={`mt-2 text-ink/60 ${largeText ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}
              >
                아래 추천 질문을 누르거나, 마이크 버튼을 눌러 음성으로 물어보세요.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`animate-fade-up max-w-[80%] break-words rounded-2xl px-4 py-3 leading-relaxed [overflow-wrap:anywhere] sm:px-5 sm:py-4 ${
                  largeText ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
                } ${m.role === 'user' ? 'bg-gold-500 text-navy-900' : 'bg-ink/10 text-ink'}`}
              >
                {m.role === 'assistant' && m.stream ? <StreamedText text={m.content} /> : m.content}
                {m.role === 'assistant' && m.source === 'fallback' && (
                  <span className="ml-2 align-middle text-xs text-gold-500/80">
                    · 오프라인 안내
                  </span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="flex items-center gap-2 rounded-2xl bg-ink/10 px-5 py-4 sm:px-6 sm:py-4"
                aria-label="답변 생성 중"
              >
                <span
                  className="typing-dot inline-block h-2.5 w-2.5 rounded-full bg-gold-400"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="typing-dot inline-block h-2.5 w-2.5 rounded-full bg-gold-400"
                  style={{ animationDelay: '160ms' }}
                />
                <span
                  className="typing-dot inline-block h-2.5 w-2.5 rounded-full bg-gold-400"
                  style={{ animationDelay: '320ms' }}
                />
              </div>
            </div>
          )}
          {listening && transcript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] break-words rounded-2xl border border-gold-400/50 px-4 py-3 text-base text-ink/90 [overflow-wrap:anywhere] sm:px-5 sm:py-4 sm:text-lg">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* 추천 질문 — 첫 질문 전엔 일반 추천, 이후엔 마지막 키워드 기반 후속 */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap sm:overflow-visible sm:px-8 sm:pb-3">
          {(lastKeyword ? getFollowupSuggestions(lastKeyword) : SUGGESTED_QUESTIONS).map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className={`shrink-0 whitespace-nowrap rounded-full border border-gold-500/40 text-ink/80 transition hover:bg-ink/10 active:scale-95 disabled:opacity-40 ${
                largeText
                  ? 'px-4 py-2.5 text-base sm:px-5 sm:py-3 sm:text-lg'
                  : 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* 음성 CTA — 키오스크(lg+) 기본. 큰 마이크가 주인공 */}
        <div
          className={`${showKeyboard ? 'hidden' : 'hidden lg:flex'} flex-col items-center gap-2 border-t border-gold-500/20 px-8 py-5`}
        >
          <button
            onClick={onMic}
            disabled={!supported || loading}
            className={`flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition active:scale-95 disabled:opacity-30 ${
              listening ? 'animate-pulse-ring bg-red-500 text-white' : 'bg-gold-500 text-navy-900'
            }`}
          >
            <svg
              className="h-9 w-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 11a3 3 0 0 0 6 0V5a3 3 0 0 0-6 0v6Z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <p className="text-base font-medium text-ink/80">
            {!supported
              ? '이 기기는 음성을 지원하지 않습니다 — 아래 직접 입력을 이용해 주세요'
              : listening
                ? '듣고 있어요. 말씀해 주세요…'
                : loading
                  ? '답변을 준비하고 있어요'
                  : '마이크를 누르고 말씀해 주세요'}
          </p>
          <button
            onClick={() => setShowKeyboard(true)}
            className="mt-1 flex items-center gap-1.5 rounded-full border border-ink/20 px-4 py-1.5 text-xs text-ink/60 transition hover:bg-ink/5 active:scale-95"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
            </svg>
            직접 입력
          </button>
        </div>

        {/* 입력 바 — 모바일 기본 / 키오스크에선 '직접 입력' 선택 시 */}
        <div
          className={`${showKeyboard ? 'flex' : 'flex lg:hidden'} items-center gap-2 border-t border-gold-500/20 px-4 py-3 sm:gap-3 sm:px-8 sm:py-5`}
        >
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
            className="min-w-0 flex-1 rounded-xl border border-gold-500/30 bg-deep/60 px-3 py-3 text-base text-ink outline-none focus:border-gold-400 sm:px-5 sm:py-4 sm:text-lg"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-900 active:scale-95 disabled:opacity-40 sm:px-7 sm:py-4 sm:text-lg"
          >
            전송
          </button>
          {/* 키오스크에서 음성 모드로 복귀 */}
          <button
            onClick={() => setShowKeyboard(false)}
            className="hidden shrink-0 rounded-xl border border-ink/20 px-3 py-3 text-sm text-ink/60 active:scale-95 lg:block"
          >
            음성으로
          </button>
        </div>
        {!supported && !showKeyboard && (
          <p className="px-8 pb-3 text-center text-sm text-gold-500/80 lg:hidden">
            현재 브라우저가 음성 기능을 지원하지 않아 텍스트 모드로 동작합니다.
          </p>
        )}
      </div>
    </div>
  );
}
