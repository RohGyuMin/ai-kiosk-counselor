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
    <div className="flex h-full w-full bg-gradient-to-br from-navy-800 to-navy-900">
      {/* 좌측: 입력 폼 */}
      <div className="flex w-1/2 flex-col justify-center px-16">
        <h2 className="font-serif-display text-4xl font-bold text-gold-400">상담 정보 입력</h2>
        <p className="mt-3 text-lg text-cream/60">
          맞춤 상담을 위해 성함과 연락처를 입력해 주세요.
        </p>

        <label className="mt-10 block text-lg text-cream/80">성함</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          maxLength={20}
          className="mt-2 w-full rounded-xl border border-gold-500/40 bg-navy-900/60 px-5 py-4 text-2xl text-cream outline-none focus:border-gold-400"
        />

        <label className="mt-6 block text-lg text-cream/80">연락처</label>
        <div className="mt-2 w-full rounded-xl border border-gold-500/40 bg-navy-900/60 px-5 py-4 text-2xl tracking-wider text-cream">
          {phone ? formatPhone(phone) : <span className="text-cream/30">010-0000-0000</span>}
        </div>

        <label className="mt-6 flex cursor-pointer items-center gap-3 text-cream/80">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-6 w-6 accent-gold-500"
          />
          <span className="text-base">
            개인정보 수집·이용에 동의합니다. (상담 품질 향상 및 분양 안내 목적)
          </span>
        </label>

        {error && <p className="mt-4 text-red-300">{error}</p>}

        <div className="mt-8 flex gap-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-cream/30 px-8 py-4 text-xl text-cream/70 active:scale-95"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="flex-1 rounded-xl bg-gold-500 px-8 py-4 text-xl font-bold text-navy-900 transition active:scale-95 disabled:opacity-40"
          >
            {submitting ? '상담 준비 중…' : '상담 시작하기'}
          </button>
        </div>
      </div>

      {/* 우측: 숫자 키패드 */}
      <div className="flex w-1/2 flex-col justify-center bg-navy-900/40 px-16">
        <p className="mb-6 text-center text-lg text-cream/50">연락처를 입력하세요</p>
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={`flex h-24 items-center justify-center rounded-2xl text-3xl font-semibold transition active:scale-95 ${
                k === '확인'
                  ? 'bg-gold-500 text-navy-900'
                  : k === '⌫'
                    ? 'bg-navy-700 text-cream'
                    : 'bg-cream/10 text-cream hover:bg-cream/20'
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
