// 서버 TTS — Google Cloud TTS(Neural2) 우선, 실패 시 Gemini TTS 폴백
//
// 설계 의도:
// - 사용자 체감 음성 지연을 줄이는 게 핵심. Gemini TTS API는 한국어 짧은 문장에도
//   ~4초 걸리지만 Cloud TTS Neural2는 보통 ~1초로 응답한다.
// - Cloud TTS를 우선 호출하고 실패/미인증/API 미활성 시 Gemini TTS로 폴백,
//   둘 다 안 되면 null → 클라이언트는 브라우저 기본 음성으로 폴백.
// - Cloud TTS는 응답 시 LINEAR16 WAV(또는 base64 audioContent)를 돌려준다.
//   Gemini는 raw PCM이라 WAV 헤더를 씌운다.

import { GoogleAuth } from 'google-auth-library';
import { GoogleGenAI, Modality } from '@google/genai';

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';

// Cloud TTS 음성: ko-KR-Neural2-A(여), B(여), C(남) 등. A가 가장 자연스러운 여성 톤.
const CLOUD_TTS_VOICE = process.env.CLOUD_TTS_VOICE || 'ko-KR-Neural2-A';

// 인증 토큰 캐시 (만료까지 재사용)
let _auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!_auth) {
    _auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  }
  return _auth;
}

/** Google Cloud Text-to-Speech 시도. ADC(Cloud Run의 기본 SA)로 인증. */
async function trySynthesizeCloudTts(text: string): Promise<Buffer | null> {
  try {
    const client = await getAuth().getClient();
    const token = await client.getAccessToken();
    if (!token?.token) return null;

    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.token}` },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: CLOUD_TTS_VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[tts] Cloud TTS 비정상:', res.status, body.slice(0, 200));
      return null;
    }
    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) return null;
    return Buffer.from(json.audioContent, 'base64'); // MP3 바이너리
  } catch (err) {
    console.warn('[tts] Cloud TTS 실패 (Gemini로 폴백):', err);
    return null;
  }
}

/** Gemini TTS 시도 — 폴백 경로 */
async function trySynthesizeGeminiTts(text: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
      },
    });
    const inline = res.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inline?.data) return null;
    const pcm = Buffer.from(inline.data, 'base64');
    const rate = parseSampleRate(inline.mimeType) ?? 24000;
    return pcmToWav(pcm, rate);
  } catch (err) {
    console.error('[tts] Gemini TTS 실패:', err);
    return null;
  }
}

export interface SynthesizedAudio {
  buf: Buffer;
  contentType: 'audio/mpeg' | 'audio/wav';
}

/** Cloud TTS → Gemini TTS → null 순서로 폴백 */
export async function synthesizeSpeech(text: string): Promise<SynthesizedAudio | null> {
  const cloud = await trySynthesizeCloudTts(text);
  if (cloud) return { buf: cloud, contentType: 'audio/mpeg' };
  const gem = await trySynthesizeGeminiTts(text);
  if (gem) return { buf: gem, contentType: 'audio/wav' };
  return null;
}

function parseSampleRate(mimeType?: string): number | null {
  if (!mimeType) return null;
  const m = mimeType.match(/rate=(\d+)/);
  return m ? Number(m[1]) : null;
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
