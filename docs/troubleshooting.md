# 트러블슈팅 회고록

> AI 안내 키오스크 프로젝트를 진행하며 실제로 막혔던 지점과 해결 과정.
> 각 항목은 **증상 → 원인 진단 → 해결 → 교훈** 순서로 정리.

---

## 1. 인프라·배포

### 1-1. Windows에서 `better-sqlite3` 네이티브 빌드 실패

**증상**
처음 SQLite 의존성으로 `better-sqlite3`를 선택했으나 로컬(Windows)에서 빌드 시 prebuild 바이너리 매칭 실패. `Could not locate the bindings file` 에러가 13개 경로를 시도하다 종료.

**원인**
`better-sqlite3`는 네이티브 모듈이고, Windows에서는 Visual Studio Build Tools가 필요. Node 24·Windows·pnpm 조합에서 prebuilt 바이너리도 맞지 않음.

**해결**
Node 22+에 내장된 `node:sqlite`(experimental)로 전환. 네이티브 컴파일 없이 동일한 동기 API를 얻음.

```js
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(path.join(dataDir, 'kiosk.db'));
```

**교훈**
표준 라이브러리에 들어온 기능을 우선 검토. 같은 결과를 얻는 가장 가벼운 방법을 고른다.

---

### 1-2. Cloud Run 결제 계정이 "활성"인데 API 활성화 거부

**증상**
GCP 콘솔에서 "결제 계정 2 — 유료 계정"으로 보이는데 `gcloud services enable` 호출 시 `UREQ_PROJECT_BILLING_NOT_FOUND`. CLI로 `gcloud billing accounts list` 하면 모든 계정이 `OPEN: False`.

**원인 진단**
스크린샷에서 "유료 계정"이라고 표시된 것은 **계정 타입(요금제)**이고, 실제 결제 활성 상태는 별개. 8개 결제 계정 중 진짜로 활성인 것은 `Firebase 결제`(`017FBA-...`)뿐이었음 — 결제 콘솔에서 "최근 30일 지출 ₩1,064"로 사용 흔적이 있는 유일한 계정.

**해결**
콘솔에서 활성 결제 계정을 식별 → 그 계정 ID를 프로젝트에 명시적으로 연결.

```bash
gcloud billing projects link ai-kiosk-498302 --billing-account=017FBA-81A37F-50E3FC
# billingEnabled: true ✅
```

**교훈**
콘솔 UI 표시 ≠ API 상태. 의심되면 빠르게 검증 가능한 신호(사용 흔적·CLI 응답)로 교차 확인.

---

### 1-3. GitHub Actions 첫 배포가 7초만에 실패

**증상**
첫 워크플로우 실행이 7~11초 만에 모두 실패. 빌드 단계도 안 가고 끝남.

**원인**
인증 단계(`google-github-actions/auth@v2`)에서 `GCP_SA_KEY`·`GCP_PROJECT_ID` GitHub Secret이 비어있어 즉시 실패. 로그:
```
PROJECT_ID:
the GitHub Action workflow must specify exactly one of "workload_identity_provider" or "credentials_json"
```

**해결**
1. 서비스 계정 `github-deployer` 생성 + 8개 IAM 역할 부여 (Cloud Run Admin, Cloud Build Editor, Artifact Registry Writer, Storage Admin, Service Account User, Secret Manager Accessor, Service Usage Consumer, Artifact Registry Admin)
2. JSON 키 발급 → `gh secret set GCP_SA_KEY < key.json`
3. 로컬 키 파일 즉시 삭제

**교훈**
"7초 실패"는 보통 인증·환경변수 누락. 로그의 첫 에러부터 본다.

---

### 1-4. Artifact Registry `writer` 권한으로는 저장소를 못 만든다

**증상**
GitHub Actions 워크플로우가 `gcloud artifacts repositories create`에서 `PERMISSION_DENIED: artifactregistry.repositories.create`.

