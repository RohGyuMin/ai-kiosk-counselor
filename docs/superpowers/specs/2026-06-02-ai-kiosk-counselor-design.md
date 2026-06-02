# AI 키오스크 상담사 — 설계 문서

> 모델하우스 방문객 맞춤형 AI 상담사 키오스크 소프트웨어 (포트폴리오/시연용 데모)

작성일: 2026-06-02

---

## 1. 배경 및 목표

10월 말 오픈 예정 모델하우스 현장에 시범 도입할 **AI 기반 상담사 키오스크**를 가정한
포트폴리오용 동작 데모. 방문객이 이름·전화번호를 입력하고, 음성 또는 터치로 청약·아파트
관련 질문을 하면 AI가 음성과 화면으로 답변한다. 관리자는 이용 내역과 수집 데이터를
조회·다운로드한다.

**데모의 목적은 "수주·시연"이다.** 따라서 (1) 발표 현장에서 키 없이도 끊김 없이 돌아가야
하고, (2) 코드를 보는 사람이 "왜 이렇게 설계했는지"를 README/문서만으로 이해할 수 있어야
한다.

## 2. 범위

### 포함
- 키오스크 사용자 흐름 전체: 대기 → 정보 입력 → 음성/텍스트 상담 → 요약
- 브라우저 Web Speech 기반 STT(음성→텍스트), TTS(텍스트→음성)
- 실제 Claude LLM 연동 (서버 라우트에서 호출, 키 보호)
- 가상 아파트 단지 지식베이스 기반 한국어 답변
- 관리자 화면: 이용내역 / 수집데이터 / 통계 / 엑셀 다운로드
- 오프라인/무키 폴백(시나리오 기반)

### 제외 (YAGNI — README에 "확장 시"로 기술)
- 실제 서버형 STT/TTS 엔진 연동
- 관리자 인증/로그인, 권한 관리
- 운영 인프라(오토스케일, CDN, 모니터링)
- 멀티 단지/멀티 테넌트

## 3. 아키텍처

단일 **Next.js 14 (App Router)** 풀스택 앱.

```
[키오스크 화면] ──입력/음성──> [브라우저 Web Speech: STT/TTS]
       │                              │ (텍스트)
       │                              ▼
       │                   [/api/chat  Route Handler]
       │                    - 가상 단지 지식 주입(시스템 프롬프트)
       │                    - Claude 호출 (서버에서만, 키 보호)
       │                    - 대화/이용로그 SQLite 기록
       ▼                              │
[동기화 안내 화면(텍스트+이미지)] <──답변──┘

[관리자 /admin] ── 이용내역 / 수집데이터 / 통계 / 엑셀 다운로드
```

**설계 의도**
- 음성은 **브라우저**에서 처리 → 무료, 키 불필요, 지연 낮음. 답변 생성만 **서버에서 Claude**
  호출 → API 키를 클라이언트에 노출하지 않음(Public 저장소 안전).
- 단일 앱 → 시연/배포가 가장 단순. 실제 납품 시 백엔드 분리 경로는 README 로드맵에 기술.

## 4. 화면 흐름 (키오스크)

1. **대기(Attract)** — 단지 브랜드, "터치하여 상담 시작"
2. **정보 입력** — 대형 터치 키패드로 이름 → 전화번호, 개인정보 수집 동의 체크
3. **상담** — 마이크 버튼(음성)/추천 질문 칩/텍스트 입력. 답변은 TTS 음성 + 화면 텍스트 +
   관련 이미지(평형도·입지 등) 동기 노출
4. **요약/종료** — 상담 요약, 다시 시작

## 5. 관리자 화면

- **이용내역**: 일자·시간별 세션 목록 + 대화 상세 보기
- **수집데이터**: 이름/전화번호 조회 테이블
- **통계**: 방문자 수, 질문 키워드 빈도(간단 막대)
- **엑셀 다운로드**: 수집 데이터 `.xlsx` 추출

## 6. AI 연동 & 폴백

- `/api/chat`이 가상 단지 데이터를 **시스템 프롬프트**로 주입 → 근거 있는 한국어 답변.
- **폴백 계층**:
  1. `ANTHROPIC_API_KEY` 없음 또는 호출 실패 → 키워드 매칭 시나리오(FAQ) 답변으로 자동 전환.
  2. 브라우저가 Web Speech 미지원 → 텍스트 모드로 자동 강등.
- 모든 응답에 `source: "llm" | "fallback"`을 표기해 데모 중 상태를 투명하게 확인.

## 7. 데이터 모델 (SQLite, better-sqlite3)

```
sessions(id PK, name, phone, consent, started_at, ended_at)
messages(id PK, session_id FK, role['user'|'assistant'], content, source, created_at)
events(id PK, session_id FK, keyword, created_at)   -- 통계용 질문 키워드
```

- 파일 DB(`data/kiosk.db`)로 설치 부담 없이 조회·통계·엑셀 추출을 실제로 시연.
- DB 파일과 `data/`는 gitignore.

## 8. 폴더 구조

```
src/app/
  page.tsx                 키오스크 진입(상태 기반 화면 전환)
  admin/page.tsx           관리자
  api/chat/route.ts        Claude 프록시 + 폴백
  api/admin/route.ts       조회 데이터
  api/admin/export/route.ts 엑셀
src/components/kiosk/       Attract/InfoForm/Consult/Summary, Keypad 등
src/components/admin/       테이블/통계
src/lib/
  knowledge.ts             가상 단지 데이터 + 시스템 프롬프트
  db.ts                    sqlite 초기화/쿼리
  llm.ts                   claude 호출 + 폴백
  speech.ts                Web Speech 훅(STT/TTS)
  types.ts
docs/
  db-design.md             DB 설계서 요약(RFP 산출물 매핑)
```

## 9. 기술 스택

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- @anthropic-ai/sdk (Claude)
- better-sqlite3 (DB)
- xlsx (엑셀 추출)
- 브라우저 Web Speech API (STT/TTS, 의존성 없음)

## 10. 디자인 톤

프리미엄 분양/건설: 진한 네이비·골드 계열, 큰 터치 타깃, 세리프 헤드라인으로 신뢰감.
대기→상담 전환 시 부드러운 모션. 모델하우스 분위기.

## 11. 설명 산출물 ("왜 이렇게 만들었나")

- **README.md**: 기술 선택 근거(브라우저 음성 vs 서버 STT, 단일앱 vs 분리, 폴백 전략),
  실행법, 데모 시나리오, 확장 로드맵, RFP 산출물 매핑.
- **docs/db-design.md**: DB 설계서 요약.
