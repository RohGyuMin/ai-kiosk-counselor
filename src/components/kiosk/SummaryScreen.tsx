'use client';

// 상담 요약/종료 화면
import { useEffect } from 'react';
import type { SummaryData } from './KioskApp';

export default function SummaryScreen({
  name,
  summary,
  onReset,
}: {
  name: string;
  summary: SummaryData;
  onReset: () => void;
}) {
  // 15초 후 자동으로 대기 화면 복귀 (무인 운영 대비)
  useEffect(() => {
    const t = setTimeout(onReset, 15000);
    return () => clearTimeout(t);
  }, [onReset]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 px-6 text-center">
      <div className="animate-fade-up max-w-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900 sm:h-24 sm:w-24">
          <svg
            className="h-7 w-7 sm:h-11 sm:w-11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-serif-display mt-6 text-2xl font-bold text-cream sm:mt-8 sm:text-5xl">
          {name}님, 안내해 드려서 감사합니다
        </h2>
        <p className="mt-3 text-base text-cream/60 sm:mt-4 sm:text-xl">
          총 {summary.questionCount}개의 질문에 답변해 드렸습니다.
        </p>

        {summary.topics.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8">
            {summary.topics.map((t) => (
              <span
                key={t}
                className="text-gold-300 rounded-full border border-gold-500/40 px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <p className="mt-6 text-sm text-cream/50 sm:mt-10 sm:text-lg">
          추가 문의는 원무과 직원이나 전화(02-123-4567)로 도와드리겠습니다.
        </p>

        <button
          onClick={onReset}
          className="mt-6 rounded-xl bg-gold-500 px-8 py-3 text-base font-bold text-navy-900 active:scale-95 sm:mt-10 sm:px-10 sm:py-4 sm:text-xl"
        >
          처음으로
        </button>
        <p className="mt-3 text-xs text-cream/30 sm:mt-4 sm:text-sm">
          15초 후 자동으로 처음 화면으로 돌아갑니다.
        </p>
      </div>
    </div>
  );
}