**원인**
`roles/artifactregistry.writer`는 이미지 푸시는 되지만 저장소 자체를 생성하는 권한은 없음. Create는 `roles/artifactregistry.admin`이 필요.

**해결**
권한 추가 + IAM 전파 지연이 있을 수 있으므로 저장소를 CLI로 직접 미리 생성:

```bash
gcloud projects add-iam-policy-binding ... --role="roles/artifactregistry.admin"
gcloud artifacts repositories create ai-kiosk-counselor --repository-format=docker --location=asia-northeast3
```

이러면 워크플로우의 `describe ... || create` 분기가 describe에서 통과해 create를 건너뜀.

**교훈**
GCP 역할은 "동사"가 아닌 "관리 범위"로 나뉜다. `writer`/`admin` 차이를 매번 확인.

---

### 1-5. Cloud Run 컨테이너 시간이 UTC

**증상**
관리자 화면의 방문 시각이 9시간 어긋남. LLM이 "지금 진료 중인가요?"에 정확히 답 못함.

**원인**
Cloud Run 기본 컨테이너 시간대는 UTC. JS `Date.now()`도 SQLite `datetime('now','localtime')`도 모두 UTC 기준.

**해결**
Dockerfile에 tzdata + TZ 설정:
```dockerfile
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul
```

추가로 LLM 시스템 프롬프트에 매 요청마다 현재 KST 시각·요일·진료 상태를 주입(`getNowContext()`).

**교훈**
서버리스 환경의 기본값(UTC)은 한국 운영에 안 맞는다. 컨테이너 빌드 시점에 박아두는 게 가장 확실.

---

## 2. 빌드·번들링

### 2-1. `pnpm 11` 공급망 정책이 `--frozen-lockfile`을 깨뜨림

**증상**
Cloud Build에서 Docker 빌드 중 `pnpm install --frozen-lockfile`이 exit code 1로 종료. 로그에 `Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.`

**원인**
pnpm 11이 도입한 공급망 보안 정책 — 미승인 빌드 스크립트가 있으면 CI 환경의 frozen-lockfile 모드에서 실패. 우리 의존성(`@google/genai`, `protobufjs`)은 빌드 스크립트를 가지고 있지만 실제로는 실행 안 해도 됨.

**해결**
Dockerfile에서 `--ignore-scripts` 추가:
```dockerfile
RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts
```

**교훈**
"보안 정책 강화"가 동작을 바꾸는 메이저 업데이트는 빌드 환경에 미치는 영향을 먼저 확인. 로그의 안내 메시지(`Run "pnpm approve-builds"`)를 보면 의도가 보임.

---

### 2-2. 클라이언트 컴포넌트가 `node:sqlite`를 import해 webpack 충돌

**증상**
빌드 시 webpack 에러:
```
Module build failed: UnhandledSchemeError: Reading from "node:fs" is not handled by plugins (Unhandled scheme).
Module build failed: UnhandledSchemeError: Reading from "node:sqlite" ...
```

**원인 진단**
클라이언트 컴포넌트 `ClinicContext.tsx`가 `knowledge.ts`를 import → `knowledge.ts`가 `./db.ts`를 import → `./db.ts`가 `node:sqlite` 사용. webpack이 클라이언트 번들에 node: 스킴 모듈을 끌어들이려다 실패.

처음엔 `if (typeof window !== 'undefined') return null; require('./db')` 같은 동적 require 트릭을 시도했으나 webpack의 정적 분석을 못 속임.

**해결**
**Server-only 모듈로 명확히 분리.**
- `src/lib/knowledge.ts` — CLINIC 데이터, 폴백 규칙, `applyOverride`(순수 함수) 등 클라이언트 가능한 것만
- `src/lib/clinic-server.ts` — `import 'server-only'` + DB 호출 함수(`getEffectiveClinic`, `buildSystemPrompt`)

API 라우트와 LLM 호출 경로만 `clinic-server`에서 import.

**교훈**
"한 파일에 다 넣고 동적으로 회피"는 webpack에 통하지 않는다. **계층 분리**가 정답. Next.js의 `server-only` 패키지가 컴파일 타임에 클라이언트 import를 막아준다.

