# 데이터베이스 설계서

> AI 키오스크 상담사 데모 · SQLite (Node 24 내장 `node:sqlite`)

## 1. 개요

| 항목 | 내용 |
| --- | --- |
| DBMS | SQLite 3 (Node.js 24 내장 `node:sqlite` / `DatabaseSync`) |
| 파일 | `data/kiosk.db` (gitignore, 최초 요청 시 자동 생성) |
| 문자셋 | UTF-8 |
| 접근 | 서버 라우트(`src/lib/db.ts`)에서만 접근, 동기 API |

**선택 근거**: 시범 운영 규모(단일 키오스크)에서는 별도 DB 서버가 과하다. 파일 기반
SQLite로 조회·통계·엑셀 추출을 즉시 시연할 수 있고, Node 24 내장 모듈을 써서 네이티브
컴파일(Windows 빌드툴) 의존성을 제거했다. 운영 확장 시 동일 스키마를 PostgreSQL로
이관하기 쉽도록 표준 SQL만 사용한다.

## 2. ERD

```
sessions (방문 세션 / 수집 데이터)
  id PK
  ├─< messages (대화 로그)       session_id FK
  └─< events   (질문 키워드 통계)  session_id FK
```

## 3. 테이블 정의

### 3.1 sessions — 방문 세션 및 수집 개인정보

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | 방문자 이름 |
| phone | TEXT | NOT NULL | 연락처 (010-0000-0000) |
| consent | INTEGER | NOT NULL, default 0 | 개인정보 수집 동의 (0/1) |
| started_at | TEXT | NOT NULL, default now | 상담 시작 일시(현지시간) |
| ended_at | TEXT | NULL | 상담 종료 일시 |

### 3.2 messages — 대화 로그

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INTEGER | PK AUTOINCREMENT | |
| session_id | TEXT | NOT NULL, FK→sessions(id) | 세션 |
| role | TEXT | NOT NULL | `user` / `assistant` |
| content | TEXT | NOT NULL | 발화/답변 내용 |
| source | TEXT | NULL | 답변 출처 `llm` / `fallback` |
| created_at | TEXT | NOT NULL, default now | 기록 시각 |

### 3.3 events — 질문 키워드 통계

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | INTEGER | PK AUTOINCREMENT | |
| session_id | TEXT | NOT NULL, FK→sessions(id) | 세션 |
| keyword | TEXT | NOT NULL | 분류 키워드(평형/타입, 분양가/금융, 청약일정 등) |
| created_at | TEXT | NOT NULL, default now | 기록 시각 |

**인덱스**: `idx_messages_session(session_id)`, `idx_events_keyword(keyword)`

## 4. 주요 쿼리

| 기능 | 쿼리 요지 |
| --- | --- |
| 이용 내역 | `SELECT * FROM sessions ORDER BY started_at DESC` |
| 대화 상세 | `SELECT * FROM messages WHERE session_id=? ORDER BY id` |
| 방문자 수 | `SELECT COUNT(*) FROM sessions` |
| 키워드 빈도 | `SELECT keyword, COUNT(*) FROM events GROUP BY keyword ORDER BY 2 DESC` |
| 일자별 방문 | `SELECT date(started_at), COUNT(*) FROM sessions GROUP BY 1` |
| 엑셀 추출 | 세션 + 세션별 질문 수 조인 후 `xlsx`로 직렬화 |

## 5. 개인정보 처리 (데모 한정)

- 수집 항목: 이름, 연락처, 동의 여부. 동의 체크 없이는 상담을 시작하지 않는다.
- 실제 운영 시 권장: 저장 시 암호화, 보관 기간 정책(자동 파기), 관리자 접근 인증/감사 로그.
  (데모 범위에서는 미구현 — README 로드맵 참고)
