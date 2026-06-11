'use client';

// 키오스크 화면이 사용하는 병원 정보 컨텍스트 — 진입 시 /api/clinic에서 받아 머지.
// 관리자가 자가편집한 값이 즉시 모든 화면에 반영된다.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CLINIC } from '@/lib/knowledge';

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
  name: CLINIC.name,
  slogan: CLINIC.slogan,
  director: CLINIC.director,
  location: CLINIC.location,
  nearbyStation: CLINIC.nearbyStation,
  parking: CLINIC.parking,
  phone: CLINIC.phone,
  hours: { ...CLINIC.hours },
};

const Ctx = createContext<ClinicView>(DEFAULTS);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<ClinicView>(DEFAULTS);
  useEffect(() => {
    let alive = true;
    fetch('/api/clinic')
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
