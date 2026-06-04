'use client';

// 종료 화면 — 대기 번호표 발급(병원 무인접수 키오스크 마무리)
//
// 흐름: (1) "번호표를 발행하고 있습니다" 진행 표시 (1.6초)
//       → (2) 번호표 카드 등장(애니메이션) + 진료과·번호·예상 대기시간 표시
//       → (3) 25초 후 자동으로 처음 화면으로 복귀

import { useEffect, useMemo, useState } from 'react';
import type { SummaryData } from './KioskApp';

const DEPT_BY_KEYWORD: Record<string, string> = {
  '진료과/전문': '내과',
  진료시간: '내과',
  '위치/주차': '내과',
  '접수/예약': '내과',
  '보험/비용': '내과',
  '의료진/병원소개': '내과',
  일반문의: '내과',
};

function pickDepartment(topics: string[]): string {
  // 상담 중 가장 자주 등장한 topic으로 진료과 추론
  for (const t of topics) if (DEPT_BY_KEYWORD[t]) return DEPT_BY_KEYWORD[t];
  return '내과'; // 기본
}

/** 결정론적 의사난수 (Date.now 미사용 — 시간 의존 회피) */
function ticketFromName(name: string): { letter: string; number: string } {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const letters = ['A', 'B', 'C'];
  const letter = letters[h % letters.length];
  const num = ((h >>> 8) % 60) + 18; // 18~77 사이
  return { letter, number: String(num).padStart(2, '0') };
}

export default function SummaryScreen({
  name,
  summary,
  onReset,
}: {
  name: string;
  summary: SummaryData;
  onReset: () => void;
}) {
  const [issued, setIssued] = useState(false);

  // 번호표 생성 모션: 1.6초 후 등장
  useEffect(() => {
    const t = setTimeout(() => setIssued(true), 1600);
    return () => clearTimeout(t);
  }, []);

  // 25초 후 자동 복귀 (무인 운영 대비)
  useEffect(() => {
    const t = setTimeout(onReset, 25000);
    return () => clearTimeout(t);
  }, [onReset]);

  const department = useMemo(() => pickDepartment(summary.topics), [summary.topics]);
  const ticket = useMemo(() => ticketFromName(name || '환자'), [name]);
  const waitingAhead = useMemo(() => {
    // 같은 진료과 앞 대기 인원 — 번호 끝자리 기반 (3~12명)
    return (parseInt(ticket.number, 10) % 10) + 3;
  }, [ticket]);
  const estimatedWait = waitingAhead * 4; // 분 (1인당 약 4분 가정)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-800 to-navy-900 px-6 text-center">
      {!issued ? (
        // 발급 중 화면
        <div className="animate-fade-up max-w-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
            <svg
              className="h-12 w-12 animate-spin text-gold-400 sm:h-16 sm:w-16"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="40 60"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-xl text-cream/80 sm:text-2xl">번호표를 발행하고 있습니다</p>
          <p className="mt-2 text-sm text-cream/50 sm:text-base">잠시만 기다려 주세요</p>
        </div>
      ) : (
        // 번호표 카드
        <div className="animate-fade-up w-full max-w-md">
          {/* 카드 */}
          <div className="relative mx-auto overflow-hidden rounded-3xl bg-cream text-navy-900 shadow-2xl ring-1 ring-gold-500/30">
            {/* 영수증 같은 톱니 가장자리 효과 */}
            <div className="absolute inset-x-0 -top-1 h-3 bg-[radial-gradient(circle_at_4px_-2px,transparent_4px,#f6f1e7_4px)] bg-[size:12px_8px]" />

            <div className="px-6 py-8 sm:px-8 sm:py-10">
              <p className="text-sm font-semibold tracking-[0.3em] text-navy-700/70 sm:text-base">
                한빛내과의원
              </p>
              <p className="mt-1 text-xs text-navy-700/50 sm:text-sm">
                대기 번호표 · WAITING TICKET
              </p>

              <div className="my-6 h-px w-full bg-navy-900/10" />

              <p className="text-xs text-navy-700/60 sm:text-sm">진료과</p>
              <p className="font-serif-display mt-1 text-2xl font-bold sm:text-3xl">{department}</p>

              <div className="mt-6 flex items-end justify-center gap-1">
                <span className="font-serif-display text-5xl font-bold text-navy-900 sm:text-7xl">
                  {ticket.letter}
                </span>
                <span className="font-serif-display text-5xl font-bold text-navy-900 sm:text-7xl">
                  -
                </span>
                <span className="font-serif-display text-5xl font-bold text-navy-900 sm:text-7xl">
                  {ticket.number}
                </span>
              </div>

              <div className="my-6 h-px w-full bg-navy-900/10" />

              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-xs text-navy-700/60 sm:text-sm">앞 대기</p>
                  <p className="mt-0.5 text-base font-semibold sm:text-lg">{waitingAhead}명</p>
                </div>
                <div>
                  <p className="text-xs text-navy-700/60 sm:text-sm">예상 대기</p>
                  <p className="mt-0.5 text-base font-semibold sm:text-lg">약 {estimatedWait}분</p>
                </div>
              </div>

              <p className="mt-6 text-xs text-navy-700/50 sm:text-sm">
                내원자: <span className="font-medium text-navy-900/80">{name}</span>
              </p>
            </div>

            {/* 하단 톱니 가장자리 */}
            <div className="absolute inset-x-0 -bottom-1 h-3 rotate-180 bg-[radial-gradient(circle_at_4px_-2px,transparent_4px,#f6f1e7_4px)] bg-[size:12px_8px]" />
          </div>

          <p className="mt-6 text-sm text-cream/60 sm:text-base">
            번호가 호명될 때까지 대기실에서 잠시만 기다려 주세요.
          </p>

          <button
            onClick={onReset}
            className="mt-6 rounded-xl border border-cream/30 px-6 py-2.5 text-sm text-cream/80 active:scale-95 sm:px-8 sm:py-3 sm:text-base"
          >
            처음으로
          </button>
        </div>
      )}
    </div>
  );
}
