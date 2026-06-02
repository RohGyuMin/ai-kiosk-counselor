// 서버 TTS — Gemini 신경망 음성 합성
//
// 설계 의도: 브라우저 기본 TTS(Web Speech)는 한국어 음색이 딱딱하다. 같은 Gemini
// 키로 신경망 TTS를 호출해 사람에 가까운 음성을 만든다. Gemini는 raw PCM(16-bit)을
// 돌려주므로 브라우저가 바로 재생할 수 있도록 WAV 헤더를 씌워 반환한다.
// 키가 없거나 실패하면 null을 반환해, 클라이언트가 브라우저 음성으로 폴백한다.

import { GoogleGenAI, Modality } from '@google/genai';

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
// 상담사 톤의 차분한 음성. 사용 가능 voice: Kore, Aoede, Leda, Puck, Charon, Zephyr 등
const TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';

export async function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
        },
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

/** "audio/L16;codec=pcm;rate=24000" 형태에서 샘플레이트 추출 */
function parseSampleRate(mimeType?: string): number | null {
  if (!mimeType) return null;
  const m = mimeType.match(/rate=(\d+)/);
  return m ? Number(m[1]) : null;
}

/** raw 16-bit mono PCM → WAV (44바이트 헤더 부착) */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt 청크 크기
  header.writeUInt16LE(1, 20); // 오디오 포맷 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
