'use client';

import { CLINIC } from '@/lib/knowledge';

export default function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 text-center"
    >
      <div className="animate-fade-up">
        <p className="mb-6 text-xl tracking-[0.5em] text-gold-400">SMART CLINIC</p>
        <h1 className="font-serif-display text-7xl font-bold leading-tight text-cream">
          {CLINIC.name}
        </h1>
        <p className="mt-4 text-2xl text-cream/70">{CLINIC.slogan}</p>
        <p className="mt-2 text-lg text-cream/50">{CLINIC.nearbyStation}</p>

        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="animate-pulse-ring flex h-28 w-28 items-center justify-center rounded-full bg-gold-500 text-navy-900">
            {/* 십자(+) 의료 아이콘 */}
            <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gold-400 transition group-active:scale-95">
            화면을 터치하여 안내 시작
          </p>
          <p className="text-lg text-cream/50">진료시간 · 접수 · 위치 무엇이든 물어보세요</p>
        </div>
      </div>

      <div className="absolute bottom-8 text-sm text-cream/40">
        {CLINIC.director} &nbsp;|&nbsp; {CLINIC.phone} &nbsp;|&nbsp; AI 안내 키오스크
      </div>
    </button>
  );
}
