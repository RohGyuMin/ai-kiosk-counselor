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
  const [policyOpen, setPolicyOpen] = useState(false);
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

        {/* 개인정보 수집 동의 — 항목·목적·보관기간 명시 + 전체 보기 모달 */}
        <div className="mt-4 rounded-xl border border-ink/15 bg-ink/5 p-4 text-sm text-ink/80 sm:mt-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-gold-500 sm:h-6 sm:w-6"
            />
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                개인정보 수집·이용에 동의합니다 <span className="text-red-500">*</span>
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/70 sm:text-sm">
                <span className="font-medium">수집 항목</span> 성함, 연락처 &nbsp;·&nbsp;{' '}
                <span className="font-medium">목적</span> 진료 안내 및 예약 확인 &nbsp;·&nbsp;{' '}
                <span className="font-medium">보관</span> 1년 후 자동 파기
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPolicyOpen(true);
                }}
                className="mt-1.5 text-xs text-ink/60 underline hover:text-ink"
              >
                전체 내용 보기
              </button>
            </div>
          </label>
        </div>

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

      {/* 처리방침 모달 */}
      {policyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
          onClick={() => setPolicyOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl sm:p-8"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-navy-900 sm:text-xl">
                개인정보 수집·이용 동의
              </h3>
              <button
                onClick={() => setPolicyOpen(false)}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm leading-relaxed">
              <Item label="1. 수집·이용 목적">
                · 진료 안내 및 대기 호출
                <br />· 예약 확인·변경 안내
                <br />· 진료 후 안내·재방문 안내
              </Item>
              <Item label="2. 수집 항목">
                필수 — 성함, 휴대전화번호
                <br />
                선택 — 없음
              </Item>
              <Item label="3. 보유·이용 기간">
                동의일로부터 <span className="font-semibold">1년</span> (마지막 진료일 기준)
                <br />
                목적 달성 후 또는 동의 철회 시 즉시 파기합니다.
              </Item>
              <Item label="4. 파기 방법">
                전자적 파일 — 복구·재생할 수 없는 방법으로 영구 삭제
                <br />
                출력물 — 분쇄 또는 소각
              </Item>
              <Item label="5. 동의 거부 권리 및 불이익">
                동의를 거부하실 수 있습니다. 다만 본 키오스크를 통한 자동 안내·예약 확인 서비스는
                제한될 수 있으며, 원무과를 통해 직접 이용하실 수 있습니다.
                <br />
                <span className="text-slate-500">
                  ※{' '}
                  <a href="/" className="underline">
                    대기 화면 → &lsquo;안내만 받기&rsquo;
                  </a>{' '}
                  로 개인정보 없이 둘러보실 수도 있습니다.
                </span>
              </Item>
              <Item label="6. 제3자 제공">
                수집한 정보는 외부에 제공하지 않습니다. (법령에 의한 경우 제외)
              </Item>
              <Item label="7. 문의처">개인정보 보호책임자 — 원무과 ☎ 02-123-4567</Item>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setConsent(true);
                  setPolicyOpen(false);
                }}
                className="flex-1 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-900 active:scale-95"
              >
                동의하고 닫기
              </button>
              <button
                onClick={() => setPolicyOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-navy-900">{label}</p>
      <p className="mt-1 text-slate-700">{children}</p>
    </div>
  );
}
