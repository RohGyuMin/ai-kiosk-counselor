// 공개 엔드포인트 — 키오스크 클라이언트가 화면 텍스트에 쓰는 병원 정보를 받는다.
// (관리자가 자가편집한 값이 즉시 화면에 반영됨)
import { NextResponse } from 'next/server';
import { getEffectiveClinic } from '@/lib/clinic-server';

export const runtime = 'nodejs';

export async function GET() {
  const c = getEffectiveClinic();
  return NextResponse.json({
    name: c.name,
    slogan: c.slogan,
    director: c.director,
    location: c.location,
    nearbyStation: c.nearbyStation,
    parking: c.parking,
    phone: c.phone,
    hours: c.hours,
  });
}
