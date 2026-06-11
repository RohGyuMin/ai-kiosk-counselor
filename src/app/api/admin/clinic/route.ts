// 병원 정보 자가편집 — GET(현재 편집된 값) / PUT(저장)
// /admin 경로 미들웨어가 Basic Auth로 보호함
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEditable, type ClinicEditable } from '@/lib/knowledge';
import { setClinicOverride } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getCurrentEditable());
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as ClinicEditable;
    // 화이트리스트만 저장 (예상 외 키 차단)
    const clean: ClinicEditable = {
      name: body.name?.trim(),
      slogan: body.slogan?.trim(),
      director: body.director?.trim(),
      location: body.location?.trim(),
      nearbyStation: body.nearbyStation?.trim(),
      parking: body.parking?.trim(),
      phone: body.phone?.trim(),
      hoursWeekday: body.hoursWeekday?.trim(),
      hoursSaturday: body.hoursSaturday?.trim(),
      hoursLunch: body.hoursLunch?.trim(),
      hoursSunday: body.hoursSunday?.trim(),
    };
    setClinicOverride(clean as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[clinic] 저장 실패:', err);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}
