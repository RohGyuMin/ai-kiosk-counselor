'use client';

import { CLINIC } from '@/lib/knowledge';

export default function AttractScreen({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 px-6 text-center"
    >
      <div className="animate-fade-up max-w-3xl">
        <p className="mb-4 text-sm tracking-[0.4em] text-gold-400 sm:mb-6 sm:text-xl sm:tracking-[0.5em]">
          SMART CLINIC
        </p>
        <h1 className="font-serif-display text-4xl font-bold leading-tight text-cream sm:text-6xl lg:text-7xl">
          {CLINIC.name}
        </h1>
        <p className="mt-3 text-lg text-cream/70 sm:mt-4 sm:text-2xl">{CLINIC.slogan}</p>
        <p className="mt-2 text-sm text-cream/50 sm:text-lg">{CLINIC.nearbyStation}</p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:mt-20 sm:gap-4">
          <div className="animate-pulse-ring flex h-20 w-20 items-center justify-center rounded-full bg-gold-500 text-navy-900 sm:h-28 sm:w-28">
            {/* 십자(+) 의료 아이콘 */}
            <svg className="h-8 w-8 sm:h-11 sm:w-11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </div>
          <p className="mt-3 text-xl font-semibold text-gold-400 transition group-active:scale-95 sm:mt-4 sm:text-3xl">
            화면을 터치하여 안내 시작
          </p>
          <p className="px-2 text-sm text-cream/50 sm:text-lg">
            진료시간 · 접수 · 위치 무엇이든 물어보세요
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 px-4 text-center text-xs text-cream/40 sm:bottom-8 sm:text-sm">
        {CLINIC.director} &nbsp;|&nbsp; {CLINIC.phone}
        <span className="hidden sm:inline"> &nbsp;|&nbsp; AI 안내 키오스크</span>
      </div>
    </button>
  );
}
