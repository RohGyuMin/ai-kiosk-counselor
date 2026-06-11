'use client';

// 브라우저 Web Speech API 기반 음성 입출력 훅
//
// 설계 의도: STT/TTS를 브라우저 내장 API로 처리하면 별도 음성 서버·API 키가
// 필요 없고 지연이 낮다. 미지원 브라우저에서는 supported=false로 떨어져 상위
// 컴포넌트가 텍스트 모드로 자동 강등한다.

import { useCallback, useEffect, useRef, useState } from 'react';

// 표준 lib.dom에 없는 SpeechRecognition 최소 타입 선언
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 재생 세대 토큰: 새 speak가 시작되면 증가시켜, 진행 중이던 이전 요청을 무효화한다.
  const playTokenRef = useRef(0);
  // iOS/모바일은 첫 사용자 제스처 직후가 아니면 audio.play()를 차단한다.
  // 첫 인터랙션 시 무음 오디오를 한 번 재생해 정책을 "잠금 해제"한다.
  const unlockedRef = useRef(false);
  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    try {
      // 1프레임짜리 무음 WAV (44바이트 헤더 + 0바이트 데이터)
      const silentWav =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      const a = new Audio(silentWav);
      a.muted = true;
      void a.play().catch(() => {});
      // 브라우저 TTS도 모바일에서 첫 제스처 컨텍스트가 필요할 수 있어 미리 깨운다
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const warm = new SpeechSynthesisUtterance(' ');
        warm.volume = 0;
        window.speechSynthesis.speak(warm);
      }
    } catch {
      /* 무시 — 폴백은 speak에서 처리 */
    }
  }, []);

  // 재생 중인 서버 TTS 오디오 중단 (진행 중이던 speak도 무효화)
  const stopAudio = useCallback(() => {
    playTokenRef.current += 1; // 토큰 선증가 → 이후 발동되는 핸들러는 '구세대'로 무시됨
    const a = audioRef.current;
    if (a) {
      a.pause();
      // error 이벤트를 인위적으로 발생시켜 speak() 내부의 재생 대기 promise를 해제한다.
      // (onerror 핸들러는 resolve(false)만 하므로 폴백 음성이 끼어들지 않는다)
      a.dispatchEvent(new Event('error'));
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    const hasSTT = !!getRecognitionCtor();
    const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSupported(hasSTT && hasTTS);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  /** 음성 인식 시작. 최종 인식 결과를 onFinal로 전달 */
  const startListening = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;

      // 진행 중인 TTS 중단(에코 방지)
      stopAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);

      const recognition = new Ctor();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = true;
      setTranscript('');

      recognition.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        setTranscript(final || interim);
        if (final) {
          onFinal(final.trim());
          setListening(false);
        }
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    },
    [stopAudio],
  );

  /** 브라우저 기본 TTS (폴백) — 발화가 끝나면 resolve */
  const speakBrowser = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setSpeaking(false);
        return resolve();
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      utter.rate = 1.02;
      utter.pitch = 1.0;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        resolve();
      };
      utter.onerror = () => {
        setSpeaking(false);
        resolve();
      };
      window.speechSynthesis.speak(utter);
    });
  }, []);

  /**
   * 텍스트를 음성으로 출력. 먼저 서버 신경망 TTS를 시도하고, 실패 시 브라우저 음성 폴백.
   * **재생이 끝난 시점에 resolve**되며, 끝까지 정상 재생했으면 true를 반환한다
   * (도중에 새 speak로 대체/중단됐으면 false) — 자동 청취 등 후속 동작의 트리거로 사용.
   */
  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      unlockAudio(); // 모바일 자동재생 정책 우회 (no-op if already unlocked)
      stopAudio(); // 이전 재생 중단 + 토큰 증가
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      const myToken = playTokenRef.current; // 이번 speak의 세대
      setSpeaking(true);

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        // 더 새로운 speak가 시작됐다면 이 요청은 폐기
        if (myToken !== playTokenRef.current) return false;

        // 204(폴백 신호)·실패 → 브라우저 음성
        if (res.status !== 200) {
          await speakBrowser(text);
          return myToken === playTokenRef.current;
        }

        const blob = await res.blob();
        if (myToken !== playTokenRef.current) return false; // 재확인

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        // 재생 종료까지 대기
        const completed = await new Promise<boolean>((resolve) => {
          audio.onended = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            resolve(true);
          };
          audio.onerror = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            resolve(false);
          };
          audio.play().catch(() => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            resolve(false);
          });
        });
        return completed && myToken === playTokenRef.current;
      } catch {
        // 네트워크 등 실패 → 브라우저 음성 (단, 최신 요청일 때만)
        if (myToken === playTokenRef.current) {
          await speakBrowser(text);
          return myToken === playTokenRef.current;
        }
        return false;
      }
    },
    [unlockAudio, stopAudio, speakBrowser],
  );

  const stopSpeaking = useCallback(() => {
    stopAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [stopAudio]);

  return {
    supported,
    listening,
    speaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    unlockAudio,
  };
}
