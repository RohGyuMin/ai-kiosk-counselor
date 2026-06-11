'use client';

// 키오스크 루트 — 화면 상태 머신
// attract(대기) → info(정보입력) → consult(상담) → summary(요약)

import { useCallback, useEffect, useState } from 'react';
import AttractScreen from './AttractScreen';
import InfoForm from './InfoForm';
import ConsultScreen from './ConsultScreen';
import SummaryScreen from './SummaryScreen';

export type Stage = 'attract' | 'info' | 'consult' | 'summary';

export interface Visitor {
  sessionId: string;
  name: string;
  phone: string;
  /** 둘러보기 모드 — 익명 세션, 종료 시 번호표 발급 없이 인사만 */
  anonymous?: boolean;
}

export interface SummaryData {
  questionCount: number;
  topics: string[];
}

export default function KioskApp() {
  const [stage, setStage] = useState<Stage>('attract');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [summary, setSummary] = useState<SummaryData>({ questionCount: 0, topics: [] });
  // 테마 — 기본 라이트, localStorage에 유지
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('kiosk-theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      window.localStorage.setItem('kiosk-theme', next);
      return next;
    });
  }, []);

  const handleStart = useCallback((v: Visitor) => {
    setVisitor(v);
    setStage('consult');
  }, []);

  /** 둘러보기 — 익명 세션으로 바로 상담 진입 (이름·전화 입력 스킵) */
  const handleBrowse = useCallback(async () => {
    let sessionId = 'browse';
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '익명', phone: '000-0000-0000', consent: false }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionId = data.sessionId;
      }
    } catch {
      /* 세션 생성 실패해도 상담은 가능 */
    }
    setVisitor({ sessionId, name: '고객', phone: '', anonymous: true });
    setStage('consult');
  }, []);

  const handleEnd = useCallback(
    async (data: SummaryData) => {
      setSummary(data);
      // 둘러보기 모드는 번호표를 발급할 의미가 없어 바로 처음으로
      if (visitor?.anonymous) {
        setVisitor(null);
        setSummary({ questionCount: 0, topics: [] });
        setStage('attract');
        return;
      }
      setStage('summary');
      if (visitor?.sessionId) {
        try {
          await fetch('/api/session', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: visitor.sessionId }),
          });
        } catch {
          /* 종료 기록 실패는 무시 */
        }
      }
    },
    [visitor],
  );

  const reset = useCallback(() => {
    setVisitor(null);
    setSummary({ questionCount: 0, topics: [] });
    setStage('attract');
  }, []);

  return (
    <main data-theme={theme} className="kiosk-root k-bg relative w-screen overflow-hidden text-ink">
      {stage === 'attract' && (
        <AttractScreen onStartReception={() => setStage('info')} onBrowse={handleBrowse} />
      )}
      {stage === 'info' && <InfoForm onComplete={handleStart} onCancel={reset} />}
      {stage === 'consult' && visitor && (
        <ConsultScreen
          visitor={visitor}
          onEnd={handleEnd}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      {stage === 'summary' && (
        <SummaryScreen name={visitor?.name ?? ''} summary={summary} onReset={reset} />
      )}

      {/* 테마 토글 — 우하단 플로팅. 상담 화면은 입력 바와 겹쳐 헤더로 이동하므로 제외 */}
      {stage !== 'consult' && (
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          className="absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ink/25 bg-deep/70 px-4 py-2.5 text-sm font-medium text-ink/80 shadow-lg backdrop-blur-sm transition hover:bg-deep/90 active:scale-95 sm:bottom-6 sm:right-6 sm:px-5 sm:py-3 sm:text-base"
        >
          {theme === 'light' ? (
            <>
              {/* 달 (→ 다크로) */}
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
              다크 모드
            </>
          ) : (
            <>
              {/* 해 (→ 라이트로) */}
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              라이트 모드
            </>
          )}
        </button>
      )}
    </main>
  );
}
