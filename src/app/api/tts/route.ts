// 텍스트 → 음성(WAV) 변환. 키 없음/실패 시 204 → 클라이언트가 브라우저 음성으로 폴백
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) return new NextResponse(null, { status: 400 });

    const result = await synthesizeSpeech(text.trim());
    if (!result) return new NextResponse(null, { status: 204 }); // 폴백 신호

    return new NextResponse(new Uint8Array(result.buf), {
      status: 200,
      headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[tts] 처리 실패:', err);
    return new NextResponse(null, { status: 204 });
  }
}