---

### 2-3. Next.js 14에서 `dev` 스크립트의 `--turbopack` 플래그가 깨짐

**증상**
`pnpm dev` 실행 시 `error: unknown option '--turbopack'`.

**원인**
`create-next-app`이 생성한 스크립트에 들어가 있던 `next dev --turbopack`은 Next 15 문법. 우리 프로젝트는 Next 14.

**해결**
```diff
- "dev": "next dev --turbopack",
+ "dev": "next dev",
```

**교훈**
스캐폴딩 결과물은 무조건 한 번 검토. 메이저 버전 차이에서 흔히 깨진다.

---

### 2-4. Windows에서 `next build` standalone 출력이 EPERM 에러

**증상**
로컬(Windows)에서 `next build` 실행 시 `EPERM: operation not permitted, symlink ... .next/standalone/node_modules/...`

**원인**
Next.js standalone 출력은 trace 분석 후 의존성을 symlink로 복사. Windows에서 symlink 생성은 관리자 권한이 필요.

**해결**
**로컬 빌드 자체를 안 한다.** Cloud Build/Docker가 Linux 환경에서 빌드하므로 symlink 권한 문제가 없음. 로컬에서는 `pnpm dev`로만 확인하고 빌드는 CI에 맡김.

**교훈**
"로컬에서도 완전히 동작해야 한다"는 강박을 버린다. 빌드 검증은 CI에서.

---

## 3. 데이터베이스·캐싱

### 3-1. SQLite `CHECK (id = 1)` 제약이 UPSERT와 충돌

**증상**
`PUT /api/admin/clinic`이 405 응답. 실제 로그에는 SQLite 에러:
```
errstr: 'constraint failed'
errcode: 787,
code: 'ERR_SQLITE_ERROR'
```

Next.js는 핸들러가 throw하면 pages-router 기본 405 에러 페이지를 반환하기에 405로 보였던 것.

**원인**
단일 행 보장을 위해 `CHECK (id = 1)`을 걸고 `INSERT ... ON CONFLICT(id) DO UPDATE`로 UPSERT. 그런데 `node:sqlite`의 UPSERT 처리 중 CHECK 평가 타이밍에서 제약 위반으로 빠짐.

**해결**
CHECK 제거 + `INSERT OR REPLACE`로 단순화:
```sql
CREATE TABLE clinic_config (id INTEGER PRIMARY KEY, json TEXT NOT NULL, ...);
INSERT OR REPLACE INTO clinic_config (id, json) VALUES (1, ?)
```

PRIMARY KEY만으로 단일 행 보장 충분. UPSERT 같은 복잡한 구문보다 단순한 OR REPLACE가 안전.

**교훈**
SQLite 같은 가벼운 엔진에서는 "원래 의도"보다 "엔진이 잘 처리하는 패턴"을 우선. 단순함이 신뢰성.

---

### 3-2. 자가편집 저장이 화면에 반영 안 됨 (정적 캐시)

**증상**
`/admin/clinic`에서 병원명을 저장해도 키오스크 화면이 옛 이름을 계속 표시. 그런데 `chat` 응답은 새 이름을 반영함.

**원인 진단**
처음엔 Cloud Run 다중 인스턴스(`min=0`, `max=3`)로 인한 DB 분산 문제로 추정. min/max=1로 단일 인스턴스 고정. 그래도 같은 증상.

진짜 원인은 Next.js App Router의 GET 라우트 **정적 캐싱**:
- `/api/chat`은 POST라 매번 실행 → 최신 DB 반영
- `/api/clinic`은 GET → 빌드 타임에 한 번 실행되어 결과가 캐시 → DB 변경 안 반영

5번 연속 호출에 모두 똑같은 옛 값이 나온 게 결정적 단서.

**해결**
GET 라우트에 dynamic 강제 + 클라이언트 fetch에 cache 무시:
```ts
// src/app/api/clinic/route.ts
export const dynamic = 'force-dynamic';

// src/components/kiosk/ClinicContext.tsx
fetch('/api/clinic', { cache: 'no-store' })
```

