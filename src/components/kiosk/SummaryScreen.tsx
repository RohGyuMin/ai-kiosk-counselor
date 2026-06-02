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
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 text-center">
      <div className="animate-fade-up">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gold-500 text-navy-900">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-serif-display mt-8 text-5xl font-bold text-cream">
          {name}님, 상담해 주셔서 감사합니다
        </h2>
        <p className="mt-4 text-xl text-cream/60">
          총 {summary.questionCount}개의 질문에 답변해 드렸습니다.
        </p>

        {summary.topics.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {summary.topics.map((t) => (
              <span
                key={t}
                className="text-gold-300 rounded-full border border-gold-500/40 px-4 py-2"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <p className="mt-10 text-lg text-cream/50">
          자세한 상담은 모델하우스 상담 데스크에서 도와드리겠습니다.
        </p>

        <button
          onClick={onReset}
          className="mt-10 rounded-xl bg-gold-500 px-10 py-4 text-xl font-bold text-navy-900 active:scale-95"
        >
          처음으로
        </button>
        <p className="mt-4 text-sm text-cream/30">15초 후 자동으로 처음 화면으로 돌아갑니다.</p>
      </div>
    </div>
  );
}
