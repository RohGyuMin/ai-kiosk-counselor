'use client';

// 병원 정보 자가편집 — 미팅 자리에서 30초 안에 해당 병원 정보 입력 가능
// 저장 즉시 키오스크 AI 응답·인사·시간 안내에 반영된다.

import { useCallback, useEffect, useState } from 'react';

interface ClinicForm {
  name: string;
  slogan: string;
  director: string;
  location: string;
  nearbyStation: string;
  parking: string;
  phone: string;
  hoursWeekday: string;
  hoursSaturday: string;
  hoursLunch: string;
  hoursSunday: string;
}

const EMPTY: ClinicForm = {
  name: '',
  slogan: '',
  director: '',
  location: '',
  nearbyStation: '',
  parking: '',
  phone: '',
  hoursWeekday: '',
  hoursSaturday: '',
  hoursLunch: '',
  hoursSunday: '',
};

export default function ClinicEditPage() {
  const [form, setForm] = useState<ClinicForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clinic', { cache: 'no-store' });
      const data = await res.json();
      setForm({ ...EMPTY, ...data });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof ClinicForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/clinic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-navy-900">병원 정보 편집</h1>
            <p className="text-sm text-slate-500">
              저장 즉시 키오스크 AI 응답·시간 안내에 반영됩니다.
            </p>
          </div>
          <a href="/admin" className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
            ← 대시보드
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {loading ? (
          <p className="text-sm text-slate-400">불러오는 중…</p>
        ) : (
          <>
            <Section title="기본 정보">
              <Field
                label="병원명"
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="○○내과의원"
              />
              <Field
                label="슬로건"
                value={form.slogan}
                onChange={(v) => set('slogan', v)}
                placeholder="가까운 곳에서, 믿을 수 있는 진료"
              />
              <Field
                label="원장명"
                value={form.director}
                onChange={(v) => set('director', v)}
                placeholder="홍길동 원장 (내과 전문의)"
              />
              <Field
                label="전화"
                value={form.phone}
                onChange={(v) => set('phone', v)}
                placeholder="02-1234-5678"
              />
            </Section>

            <Section title="위치">
              <Field
                label="주소"
                value={form.location}
                onChange={(v) => set('location', v)}
                placeholder="서울시 마포구 ○○로 123, ○○빌딩 3층"
              />
              <Field
                label="가까운 역"
                value={form.nearbyStation}
                onChange={(v) => set('nearbyStation', v)}
                placeholder="합정역 3번 출구 도보 2분"
              />
              <Field
                label="주차 안내"
                value={form.parking}
                onChange={(v) => set('parking', v)}
                placeholder="건물 지하주차장 2시간 무료"
              />
            </Section>

            <Section title="진료시간">
              <Field
                label="평일"
                value={form.hoursWeekday}
                onChange={(v) => set('hoursWeekday', v)}
                placeholder="09:00 – 18:00"
              />
              <Field
                label="토요일"
                value={form.hoursSaturday}
                onChange={(v) => set('hoursSaturday', v)}
                placeholder="09:00 – 13:00"
              />
              <Field
                label="점심시간"
                value={form.hoursLunch}
                onChange={(v) => set('hoursLunch', v)}
                placeholder="13:00 – 14:00 (진료 중단)"
              />
              <Field
                label="일요일·공휴일"
                value={form.hoursSunday}
                onChange={(v) => set('hoursSunday', v)}
                placeholder="휴진"
              />
            </Section>

            <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border bg-white p-4 shadow-md">
              <div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {saved && (
                  <p className="text-sm text-green-600">✓ 저장됐습니다 — 키오스크에 바로 반영</p>
                )}
                {!error && !saved && (
                  <p className="text-xs text-slate-400">
                    빈 칸은 기본값(데모 한빛내과)으로 유지됩니다.
                  </p>
                )}
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-800"
      />
    </label>
  );
}