**교훈**
Next.js App Router는 GET을 **기본 정적 캐싱**. DB·외부 상태를 읽는 라우트는 명시적으로 dynamic 선언해야 한다. "5번 호출해도 같은 응답"이 결정적 단서가 됨.

---

### 3-3. 미들웨어 + Basic Auth가 PUT/POST 요청 본문과 충돌

**증상**
GET `/api/admin/clinic`은 200으로 응답. 같은 경로에 인증 헤더 포함 PUT은 405.

**원인**
Next.js 미들웨어에서 `NextResponse.next()`로 통과시킬 때, 본문이 있는 요청(PUT/POST)이 일부 케이스에서 라우트 핸들러로 전달되지 못함. GET은 영향 없음.

**해결**
미들웨어 매처에서 `/api/admin/*`을 제외하고 라우트 안에서 직접 인증:
```ts
// src/lib/admin-auth.ts
export function checkAdminAuth(req: Request): NextResponse | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ') && ...) return null;
  return new NextResponse('Authentication required', { status: 401, ... });
}

// 각 라우트에서:
export async function PUT(req: NextRequest) {
  const denied = checkAdminAuth(req);
  if (denied) return denied;
  ...
}
```

UI 경로(`/admin/*`)는 그대로 미들웨어 보호.

**교훈**
미들웨어는 GET 위주의 가벼운 가드용. 본문 있는 메서드를 보호할 때는 라우트 안에서 직접 처리하는 게 안전.

---

## 4. AI·음성

### 4-1. Gemini 2.5 답변이 한 문장에서 잘림

**증상**
첫 Gemini 응답이 *"한빛자이 더 센트럴 84A형은"* 에서 끊김.

**원인**
`gemini-2.5-flash`는 "사고(thinking) 토큰"을 출력 한도에 포함시킴. `max_tokens=400`을 줬는데 사고에 300+ 토큰을 쓰고 답변은 50토큰만 나옴.

**해결**
사고 비활성화 + 출력 한도 상향:
```ts
config: {
  systemInstruction: buildSystemPrompt(),
  maxOutputTokens: 600,
  thinkingConfig: { thinkingBudget: 0 },
}
```

키오스크는 짧고 빠른 답변이 목적이라 사고가 불필요.

**교훈**
모델 신세대 기능(thinking, function calling 등)은 기본 활성. 사용 사례에 맞게 명시적으로 끈다.

---

### 4-2. Gemini TTS가 한국어 한 문장에 ~4초

**증상**
음성 응답 첫 소리까지 5~6초. LLM은 1.6초, TTS가 4초를 차지.

**원인**
`gemini-2.5-flash-preview-tts`는 짧은 문장에도 합성·전송에 ~4초. 다른 TTS 모델로 바꿔도 비슷 (`gemini-3.1-flash-tts`도 ~4.3초, `pro-preview-tts`는 ~6초).

**해결**
**Google Cloud TTS Neural2로 교체**:
- 같은 GCP 프로젝트에서 사용 가능 (Cloud TTS API 활성화)
- 응답 시간 첫 호출 1초, 캐시 후 0.3초로 단축
- 무료 한도(월 100만 자) 안에서 사실상 무료
- ADC(Application Default Credentials)로 자동 인증

`tts.ts`에서 Cloud TTS 시도 → 실패 시 Gemini TTS 폴백 → 둘 다 실패 시 브라우저 기본 음성. 3중 폴백.

```ts
async function trySynthesizeCloudTts(text: string): Promise<Buffer | null> {
  const token = await getAuth().getClient().getAccessToken();
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    headers: { Authorization: `Bearer ${token.token}` },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-A' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
    }),
  });
  return Buffer.from((await res.json()).audioContent, 'base64');
}
```

**교훈**
같은 일을 하는 다른 모델·서비스가 있다면 **벤치마크 먼저**. 4배 차이는 코드 최적화로 따라잡을 수 없다.

