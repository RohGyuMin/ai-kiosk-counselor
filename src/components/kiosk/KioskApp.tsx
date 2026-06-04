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

  const handleEnd = useCallback(
    async (data: SummaryData) => {
      setSummary(data);
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
      {stage === 'attract' && <AttractScreen onStart={() => setStage('info')} />}
      {stage === 'info' && <InfoForm onComplete={handleStart} onCancel={reset} />}
      {stage === 'consult' && visitor && <ConsultScreen visitor={visitor} onEnd={handleEnd} />}
      {stage === 'summary' && (
        <SummaryScreen name={visitor?.name ?? ''} summary={summary} onReset={reset} />
      )}
    </main>
  );
}
