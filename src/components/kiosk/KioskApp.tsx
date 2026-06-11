'use client';

// 키오스크 루트 — 화면 상태 머신
// attract(대기) → info(정보입력) → consult(상담) → summary(요약)

import { useCallback, useState } from 'react';
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
    <main className="kiosk-root relative w-screen overflow-hidden bg-navy-900 text-cream">
      {stage === 'attract' && (
        <AttractScreen onStartReception={() => setStage('info')} onBrowse={handleBrowse} />
      )}
      {stage === 'info' && <InfoForm onComplete={handleStart} onCancel={reset} />}
      {stage === 'consult' && visitor && <ConsultScreen visitor={visitor} onEnd={handleEnd} />}
      {stage === 'summary' && (
        <SummaryScreen name={visitor?.name ?? ''} summary={summary} onReset={reset} />
      )}
    </main>
  );
}