---

### 4-3. 모바일에서 음성이 한 박자 늦게 시작

**증상**
iOS Safari에서 답변이 와도 음성이 안 들리거나 늦게 시작.

**원인**
모바일은 첫 사용자 제스처 직후가 아니면 `audio.play()` 차단. 우리는 "사용자 클릭 → fetch → 응답 후 play()" 흐름이라 클릭과 play 사이에 비동기 갭이 있어 제스처 컨텍스트가 풀림.

**해결**
**Audio unlock 패턴** — 정보 입력 화면의 "안내 시작하기" 버튼 클릭 시점에 무음 오디오를 한 번 재생해 정책을 잠금 해제:
```ts
const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const a = new Audio(silentWav);
a.muted = true;
void a.play().catch(() => {});
```

이후 음성 응답이 fetch 끝나고 와도 play 가능.

**교훈**
모바일 자동재생 정책은 표준 검색으론 잘 안 나오는 함정. 증상이 데스크탑/모바일에서 다르면 정책을 의심.

---

### 4-4. 음성이 두 개 겹쳐서 들림

**증상**
새 질문할 때마다 이전 응답 음성과 새 응답 음성이 잠깐 겹쳤다 사라짐.

**원인**
이전 오디오를 멈출 때 `audio.src = ''`이 `onerror`를 발동시켜 브라우저 폴백 음성을 잘못 트리거. 그 와중에 새 Gemini 음성도 재생.

**해결**
**재생 토큰** + **핸들러 선제거**:
```ts
const stopAudio = useCallback(() => {
  playTokenRef.current += 1; // 세대 증가 — 이전 요청은 폐기
  const a = audioRef.current;
  if (a) {
    a.onended = null;
    a.onerror = null; // 폴백 트리거 차단
    a.pause();
    audioRef.current = null;
  }
}, []);

const speak = async (text: string) => {
  stopAudio();
  const myToken = playTokenRef.current;
  // ... fetch ...
  if (myToken !== playTokenRef.current) return; // 더 새 요청이 시작됨
  // ... play ...
};
```

**교훈**
비동기 작업이 겹칠 때 세대 토큰은 가장 단순하고 확실한 패턴. cancel 토큰·AbortController로도 같은 효과.

---

## 5. UI·UX

### 5-1. 모바일에서 말풍선이 잘려나옴

**증상**
모바일 화면에서 어시스턴트 말풍선이 화면 가장자리에 잘림.

**원인**
flex 자식의 기본 `min-width: auto` 때문에 자식 내용이 길면 컨테이너가 화면 밖으로 늘어남. 거기에 말풍선 텍스트도 `break-words` 없어서 긴 토큰이 튀어나옴.

**해결**
```diff
- <div className="flex flex-1 flex-col">
+ <div className="flex min-w-0 flex-1 flex-col">

- <div className="max-w-[85%] rounded-2xl px-4 py-3">
+ <div className="max-w-[80%] break-words [overflow-wrap:anywhere] ...">
```

**교훈**
flex 자식이 가로 넘침 → 99% `min-w-0` 누락. CSS의 가장 흔한 함정.

---

### 5-2. AI 오브가 "다트판"처럼 보임

**증상**
처음 만든 그라데이션 회전 오브가 시연자에게 부자연스럽다는 피드백. 4분면이 또렷이 보임.

**원인**
`conic-gradient`로 4색 stop을 줬더니 색 경계가 또렷해지고, 회전하니 다트판이나 체스판처럼 보임.

**해결 1차**
회전·각 분기 제거, `radial-gradient`로 부드러운 골드 글로우 + 호흡(scale) 펄스만.

**해결 2차 (사이트 톤 리디자인)**
구체 자체를 빼고, **의료 십자(+) 엠블럼 + 잔잔히 퍼지는 골드 링 파동**으로 교체. AttractScreen의 `animate-pulse-ring`과 시각 언어 통일.

