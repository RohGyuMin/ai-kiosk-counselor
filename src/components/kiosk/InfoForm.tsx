'use client';

// 정보 입력 화면 — 이름(텍스트) + 전화번호(터치 키패드) + 개인정보 동의
import { useState } from 'react';
import type { Visitor } from './KioskApp';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '확인'];

function formatPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function InfoForm({
  onComplete,
  onCancel,
}: {
  onComplete: (v: Visitor) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // digits only
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const valid = name.trim().length >= 2 && phone.length >= 10 && consent;

  function press(key: string) {
    setError('');
    if (key === '⌫') setPhone((p) => p.slice(0, -1));
    else if (key === '확인') void submit();
    else if (phone.length < 11) setPhone((p) => p + key);
  }

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: formatPhone(phone), consent }),
      });
      if (!res.ok) throw new Error('세션 생성 실패');
      const { sessionId } = await res.json();
      onComplete({ sessionId, name: name.trim(), phone: formatPhone(phone) });
    } catch {
      setError('상담 시작에 실패했습니다. 다시 시도해 주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* 좌측(데스크탑) / 상단(모바일): 입력 폼 */}
      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16 lg:py-0">
        <h2 className="font-serif-display text-2xl font-bold text-gold-500 sm:text-4xl">
          내원 정보 입력
        </h2>
        <p className="mt-2 text-sm text-ink/60 sm:mt-3 sm:text-lg">
          맞춤 안내를 위해 성함과 연락처를 입력해 주세요.
        </p>

        <label className="mt-6 block text-base text-ink/80 sm:mt-10 sm:text-lg">성함</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          maxLength={20}
          className="mt-2 w-full rounded-xl border border-gold-500/40 bg-deep/60 px-4 py-3 text-xl text-ink outline-none focus:border-gold-400 sm:px-5 sm:py-4 sm:text-2xl"
        />

        <label className="mt-4 block text-base text-ink/80 sm:mt-6 sm:text-lg">연락처</label>
        {/* 모바일: 시스템 숫자 키보드로 직접 입력 */}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          pattern="[0-9]*"
          value={formatPhone(phone)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
            setPhone(digits);
            setError('');
          }}
          placeholder="010-0000-0000"
          className="mt-2 w-full rounded-xl border border-gold-500/40 bg-deep/60 px-4 py-3 text-xl tracking-wider text-ink outline-none placeholder:text-ink/30 focus:border-gold-400 sm:px-5 sm:py-4 sm:text-2xl lg:hidden"
        />
        {/* 데스크탑·키오스크 화면(lg+): 오른쪽 큰 키패드용 표시 영역 */}
        <div className="mt-2 hidden w-full rounded-xl border border-gold-500/40 bg-deep/60 px-4 py-3 text-xl tracking-wider text-ink sm:px-5 sm:py-4 sm:text-2xl lg:block">
          {phone ? formatPhone(phone) : <span className="text-ink/30">010-0000-0000</span>}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-ink/80 sm:mt-6 sm:items-center">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-gold-500 sm:mt-0 sm:h-6 sm:w-6"
          />
          <span className="text-sm sm:text-base">
            개인정보 수집·이용에 동의합니다. (진료 안내 및 예약 확인 목적)
          </span>
        </label>

        {error && <p className="mt-4 text-sm text-red-400 sm:text-base">{error}</p>}

        <div className="mt-6 flex gap-3 sm:mt-8 sm:gap-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-ink/30 px-5 py-3 text-base text-ink/70 active:scale-95 sm:px-8 sm:py-4 sm:text-xl"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="flex-1 rounded-xl bg-gold-500 px-5 py-3 text-base font-bold text-navy-900 transition active:scale-95 disabled:opacity-40 sm:px-8 sm:py-4 sm:text-xl"
          >
            {submitting ? '안내 준비 중…' : '안내 시작하기'}
          </button>
        </div>
      </div>

      {/* 키패드: 키오스크/태블릿(lg+)에서만 표시. 모바일은 시스템 숫자 키보드 사용. */}
      <div className="hidden flex-col justify-center bg-ink/5 lg:flex lg:w-1/2 lg:px-16 lg:py-0">
        <p className="mb-6 text-center text-lg text-ink/50">연락처를 입력하세요</p>
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={`flex h-24 items-center justify-center rounded-2xl text-3xl font-semibold transition active:scale-95 ${
                k === '확인'
                  ? 'bg-gold-500 text-navy-900'
                  : k === '⌫'
                    ? 'bg-ink/15 text-ink'
                    : 'bg-ink/10 text-ink hover:bg-ink/20'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
