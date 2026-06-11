'use client';

// 관리자 대시보드 — 이용내역 / 수집데이터 / 통계 / 엑셀 다운로드
import { useCallback, useEffect, useState } from 'react';
import type { AdminStats, MessageRecord, SessionRecord } from '@/lib/types';

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selected, setSelected] = useState<SessionRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setStats(data.stats ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openSession(s: SessionRecord) {
    setSelected(s);
    const res = await fetch(`/api/admin?sessionId=${encodeURIComponent(s.id)}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  const maxKeyword = stats?.keywordCounts[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-navy-900">AI 키오스크 관리자</h1>
            <p className="text-sm text-slate-500">한빛내과의원 · AI 안내 키오스크</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/clinic"
              className="rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-800/5"
            >
              병원 정보 편집
            </a>
            <button
              onClick={load}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              새로고침
            </button>
            <a
              href="/api/admin/export"
              className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
            >
              엑셀 다운로드
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* 인력 절감 효과 카드 — 응대 1건당 1.5분 환산 (영업·운영 보고용) */}
        {stats && stats.totalMessages > 0 && (
          <section className="overflow-hidden rounded-xl bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wider text-gold-400/90">
                  AI 응대 효과
                </p>
                <p className="mt-1.5 text-2xl font-bold sm:text-3xl">
                  접수 인력 약{' '}
                  <span className="text-gold-400">
                    {Math.round((stats.totalMessages * 1.5) / 60)}시간{' '}
                    {Math.round((stats.totalMessages * 1.5) % 60)}분
                  </span>{' '}
                  절감
                </p>
                <p className="mt-2 text-sm text-white/70 sm:text-base">
                  누적 응대 {stats.totalMessages.toLocaleString()}건 · 방문자{' '}
                  {stats.totalVisitors.toLocaleString()}명 · 응대 1건당 평균 1.5분 환산
                </p>
              </div>
              <div className="hidden shrink-0 rounded-lg bg-white/10 p-3 sm:block">
                <svg
                  className="h-7 w-7 text-gold-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                </svg>
              </div>
            </div>
          </section>
        )}

        {/* 통계 카드 */}
        <section className="grid grid-cols-3 gap-4">
          <StatCard label="방문자 수" value={stats?.totalVisitors ?? 0} suffix="명" />
          <StatCard label="총 질문 수" value={stats?.totalMessages ?? 0} suffix="건" />
          <StatCard
            label="평균 질문/방문"
            value={
              stats && stats.totalVisitors
                ? Math.round((stats.totalMessages / stats.totalVisitors) * 10) / 10
                : 0
            }
            suffix="건"
          />
        </section>

        {/* 방문 추이 — 일별 / 시간대 */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* 일별 방문 (최근 14일) */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold">일별 방문 추이 (최근 14일)</h2>
            {stats && stats.dailyVisitors.length > 0 ? (
              <div className="flex h-36 items-end gap-1.5">
                {[...stats.dailyVisitors].reverse().map((d) => {
                  const max = Math.max(...stats.dailyVisitors.map((x) => x.count), 1);
                  return (
                    <div key={d.date} className="group relative flex-1">
                      <div
                        className="w-full rounded-t bg-navy-800 transition group-hover:bg-gold-500"
                        style={{ height: `${Math.max((d.count / max) * 120, 4)}px` }}
                      />
                      <p className="mt-1 origin-left -rotate-45 text-[9px] text-slate-400">
                        {d.date.slice(5)}
                      </p>
                      <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 text-xs font-semibold text-navy-900 group-hover:block">
                        {d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">아직 데이터가 없습니다.</p>
            )}
          </div>

          {/* 시간대 분포 */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold">시간대별 방문 분포</h2>
            {stats && stats.hourlyVisitors.length > 0 ? (
              <div className="flex h-36 items-end gap-1">
                {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => {
                  const found = stats.hourlyVisitors.find((x) => x.hour === hour);
                  const count = found?.count ?? 0;
                  const max = Math.max(...stats.hourlyVisitors.map((x) => x.count), 1);
                  return (
                    <div key={hour} className="group relative flex-1">
                      <div
                        className={`w-full rounded-t transition group-hover:bg-gold-500 ${count > 0 ? 'bg-navy-800' : 'bg-slate-100'}`}
                        style={{ height: `${Math.max((count / max) * 120, 4)}px` }}
                      />
                      <p className="mt-1 text-center text-[9px] text-slate-400">{hour}</p>
                      <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 text-xs font-semibold text-navy-900 group-hover:block">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">아직 데이터가 없습니다.</p>
            )}
            <p className="mt-2 text-right text-xs text-slate-400">08시 ~ 20시</p>
          </div>
        </section>

        {/* 질문 키워드 빈도 */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-semibold">주요 질문 키워드</h2>
          {stats && stats.keywordCounts.length > 0 ? (
            <div className="space-y-2">
              {stats.keywordCounts.map((k) => (
                <div key={k.keyword} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-slate-600">{k.keyword}</span>
                  <div className="h-6 flex-1 rounded bg-slate-100">
                    <div
                      className="h-6 rounded bg-gold-500"
                      style={{ width: `${(k.count / maxKeyword) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-medium">{k.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">아직 데이터가 없습니다.</p>
          )}
        </section>

        {/* 이용 내역 / 수집 데이터 */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-semibold">이용 내역 · 수집 데이터</h2>
          {loading ? (
            <p className="text-sm text-slate-400">불러오는 중…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-400">
              방문 기록이 없습니다. 키오스크 화면에서 상담을 진행해 보세요.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2">이름</th>
                  <th>전화번호</th>
                  <th>동의</th>
                  <th>방문 일시</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-3 font-medium">{s.name}</td>
                    <td>{s.phone}</td>
                    <td>
                      {s.consent ? (
                        <span className="text-green-600">동의</span>
                      ) : (
                        <span className="text-slate-400">미동의</span>
                      )}
                    </td>
                    <td className="text-slate-600">{s.started_at}</td>
                    <td className="text-right">
                      <button
                        onClick={() => openSession(s)}
                        className="rounded-md border px-3 py-1 text-xs hover:bg-slate-100"
                      >
                        대화 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* 대화 상세 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {selected.name} · {selected.phone}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400">대화 기록이 없습니다.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      m.role === 'user' ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.content}
                    {m.role === 'assistant' && m.source === 'fallback' && (
                      <span className="ml-2 text-xs text-slate-400">· 오프라인</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-navy-900">
        {value}
        <span className="ml-1 text-base font-normal text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}
