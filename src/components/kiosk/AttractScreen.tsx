'use client';

// 대기(Attract) 화면 — 브랜드 노출 + 상담 시작 유도
import { PROJECT } from '@/lib/knowledge';

export default function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 text-center"
    >
      <div className="animate-fade-up">
        <p className="mb-6 text-xl tracking-[0.5em] text-gold-400">PREMIUM RESIDENCE</p>
        <h1 className="font-serif-display text-7xl font-bold leading-tight text-cream">
          {PROJECT.brand}
        </h1>
        <p className="mt-6 text-2xl text-cream/70">{PROJECT.location}</p>

        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="animate-pulse-ring flex h-28 w-28 items-center justify-center rounded-full bg-gold-500 text-navy-900">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 11a3 3 0 0 0 6 0V5a3 3 0 0 0-6 0v6Z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gold-400 transition group-active:scale-95">
            화면을 터치하여 AI 상담 시작
          </p>
          <p className="text-lg text-cream/50">청약 · 평형 · 일정 무엇이든 물어보세요</p>
        </div>
      </div>

      <div className="absolute bottom-8 text-sm text-cream/40">
        한빛건설 · 자이 &nbsp;|&nbsp; AI 상담 키오스크 데모
      </div>
    </button>
  );
}
