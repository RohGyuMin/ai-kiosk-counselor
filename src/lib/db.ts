// SQLite 데이터 계층 — Node 24 내장 node:sqlite 사용 (네이티브 컴파일 불필요)
//
// 설계 의도: better-sqlite3는 Windows에서 네이티브 빌드 의존성이 있어 시연 환경
// 구성이 까다롭다. Node 24에 내장된 node:sqlite(DatabaseSync)를 쓰면 추가 컴파일
// 없이 동일한 동기 API를 얻을 수 있어 데모 안정성이 높다.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { AdminStats, AnswerSource, MessageRecord, Role, SessionRecord } from './types';

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db) return _db;

  // 데이터 디렉토리 우선순위:
  //   1) DATA_DIR (배포 환경에서 지정) — Cloud Run 등에서 /tmp 같은 쓰기 가능 경로
  //   2) <cwd>/data — 로컬 개발
  // Cloud Run은 컨테이너 파일시스템이 휘발성이므로 /tmp로 두고 데모용으로 사용한다.
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'kiosk.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      consent    INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      ended_at   TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      source     TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      keyword    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_keyword ON events(keyword);
  `);

  _db = db;
  return db;
}

export function createSession(id: string, name: string, phone: string, consent: boolean): void {
  getDb()
    .prepare('INSERT INTO sessions (id, name, phone, consent) VALUES (?, ?, ?, ?)')
    .run(id, name, phone, consent ? 1 : 0);
}

export function endSession(id: string): void {
  getDb()
    .prepare(
      "UPDATE sessions SET ended_at = datetime('now','localtime') WHERE id = ? AND ended_at IS NULL",
    )
    .run(id);
}

export function addMessage(
  sessionId: string,
  role: Role,
  content: string,
  source: AnswerSource | null = null,
): void {
  getDb()
    .prepare('INSERT INTO messages (session_id, role, content, source) VALUES (?, ?, ?, ?)')
    .run(sessionId, role, content, source);
}

export function addEvent(sessionId: string, keyword: string): void {
  getDb().prepare('INSERT INTO events (session_id, keyword) VALUES (?, ?)').run(sessionId, keyword);
}

export function listSessions(): SessionRecord[] {
  return getDb()
    .prepare('SELECT * FROM sessions ORDER BY started_at DESC')
    .all() as unknown as SessionRecord[];
}

export function getMessages(sessionId: string): MessageRecord[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC')
    .all(sessionId) as unknown as MessageRecord[];
}

export function getStats(): AdminStats {
  const db = getDb();
  const totalVisitors = (db.prepare('SELECT COUNT(*) AS c FROM sessions').get() as { c: number }).c;
  const totalSessions = totalVisitors;
  const totalMessages = (
    db.prepare("SELECT COUNT(*) AS c FROM messages WHERE role = 'user'").get() as { c: number }
  ).c;
  const keywordCounts = db
    .prepare('SELECT keyword, COUNT(*) AS count FROM events GROUP BY keyword ORDER BY count DESC')
    .all() as unknown as { keyword: string; count: number }[];
  const dailyVisitors = db
    .prepare(
      'SELECT date(started_at) AS date, COUNT(*) AS count FROM sessions GROUP BY date(started_at) ORDER BY date DESC LIMIT 14',
    )
    .all() as unknown as { date: string; count: number }[];

  return { totalVisitors, totalSessions, totalMessages, keywordCounts, dailyVisitors };
}

/** 수집 데이터(엑셀 추출용) */
export function exportRows(): {
  이름: string;
  전화번호: string;
  동의: string;
  방문일시: string;
  질문수: number;
}[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.phone, s.consent, s.started_at,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.role = 'user') AS q
       FROM sessions s ORDER BY s.started_at DESC`,
    )
    .all() as unknown as {
    id: string;
    name: string;
    phone: string;
    consent: number;
    started_at: string;
    q: number;
  }[];
  return rows.map((r) => ({
    이름: r.name,
    전화번호: r.phone,
    동의: r.consent ? '동의' : '미동의',
    방문일시: r.started_at,
    질문수: r.q,
  }));
}
