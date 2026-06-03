# AI 키오스크 상담사 · 한빛자이 더 센트럴 (데모)

> 모델하우스 방문객 맞춤형 **AI 상담사 키오스크** 소프트웨어 — 포트폴리오/시연용 동작 데모
>
> 방문객이 이름·연락처를 입력하고 **음성 또는 터치**로 청약·아파트를 물으면, AI가
> **음성과 화면(텍스트+안내 이미지)** 으로 답한다. 관리자는 이용 내역과 수집 데이터를
> 조회하고 엑셀로 추출한다.

> ⚠️ 단지명·가격·일정 등은 모두 **데모용 가공 정보**이며 실제와 무관합니다.

---

## 1. 무엇을 만들었나

| 영역 | 내용 |
| --- | --- |
| **키오스크 (사용자)** | 대기 → 정보 입력(터치 키패드) → 음성/텍스트 상담 → 요약 |
| **AI 상담** | 브라우저 음성 인식(STT) → LLM 답변 생성 → 신경망 음성 출력(TTS) + 동기 안내 이미지 |
| **관리자 대시보드** | 이용 내역, 수집 데이터, 질문 키워드 통계, 엑셀 다운로드 |

데모 진입: `/` (키오스크), `/admin` (관리자)

---

## 2. 왜 이렇게 설계했나 (핵심)

이 데모는 "수주·시연"이 목적이다. 그래서 **두 가지**를 최우선으로 잡았다 —
**(A) 발표 현장에서 키 없이도 안 끊기는 안정성**, **(B) 코드를 처음 보는 사람이
설계 의도를 바로 이해할 수 있는 구조**. 주요 결정과 이유는 다음과 같다.

### ① 음성 입력은 브라우저, 답변·음성 생성은 서버에서
- **STT = 브라우저 내장 Web Speech API.** 별도 음성 서버·키 없이 즉시 인식, 지연이 낮다.
- **TTS = 서버 Gemini 신경망 음성(`/api/tts`).** 브라우저 기본 음성은 한국어 음색이
  딱딱해, 같은 Gemini 키로 사람에 가까운 음성을 합성한다. 키 없음/실패 시 **브라우저
  기본 음성으로 자동 폴백**한다.
- **답변 생성 = 서버 라우트(`/api/chat`)에서만 LLM 호출.** API 키를 클라이언트에
  절대 노출하지 않는다 → 이 저장소가 **Public이어도 안전**하다.
- 음성 미지원 브라우저는 자동으로 **텍스트 모드로 강등**된다.

### ② 무키/오프라인 폴백 — 데모가 멈추지 않는다
`ANTHROPIC_API_KEY`가 없거나 호출이 실패하면, 미리 작성한 **시나리오(FAQ) 답변**으로
자동 전환된다. 발표장 네트워크/키 문제에도 데모가 진행된다. 모든 답변에
`source: "llm" | "fallback"`을 붙여 현재 어떤 경로로 답했는지 투명하게 확인할 수 있다.
(키오스크 답변 옆 "오프라인 안내" 배지, 관리자 대화 로그의 "오프라인" 표기)

### ③ 단일 Next.js 풀스택 앱
키오스크 UI·관리자 UI·LLM 프록시·DB를 한 앱에 담았다. 시범 운영 규모에 맞는 가장 단순한
구성이라 **시연·배포가 쉽다**. 실제 납품 시 백엔드 분리 경로는 아래 로드맵에 적어 두었다.

### ④ DB는 Node 24 내장 `node:sqlite`
파일 기반 SQLite로 조회·통계·엑셀 추출을 실제로 시연한다. `better-sqlite3` 같은 네이티브
모듈은 Windows에서 빌드툴 의존성이 있어 시연 환경 구성이 까다로워, **추가 컴파일이 없는
Node 24 내장 모듈**을 택했다. 표준 SQL만 써서 추후 PostgreSQL 이관이 쉽다.

### ⑤ "근거 있는 답변"을 위한 지식 주입
가상 단지 데이터(`src/lib/knowledge.ts`)를 **시스템 프롬프트로 주입**해 LLM이 지어내지
않고 단지 정보에 근거해 답하도록 했다. 같은 데이터가 폴백 FAQ의 근거도 되어, LLM 경로와
폴백 경로의 답변 톤이 일관된다.

---

## 3. 아키텍처

```
[키오스크 화면] ──입력/음성──> [브라우저 Web Speech: STT/TTS]
       │                              │ (텍스트)
       │                              ▼
       │                   [/api/chat  (서버 전용)]
       │                    - 가상 단지 지식 주입(시스템 프롬프트)
       │                    - Claude 호출 (키 보호) → 실패/무키 시 폴백
       │                    - 대화·키워드 SQLite 기록
       ▼                              │
[동기 안내 화면(텍스트+이미지)] <──답변──┘

[관리자 /admin] ── 이용내역 / 수집데이터 / 통계 / 엑셀 다운로드
```