**해결 3차 (영업 톤 재조정)**
의사 → 안내 직원 캐릭터로 컨셉 정리. 결국 PC에선 캐릭터를 빼고 **답변 말풍선 옆 작은 프로필 아바타**(카카오톡 식)로 절제.

**교훈**
시각 디자인은 한 번에 못 맞힌다. 사용자 직감("이상해")이 가장 정확한 피드백. 리디자인을 두려워하지 않는다.

---

### 5-3. 테마 토글이 입력 바와 겹침

**증상**
우하단에 고정한 "다크 모드/라이트 모드" 알약 버튼이 상담 화면의 입력창·전송 버튼과 겹쳐 누를 수가 없음.

**원인**
다른 화면(대기/입력/번호표)에선 하단이 비어있어 문제 없지만 상담 화면만 하단에 입력 바가 있음.

**해결**
상담 화면에서만 토글을 **헤더로 이동**, 나머지 화면에선 우하단 알약 토글 유지:
```tsx
{stage !== 'consult' && <button className="absolute bottom-4 right-4 ...">...</button>}
// 상담 화면 헤더에는 onToggleTheme props로 받은 아이콘 버튼
```

**교훈**
"전역 UI 요소"라도 화면 별 레이아웃 맥락에 따라 위치가 달라져야 할 수 있다. 무조건 fixed/absolute로 두지 말고 화면별로 검증.

---

### 5-4. 라이트 테마에서 SVG 안내 이미지의 라벨이 안 보임

**증상**
overview.svg의 "한빛내과의원" 라벨이 같은 골드 색 창문 위에 그려져 안 보임.

