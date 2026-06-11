'use client';

// 키오스크 화면이 사용하는 병원 정보 컨텍스트 — 진입 시 /api/clinic에서 받아 머지.
// 관리자가 자가편집한 값이 즉시 모든 화면에 반영된다.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// 정적 기본값(서버 응답 도착 전 1프레임 렌더링용). knowledge.ts 전체를 import하면
// 서버 전용 모듈(node:sqlite 등)이 클라이언트 번들에 끌려들어와 빌드가 깨지므로 인라인.

type ClinicView = {
  name: string;
  slogan: string;
  director: string;
  location: string;
  nearbyStation: string;
  parking: string;
  phone: string;
  hours: { 평일: string; 토요일: string; 점심시간: string; 일요일공휴일: string };
};

const DEFAULTS: ClinicView = {
  name: '한빛내과의원',
  slogan: '가까운 곳에서, 믿을 수 있는 진료',
  director: '김한빛 원장 (내과 전문의)',
  location: '서울시 마포구 합정로 123, 한빛빌딩 3층',
  nearbyStation: '합정역 3번 출구 도보 2분',
  parking: '건물 지하주차장 2시간 무료 (원무과에서 스티커 수령)',
  phone: '02-123-4567',
  hours: {
    평일: '09:00 – 18:00',
    토요일: '09:00 – 13:00',
    점심시간: '13:00 – 14:00 (진료 중단)',
    일요일공휴일: '휴진',
  },
};

const Ctx = createContext<ClinicView>(DEFAULTS);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<ClinicView>(DEFAULTS);
  useEffect(() => {
    let alive = true;
    fetch('/api/clinic', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setClinic({ ...DEFAULTS, ...data });
      })
      .catch(() => {
        /* 실패 시 정적 기본값 유지 */
      });
    return () => {
      alive = false;
    };
  }, []);
  return <Ctx.Provider value={clinic}>{children}</Ctx.Provider>;
}

export function useClinic(): ClinicView {
  return useContext(Ctx);
}