### 폴더 구조
```
src/app/
  page.tsx                 키오스크 진입
  admin/page.tsx           관리자 대시보드
  api/session/route.ts     세션 생성/종료(개인정보 수집)
  api/chat/route.ts        Claude 프록시 + 폴백
  api/admin/route.ts       조회 데이터
  api/admin/export/route.ts 엑셀 추출
src/components/kiosk/       Attract/InfoForm/Consult/Summary
src/lib/
  knowledge.ts             가상 단지 데이터 · 시스템 프롬프트 · 폴백 FAQ
  db.ts                    node:sqlite 데이터 계층
  llm.ts                   Claude 호출 + 폴백
  speech.ts                Web Speech 훅(STT/TTS)
  types.ts
docs/
  db-design.md             DB 설계서
  superpowers/specs/       설계 문서(스펙)
```

---

## 4. 기술 스택

- **Next.js 14** (App Router), React 18, TypeScript, Tailwind CSS
- **@anthropic-ai/sdk** — Claude (답변 생성, 서버 전용)
- **node:sqlite** (Node 24 내장) — 데이터 저장
- **xlsx** — 수집 데이터 엑셀 추출
- **Web Speech API** (브라우저 내장) — STT/TTS, 외부 의존성 없음

---

## 5. 실행 방법

> Node.js 22 이상 권장 (내장 `node:sqlite` 사용. Node 24 기준으로 개발).

```bash
pnpm install

# (선택) 실제 Claude 답변을 쓰려면 키 설정. 없으면 자동으로 폴백 동작.
cp .env.local.example .env.local   # ANTHROPIC_API_KEY=sk-ant-...

pnpm dev      # http://localhost:3000  (키오스크) / /admin (관리자)
# 또는
pnpm build && pnpm start
```

- **음성 기능은 Chrome 계열 브라우저**에서 가장 잘 동작한다(Web Speech API). 마이크 권한 허용 필요.
- 키가 없어도 추천 질문·텍스트 입력으로 전체 흐름을 시연할 수 있다(폴백).

### 데모 시나리오
1. `/` 접속 → 화면 터치 → 이름/연락처 입력 + 동의 → 상담 시작
2. 추천 질문 클릭 또는 🎤 음성으로 "84형 분양가가 얼마인가요?" 질문
3. 화면 좌측 안내 이미지가 질문 주제에 맞춰 전환되고, 답변이 음성으로 재생됨
4. 상담 종료 → 요약 화면
5. `/admin` 에서 방문 기록·키워드 통계 확인 → 엑셀 다운로드

### 클라우드 배포 (Google Cloud Run)

한 줄로 GCP에 배포할 수 있다 (Dockerfile 포함, 자동 빌드):

```bash
gcloud run deploy ai-kiosk-counselor --source . --region asia-northeast3 --allow-unauthenticated
```

상세 절차(시크릿 등록, 도메인 연결, 비용 등): [`docs/deploy-gcp.md`](docs/deploy-gcp.md)

---

## 6. RFP 산출물 매핑

| RFP 산출물 | 본 저장소 |
| --- | --- |
| 프로젝트 상세 기획서 | `docs/superpowers/specs/2026-06-02-...-design.md` |
| 화면 설계/구현 | `src/components/kiosk`, `src/app/admin` |
| 키오스크 클라이언트 소스 | `src/components/kiosk`, `src/lib/speech.ts` |
| 관리자 페이지 소스 | `src/app/admin`, `src/app/api/admin` |
| 데이터베이스 설계서 | `docs/db-design.md` |
| AI 연동 | `src/lib/llm.ts`, `src/lib/knowledge.ts` |

---

## 7. 확장 로드맵 (실제 운영 시)

데모에서 의도적으로 제외했고, 본 도입 시 다음 순서로 고도화한다.

1. **음성 품질**: 브라우저 STT/TTS → 상용 STT/TTS 엔진(소음 환경·자연스러운 음색) 연동.
2. **백엔드 분리**: LLM 프록시·데이터 API를 별도 서버로 분리, DB를 PostgreSQL로 이관.
3. **지식 관리**: 단지 자료(PDF/이미지)를 관리자에서 업로드 → 임베딩 기반 검색(RAG)으로 자동 반영.
4. **관리자 보안**: 로그인·권한, 개인정보 암호화/보관기간 정책, 접근 감사 로그.
5. **운영**: 다현장(멀티 단지) 구성, 사용량 모니터링·알림, 무인 장애 복구.

---

## 8. 한계 (데모 범위)

- 브라우저 음성은 환경·브라우저에 따라 인식률 편차가 있다(상용 엔진 대비).
- 관리자 인증이 없다(누구나 `/admin` 접근). 운영 전 필수 보강 항목.
- 단일 인스턴스·파일 DB 기준. 동시 다중 키오스크 운영은 로드맵 2단계에서 다룬다.