**원인**
SVG의 텍스트와 사각형 모두 같은 색(#d8bd85)이라 겹침.

**해결**
해당 행만 골드 창문을 명판형 네이비 박스로 바꾸고 그 위에 골드 글씨 — 건물 간판처럼:
```svg
<rect x="156" y="130" width="112" height="32" rx="4" fill="#0b1733" opacity="0.85"/>
<text x="212" y="151" fill="#d8bd85" font-weight="700">한빛내과의원</text>
```

**교훈**
SVG는 z-order만 신경 쓰지 색 대비를 놓치기 쉽다. 결국 "간판"처럼 보일 때 가독성도 살아남.

---

## 6. 운영·환경

### 6-1. 5초씩 sleep하며 빌드 끝나길 기다리다 지쳐 — `gh run watch`로 전환

**증상**
`git push` 후 GitHub Actions가 끝나길 기다리느라 `sleep 60; curl ...`을 반복.

**해결**
`gh run watch <run-id> --exit-status`로 워크플로우 완료까지 정확히 블로킹.
```bash
LATEST=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $LATEST --exit-status
```

**교훈**
CLI 도구를 잘 모르고 sleep 루프를 쓰지 말 것. `gh`, `gcloud`, `kubectl` 같은 도구는 대부분 wait-style 명령을 제공.

---

### 6-2. 자기 자신을 자기 안에 git clone 한 상태

**증상**
프로젝트 폴더 안에 `ai-kiosk-counselor/` 디렉토리가 생기고 거기에 자기 자신이 복제되어 있음.

**원인**
실행 안내 문서의 `git clone https://github.com/.../ai-kiosk-counselor.git` 명령을 사용자가 **프로젝트 폴더 안에서** 실행. 자기 자신의 자식 폴더에 자기 자신이 들어감.

**해결**
gitignore에 `/ai-kiosk-counselor` 추가 + tsconfig exclude에 추가. 파일은 디스크에 남되 git/TypeScript 추적에서 제외:
```diff
// .gitignore
+ /ai-kiosk-counselor

// tsconfig.json
- "exclude": ["node_modules"]
+ "exclude": ["node_modules", "ai-kiosk-counselor", ".next"]
```

**교훈**
설치 안내 문서는 "어디서 실행해야 하는지"가 중요. `cd ~/projects` 같은 사전 디렉토리 안내를 빠뜨리지 말 것.

---

### 6-3. Gemini API 키 포맷 혼동

**증상**
사용자가 Google AI Studio에서 발급한 키가 `AQ.Ab8R...`로 시작. 일반적인 Gemini 키 포맷(`AIzaSy...`)과 달라서 "이거 잘못된 거 같다"고 답함.

**원인**
Google AI Studio가 새로운 키 포맷을 도입. 두 포맷 모두 유효.

**해결**
키를 직접 Gemini API에 호출해 검증:
```bash
curl -s -X POST "https://.../gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"테스트"}]}]}'
```

응답이 오면 유효한 키. 처음부터 검증 호출을 했다면 사용자가 혼란 안 겪었을 것.

**교훈**
"형식이 안 맞아 보인다"고 단정하지 말고 **실제로 호출해본다.** 외부 서비스의 식별자 포맷은 예고 없이 바뀐다.

---

### 6-4. Gemini API 키가 채팅에 노출됨

**상황**
사용자가 검증·등록을 위해 키를 채팅으로 전달. 채팅 로그에 평문 노출.

**해결·완화**
1. 즉시 GitHub Secret으로 등록 (`.env.local`은 gitignore 확인)
2. **사용자에게 명시적 경고**: 시연 후 https://aistudio.google.com/apikey 에서 해당 키 즉시 삭제·재발급
3. 노출된 키로 발생할 수 있는 비용 통제 — GCP 예산 알림 설정 권고

**교훈**
대화형 도구에서 시크릿 전달은 위험. 차후엔:
- "여기에 키 붙여넣는 대신 본인 GitHub Secret에 직접 등록한 뒤 알려주세요" 패턴
- 자동 마스킹 (`gh secret set`은 한 번 들어가면 다시 출력 안 됨)

---

## 7. 전체 회고

### 가장 시간을 많이 잡아먹은 것

1. **음성 지연 단축 (5초 → 2초)** — 모델 비교·청크 합성·필러 트릭·결국 Cloud TTS 전환까지 여러 단계
2. **webpack에 server-only 모듈 끌려들어가지 않게 분리** — 동적 require 시도 실패 후 결국 파일 분리
3. **PUT 메서드 405 추적** — 인증 통과인데 405는 흔치 않은 패턴이라 진단이 오래 걸림

### 가장 빠르게 해결된 것

1. **`pnpm dev`의 `--turbopack` 플래그** — 에러 메시지가 명확
2. **모바일 말풍선 잘림** — `min-w-0` 패턴이 익숙해서 즉시
3. **GET 정적 캐시** — 5번 호출 똑같다는 단서로 5분 만에 진단

### 패턴화된 교훈

- **증상이 "X에선 되는데 Y에선 안 됨"이면 환경 차이 의심** (GET vs PUT, 데스크탑 vs 모바일, 로컬 vs CI)
- **외부 서비스는 직접 호출 먼저** (키 형식, API 응답, 권한)
- **로그의 첫 에러 라인이 보통 정답** (마지막 에러는 cascade일 때 많음)
- **단순함이 신뢰성** (UPSERT < INSERT OR REPLACE, 동적 require < 파일 분리, conic-gradient < radial-gradient)
- **사용자 피드백 "이상해" = 정확한 신호** (디자인은 객관적 측정이 어렵다)

### 다음 프로젝트에 반영할 것

1. **첫 커밋 전에 CI 한 번 통과시킨다** — 인증·환경변수·빌드 설정 함정을 먼저 잡아냄
2. **DB가 들어가는 순간 server-only 분리** — 나중에 옮기면 import 그래프가 복잡해짐
3. **음성·실시간 같은 비용·지연 민감 기능은 첫 30분에 벤치마크** — 코드 최적화로 따라잡을 수 없는 한계가 있음
4. **CHECK 같은 단순 제약은 코드 레이어에서 검증** (DB 제약은 인덱스·FK만)
5. **시연 환경(min-instances=1) vs 운영 환경 구분** 명확히 — 단일 인스턴스로 일관성 보장하는 트릭은 시연·파일럿용
