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
  const startListening = useCallback((onFinal: (text: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    // 진행 중인 TTS 중단(에코 방지)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

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
  }, []);

  /** 텍스트를 음성으로 출력 */
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

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
