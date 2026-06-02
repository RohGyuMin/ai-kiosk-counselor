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

  // 재생 중인 서버 TTS 오디오 중단
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
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

  /** 브라우저 기본 TTS (폴백) */
  const speakBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = 1.02;
    utter.pitch = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  /**
   * 텍스트를 음성으로 출력. 먼저 서버(Gemini) 신경망 TTS를 시도하고,
   * 키 없음/실패(204·오류) 시 브라우저 기본 음성으로 폴백한다.
   */
  const speak = useCallback(
    async (text: string) => {
      stopAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(true);

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        // 204(폴백 신호)·실패 → 브라우저 음성
        if (res.status !== 200) {
          speakBrowser(text);
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          speakBrowser(text);
        };
        await audio.play();
      } catch {
        // 네트워크 등 실패 → 브라우저 음성
        speakBrowser(text);
      }
    },
    [stopAudio, speakBrowser],
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
  };
}
