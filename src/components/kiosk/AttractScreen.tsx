'use client';

// 대기(Attract) 화면 — 두 가지 진입점
//  ① 접수까지 진행 (이름·연락처 입력 → 안내 → 번호표 발급)
//  ② 안내만 받기 (둘러보기 — 개인정보 입력 없이 바로 상담만)

import { CLINIC } from '@/lib/knowledge';

export default function AttractScreen({
  onStartReception,
  onBrowse,
}: {
  onStartReception: () => void;
  onBrowse: () => void;
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up max-w-3xl">
        <p className="mb-4 text-sm tracking-[0.4em] text-gold-500 sm:mb-6 sm:text-xl sm:tracking-[0.5em]">
          SMART CLINIC
        </p>
        <h1 className="font-serif-display text-4xl font-bold leading-tight text-ink sm:text-6xl lg:text-7xl">
          {CLINIC.name}
        </h1>
        <p className="mt-3 text-lg text-ink/70 sm:mt-4 sm:text-2xl">{CLINIC.slogan}</p>
        <p className="mt-2 text-sm text-ink/50 sm:text-lg">{CLINIC.nearbyStation}</p>

        {/* 의료 십자 엠블럼 */}
        <div className="mt-8 flex justify-center sm:mt-12">
          <div className="animate-pulse-ring flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900 sm:h-24 sm:w-24">
            <svg className="h-7 w-7 sm:h-10 sm:w-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </div>
        </div>

        {/* 두 진입점 */}
        <div className="mt-8 grid w-full gap-3 sm:mx-auto sm:mt-12 sm:max-w-xl sm:grid-cols-2 sm:gap-4">
          {/* ① 접수까지 진행 (primary) */}
          <button
            onClick={onStartReception}
            className="group rounded-2xl bg-gold-500 px-6 py-5 text-navy-900 shadow-xl transition active:scale-95 sm:px-6 sm:py-7"
          >
            <p className="text-lg font-bold sm:text-xl">접수하기</p>
            <p className="mt-1 text-xs opacity-80 sm:text-sm">AI 안내 + 대기 번호표 발급</p>
          </button>

          {/* ② 안내만 (secondary, 둘러보기) */}
          <button
            onClick={onBrowse}
            className="group rounded-2xl border border-gold-500/40 bg-ink/5 px-6 py-5 text-ink backdrop-blur-sm transition hover:bg-deep/60 active:scale-95 sm:px-6 sm:py-7"
          >
            <p className="text-lg font-bold text-gold-500 sm:text-xl">안내만 받기</p>
            <p className="mt-1 text-xs text-ink/70 sm:text-sm">개인정보 입력 없이 둘러보기</p>
          </button>
        </div>

        <p className="mt-6 text-xs text-ink/40 sm:mt-8 sm:text-sm">
          진료시간 · 접수 · 위치 · 보험 무엇이든 물어보세요
        </p>
      </div>

      <div className="absolute bottom-4 px-4 text-center text-xs text-ink/40 sm:bottom-8 sm:text-sm">
        {CLINIC.director} &nbsp;|&nbsp; {CLINIC.phone}
        <span className="hidden sm:inline"> &nbsp;|&nbsp; AI 안내 키오스크</span>
      </div>
    </div>
  );
}
