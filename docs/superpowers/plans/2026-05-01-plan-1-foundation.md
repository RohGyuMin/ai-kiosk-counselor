# Plan 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 14 + TypeScript + Supabase 인프라 + 구글/카카오 OAuth 인증 + V1 DB 스키마 + Vercel 배포가 갖춰진 빈 SaaS 골격을 만든다. AI 기능은 Plan 2에서 추가.

**Architecture:** Next.js 14 App Router 풀스택 모놀리스. Supabase가 Auth + Postgres DB 통합 제공. shadcn/ui 컴포넌트 라이브러리. Vercel 배포. RLS(Row-Level Security)로 멀티테넌시 격리. 모든 외부 의존성(Replicate, 토스, R2, Redis)은 Plan 2~4에서 통합.

**Tech Stack:**
- Next.js 14 (App Router), TypeScript, pnpm
- TailwindCSS 3.4, shadcn/ui
- Supabase (Postgres 15, Auth)
- @supabase/ssr (서버 사이드 인증)
- Vitest (단위 테스트), Playwright (E2E)
- ESLint + Prettier + Husky + lint-staged
- Vercel (배포)
- Sentry (에러), PostHog (행동 분석)

---

## File Structure

본 플랜이 끝난 시점의 파일 트리:

```
.
├── .env.local.example         # 환경 변수 템플릿
├── .env.local                 # 실제 환경 변수 (gitignore)
├── .gitignore
├── .husky/
│   └── pre-commit
├── .prettierrc
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── README.md
├── components.json            # shadcn/ui 설정
├── middleware.ts              # Auth 보호 라우트
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # 랜딩 (Plan 5에서 본격 작업, V1은 placeholder)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   └── kakao/
│   │   │       └── callback/
│   │   │           └── route.ts
│   │   ├── (app)/             # 인증 필요 라우트 그룹
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # shadcn/ui 컴포넌트 (button, card 등)
│   │   ├── auth/
│   │   │   ├── login-button-google.tsx
│   │   │   └── login-button-kakao.tsx
│   │   └── layout/
│   │       └── app-header.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # 브라우저 클라이언트
│   │   │   ├── server.ts      # 서버 클라이언트
│   │   │   └── middleware.ts  # 미들웨어 클라이언트
│   │   ├── kakao/
│   │   │   └── oauth.ts       # 카카오 OIDC 헬퍼
│   │   ├── env.ts             # 환경변수 검증 (zod)
│   │   └── utils.ts           # cn() 등 유틸
│   ├── types/
│   │   └── database.ts        # Supabase 자동 생성 타입
│   └── __tests__/             # Vitest 단위 테스트
│       ├── lib/
│       └── utils/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_users.sql
│   │   ├── 0002_brands.sql
│   │   ├── 0003_generations.sql
│   │   ├── 0004_subscriptions.sql
│   │   ├── 0005_usage_logs.sql
│   │   └── 0006_rls_policies.sql
│   └── config.toml
├── e2e/
│   ├── auth.spec.ts
│   └── health.spec.ts
└── docs/
    └── DEV_SETUP.md
```

**파일 책임 원칙:**
- `lib/supabase/*` 는 클라이언트 생성만, 비즈니스 로직 없음
- `app/(app)/*` 는 인증된 사용자용 페이지만
- `supabase/migrations/*` 는 SQL만, 한 파일 = 한 기능 단위
- `src/__tests__/*` 는 단위 테스트, `e2e/*` 는 E2E 테스트 분리

---

## Pre-flight Checklist

플랜 시작 전 사용자가 수동으로 준비해야 하는 외부 자원 (코드 작업 전 필수):

- [ ] **GitHub 저장소** 생성 (private, 이름 예: `aa` 또는 의미있는 이름)
- [ ] **Supabase 프로젝트** 생성 → https://supabase.com (무료 티어로 시작)
  - Project URL과 anon key, service role key 복사해둘 것
- [ ] **Google Cloud OAuth 클라이언트** 생성 → https://console.cloud.google.com
  - Client ID와 Client Secret 복사
  - Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`
- [ ] **카카오 디벨로퍼스** 앱 생성 → https://developers.kakao.com
  - REST API 키 복사
  - OIDC 활성화 + Redirect URI: `http://localhost:3000/auth/kakao/callback` (개발), `https://<your-domain>/auth/kakao/callback` (프로덕션)
- [ ] **Vercel 계정** 준비 (GitHub 연결)
- [ ] **Sentry 프로젝트** 생성 → https://sentry.io (무료 티어)
- [ ] **PostHog 프로젝트** 생성 → https://posthog.com (무료 티어)

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`

- [ ] **Step 1: pnpm 설치 확인**

```bash
pnpm --version
```

Expected: 9.x 이상. 없으면 `npm install -g pnpm`.

- [ ] **Step 2: Next.js 14 프로젝트 생성**

```bash
pnpm create next-app@14 . --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

이 명령은 전부 플래그로 지정되어 비대화형으로 실행된다. (Turbopack은 dev 스크립트에서 `--turbopack` 플래그로 활성화 — Task 2의 package.json scripts 참고.)

- [ ] **Step 3: src/ 디렉토리 강제 사용 확인**

`tsconfig.json`의 paths 확인:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 4: .gitignore 추가 항목 확인**

`.gitignore` 끝에 추가:
```
.env.local
.env*.local
.vercel
*.pem
.idea/
.vscode/
coverage/
playwright-report/
test-results/
```

- [ ] **Step 5: 첫 commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js 14 project with TypeScript and Tailwind"
```

---

## Task 2: ESLint, Prettier, Husky 셋업

**Files:**
- Create: `.prettierrc`, `.prettierignore`, `eslint.config.mjs` (이미 있음 - 수정), `.husky/pre-commit`
- Modify: `package.json`

- [ ] **Step 1: Prettier + 관련 패키지 설치**

```bash
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged
```

- [ ] **Step 2: .prettierrc 작성**

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: .prettierignore 작성**

`.prettierignore`:
```
node_modules
.next
.vercel
pnpm-lock.yaml
coverage
playwright-report
*.md
```

- [ ] **Step 4: ESLint에 prettier 호환 추가**

`eslint.config.mjs` 마지막에 prettier 추가:
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
];

export default eslintConfig;
```

- [ ] **Step 5: package.json scripts 보강**

`package.json`의 scripts에 추가:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

- [ ] **Step 6: Husky 초기화 + pre-commit 훅**

```bash
pnpm husky init
echo "pnpm lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

- [ ] **Step 7: 검증**

```bash
pnpm format
pnpm lint
pnpm typecheck
```

Expected: 모든 명령 에러 없이 종료.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: add prettier, husky, lint-staged"
```

---

## Task 3: TailwindCSS + shadcn/ui 셋업

**Files:**
- Create: `components.json`
- Modify: `tailwind.config.ts`, `src/app/globals.css`, `src/lib/utils.ts`

- [ ] **Step 1: shadcn/ui 초기화**

```bash
pnpm dlx shadcn@latest init
```

선택지:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: 자주 쓸 컴포넌트 추가**

```bash
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu toast skeleton avatar
```

- [ ] **Step 3: 한국어 폰트 설정 (Pretendard)**

`src/app/layout.tsx` 수정:
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AA — Korean Seller AI Visual',
  description: '한국 셀러용 AI 라이프스타일컷 생성기',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: tailwind.config.ts에 폰트 등록**

`tailwind.config.ts`의 theme.extend 안에:
```typescript
fontFamily: {
  pretendard: [
    'Pretendard Variable',
    'Pretendard',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ],
},
```

- [ ] **Step 5: 검증**

```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속. 한국어 텍스트가 Pretendard 폰트로 렌더되는지 확인.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: setup shadcn/ui and Pretendard font"
```

---

## Task 4: 환경 변수 + zod 검증

**Files:**
- Create: `.env.local.example`, `.env.local`, `src/lib/env.ts`

- [ ] **Step 1: zod 설치**

```bash
pnpm add zod
```

- [ ] **Step 2: .env.local.example 작성**

`.env.local.example`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Kakao
NEXT_PUBLIC_KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# Sentry (Plan 1 후반)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# PostHog (Plan 1 후반)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: .env.local 복사 후 실제 값 입력**

```bash
cp .env.local.example .env.local
```

수동으로 Supabase, Kakao 값 입력.

- [ ] **Step 4: src/lib/env.ts 작성 (실패 테스트 먼저)**

`src/__tests__/lib/env.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    await expect(import('@/lib/env')).rejects.toThrow();
  });

  it('passes when all required vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('NEXT_PUBLIC_KAKAO_CLIENT_ID', 'kakao-id');
    vi.stubEnv('KAKAO_CLIENT_SECRET', 'kakao-secret');
    vi.stubEnv('NEXT_PUBLIC_KAKAO_REDIRECT_URI', 'http://localhost:3000/auth/kakao/callback');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const { env } = await import('@/lib/env');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
  });
});
```

- [ ] **Step 5: Vitest 셋업 (테스트 실행 환경)**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

`package.json` scripts에 추가:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: 테스트 실행 (실패 확인)**

```bash
pnpm test:run src/__tests__/lib/env.test.ts
```

Expected: FAIL — `@/lib/env` 모듈 없음.

- [ ] **Step 7: env.ts 구현**

`src/lib/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_KAKAO_CLIENT_ID: z.string().min(1),
  KAKAO_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_KAKAO_REDIRECT_URI: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_KAKAO_CLIENT_ID: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
  KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET,
  NEXT_PUBLIC_KAKAO_REDIRECT_URI: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
pnpm test:run src/__tests__/lib/env.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add zod-validated environment variable loader"
```

---

## Task 5: Supabase CLI + 로컬 마이그레이션 도구

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Supabase CLI 설치**

```bash
pnpm add -D supabase
```

- [ ] **Step 2: 프로젝트 초기화**

```bash
pnpm exec supabase init
```

`supabase/config.toml`이 생성됨.

- [ ] **Step 3: Supabase 프로젝트 링크**

(Pre-flight 체크리스트에서 만든 Supabase 프로젝트 ID 필요)

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
```

- [ ] **Step 4: 마이그레이션 디렉토리 확인**

```bash
ls supabase/migrations
```

존재하지만 비어있어야 함.

- [ ] **Step 5: package.json scripts에 db 명령 추가**

```json
"db:push": "pnpm exec supabase db push",
"db:reset": "pnpm exec supabase db reset",
"db:diff": "pnpm exec supabase db diff",
"db:gen-types": "pnpm exec supabase gen types typescript --linked > src/types/database.ts"
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: add Supabase CLI and migration tooling"
```

---

## Task 6: DB 마이그레이션 — users 테이블

**Files:**
- Create: `supabase/migrations/0001_users.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0001_users.sql`:
```sql
-- Supabase Auth는 auth.users를 자동 생성. 여기서는 public.profiles로 확장 정보 저장.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  -- 플랜 정보 (Plan 4에서 본격 사용)
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'plus')),
  plan_renewed_at timestamptz,
  -- 사용량 (Plan 4에서 카운터로 동기화)
  monthly_generation_limit int not null default 5,
  monthly_generation_used int not null default 0,
  monthly_reset_at timestamptz not null default (now() + interval '1 month'),
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auth.users 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 인덱스
create index profiles_plan_idx on public.profiles(plan);
create index profiles_monthly_reset_idx on public.profiles(monthly_reset_at);
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
pnpm db:push
```

Expected: "Your database is now in sync with the migrations."

- [ ] **Step 3: 검증 (Supabase 대시보드에서)**

Supabase Studio → Table Editor → `profiles` 테이블 존재 확인. 컬럼 일치 확인.

- [ ] **Step 4: 타입 생성**

```bash
pnpm db:gen-types
```

`src/types/database.ts`에 `profiles` 타입 포함 확인.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(db): add profiles table with plan and usage fields"
```

---

## Task 7: DB 마이그레이션 — brands 테이블

**Files:**
- Create: `supabase/migrations/0002_brands.sql`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0002_brands.sql`:
```sql
-- 사용자가 등록한 브랜드 (스마트스토어/쿠팡 셀러의 브랜드 단위)
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null check (category in (
    'living', 'home_appliance', 'beauty', 'baby', 'pet', 'other'
  )),
  -- V1.1+에서 사용
  preferred_mood text[],          -- ['modern', 'natural', 'vintage', 'minimal', 'cozy']
  preferred_environment text[],    -- ['living_room', 'bedroom', 'kitchen', 'desk', 'bathroom']
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create index brands_user_id_idx on public.brands(user_id);
create index brands_category_idx on public.brands(category);
```

- [ ] **Step 2: 적용**

```bash
pnpm db:push
pnpm db:gen-types
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(db): add brands table"
```

---

## Task 8: DB 마이그레이션 — generations 테이블

**Files:**
- Create: `supabase/migrations/0003_generations.sql`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0003_generations.sql`:
```sql
-- 생성 이력 (Plan 2에서 채워짐)
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  -- 입력
  source_image_url text not null,         -- R2에 저장된 누끼컷 URL
  source_image_hash text,                  -- 캐싱용 (Plan 2에서 활용)
  category text not null,
  mood text not null,                      -- 'modern', 'natural', 'vintage', 'minimal', 'cozy'
  environment text not null,               -- 'living_room', 'bedroom', 'kitchen', 'desk', 'bathroom'
  -- 출력 (4종 변형, R2 URL 배열)
  output_image_urls text[] not null default '{}',
  -- 처리 상태
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  -- 비용 추적
  cost_usd numeric(10, 4),
  replicate_prediction_ids text[],
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger set_generations_updated_at
  before update on public.generations
  for each row execute function public.set_updated_at();

create index generations_user_id_idx on public.generations(user_id);
create index generations_brand_id_idx on public.generations(brand_id);
create index generations_status_idx on public.generations(status);
create index generations_created_at_idx on public.generations(created_at desc);
```

- [ ] **Step 2: 적용**

```bash
pnpm db:push
pnpm db:gen-types
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(db): add generations table"
```

---

## Task 9: DB 마이그레이션 — subscriptions 테이블

**Files:**
- Create: `supabase/migrations/0004_subscriptions.sql`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0004_subscriptions.sql`:
```sql
-- 결제/구독 (Plan 4에서 본격 사용. V1에서는 빈 테이블만)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro', 'plus')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'trialing')),
  -- 토스페이먼츠
  toss_customer_key text,
  toss_billing_key text,
  -- 기간
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  -- 결제 주기
  interval text not null default 'month' check (interval in ('month', 'year')),
  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- 한 사용자당 활성 구독은 1개만
create unique index subscriptions_active_per_user_idx
  on public.subscriptions(user_id)
  where status in ('active', 'trialing', 'past_due');

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_status_idx on public.subscriptions(status);
create index subscriptions_period_end_idx on public.subscriptions(current_period_end);
```

- [ ] **Step 2: 적용**

```bash
pnpm db:push
pnpm db:gen-types
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(db): add subscriptions table"
```

---

## Task 10: DB 마이그레이션 — usage_logs 테이블

**Files:**
- Create: `supabase/migrations/0005_usage_logs.sql`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0005_usage_logs.sql`:
```sql
-- 사용량 일별 집계 (Plan 4에서 cron job으로 채움)
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  generations_count int not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  -- 메타
  created_at timestamptz not null default now()
);

-- 사용자/날짜 조합 유일
create unique index usage_logs_user_date_idx on public.usage_logs(user_id, date);
create index usage_logs_date_idx on public.usage_logs(date);
```

- [ ] **Step 2: 적용**

```bash
pnpm db:push
pnpm db:gen-types
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(db): add usage_logs table for daily aggregation"
```

---

## Task 11: DB 마이그레이션 — RLS 정책

**Files:**
- Create: `supabase/migrations/0006_rls_policies.sql`

- [ ] **Step 1: RLS 정책 작성**

`supabase/migrations/0006_rls_policies.sql`:
```sql
-- 모든 테이블에 RLS 활성화
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.generations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;

-- profiles: 본인만 읽기/수정
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- brands: 본인 것만
create policy "brands_select_own"
  on public.brands for select
  using (auth.uid() = user_id);

create policy "brands_insert_own"
  on public.brands for insert
  with check (auth.uid() = user_id);

create policy "brands_update_own"
  on public.brands for update
  using (auth.uid() = user_id);

create policy "brands_delete_own"
  on public.brands for delete
  using (auth.uid() = user_id);

-- generations: 본인 것만
create policy "generations_select_own"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "generations_insert_own"
  on public.generations for insert
  with check (auth.uid() = user_id);

-- generations 업데이트는 service_role만 (서버에서 처리)
-- subscriptions, usage_logs도 service_role만 (직접 수정 차단)

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "usage_logs_select_own"
  on public.usage_logs for select
  using (auth.uid() = user_id);
```

- [ ] **Step 2: 적용**

```bash
pnpm db:push
```

- [ ] **Step 3: Supabase Studio에서 RLS 활성화 확인**

각 테이블의 "RLS enabled" 표시 확인.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(db): enable RLS and add per-user access policies"
```

---

## Task 12: Supabase 클라이언트 셋업 — 브라우저용

**Files:**
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1: 패키지 설치**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: 테스트 작성**

`src/__tests__/lib/supabase/client.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  },
}));

describe('createClient (browser)', () => {
  it('returns a Supabase client', async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const client = createClient();
    expect(client).toBeDefined();
    expect(typeof client.auth.getUser).toBe('function');
  });
});
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

```bash
pnpm test:run src/__tests__/lib/supabase/client.test.ts
```

Expected: FAIL — `@/lib/supabase/client` 없음.

- [ ] **Step 4: 구현**

`src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm test:run src/__tests__/lib/supabase/client.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Supabase browser client"
```

---

## Task 13: Supabase 클라이언트 셋업 — 서버용

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`

- [ ] **Step 1: 서버 클라이언트 구현**

`src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출 시 무시 (미들웨어가 갱신함)
          }
        },
      },
    },
  );
}

export function createServiceClient() {
  // service_role key — 서버에서만 사용. RLS 우회.
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
```

- [ ] **Step 2: 미들웨어 클라이언트 구현**

`src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 새로고침
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Supabase server and middleware clients"
```

---

## Task 14: Auth 미들웨어 (보호 라우트)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: 미들웨어 구현**

`middleware.ts` (프로젝트 루트):
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PATHS = ['/dashboard', '/settings', '/billing'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  // 인증 안 됐는데 보호 라우트 접근 → 로그인 리다이렉트
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 이미 인증됐는데 /login 접근 → 대시보드
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 2: 검증 (수동)**

```bash
pnpm dev
```

브라우저에서 http://localhost:3000/dashboard 접속 → /login 으로 리다이렉트 확인.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add auth middleware for protected routes"
```

---

## Task 15: 구글 OAuth 설정 (Supabase Dashboard)

**수동 작업 (코드 변경 없음).**

- [ ] **Step 1: Supabase Dashboard → Authentication → Providers**

- [ ] **Step 2: Google provider 활성화**

- [ ] **Step 3: Pre-flight에서 만든 Google OAuth Client ID + Secret 입력**

- [ ] **Step 4: Authorized redirect URIs 확인**

Supabase가 표시하는 redirect URI를 Google Cloud Console의 OAuth 클라이언트에 등록:
- 예: `https://<project-ref>.supabase.co/auth/v1/callback`

- [ ] **Step 5: Save**

---

## Task 16: 구글 로그인 버튼 + 콜백

**Files:**
- Create: `src/components/auth/login-button-google.tsx`, `src/app/auth/callback/route.ts`, `src/app/login/page.tsx`

- [ ] **Step 1: 로그인 페이지 작성**

`src/app/login/page.tsx`:
```typescript
import { LoginButtonGoogle } from '@/components/auth/login-button-google';
import { LoginButtonKakao } from '@/components/auth/login-button-kakao';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold">로그인</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          간편 로그인으로 시작하세요
        </p>
        <div className="space-y-3">
          <LoginButtonGoogle />
          <LoginButtonKakao />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 구글 로그인 버튼**

`src/components/auth/login-button-google.tsx`:
```typescript
'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';

export function LoginButtonGoogle() {
  const handleClick = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleClick}>
      <span className="mr-2">G</span>
      Google로 계속하기
    </Button>
  );
}
```

- [ ] **Step 3: 카카오 로그인 버튼 (placeholder, Task 18에서 구현)**

`src/components/auth/login-button-kakao.tsx`:
```typescript
'use client';

import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

export function LoginButtonKakao() {
  const handleClick = () => {
    const params = new URLSearchParams({
      client_id: env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
      redirect_uri: env.NEXT_PUBLIC_KAKAO_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile_nickname account_email',
    });
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`;
  };

  return (
    <Button
      className="w-full bg-[#FEE500] text-black hover:bg-[#FDD835]"
      onClick={handleClick}
    >
      카카오로 계속하기
    </Button>
  );
}
```

- [ ] **Step 4: 구글 OAuth 콜백 라우트**

`src/app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 5: 검증 (수동 E2E)**

```bash
pnpm dev
```

브라우저에서 http://localhost:3000/login → "Google로 계속하기" 클릭 → Google 로그인 → 콜백 받고 `/dashboard`로 리다이렉트 확인.

(이 시점 `/dashboard`는 아직 없으므로 404 또는 빈 페이지 OK. Task 20에서 만듦.)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Google OAuth login flow"
```

---

## Task 17: 카카오 OAuth 헬퍼 (OIDC)

Supabase는 카카오를 직접 지원하지 않으므로 수동 OIDC + service role로 사용자 매칭.

**Files:**
- Create: `src/lib/kakao/oauth.ts`, `src/app/auth/kakao/callback/route.ts`

- [ ] **Step 1: 카카오 토큰 교환 헬퍼 작성**

`src/lib/kakao/oauth.ts`:
```typescript
import { env } from '@/lib/env';

interface KakaoTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
}

interface KakaoUserInfo {
  id: number;
  kakao_account: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

export async function exchangeKakaoCode(code: string): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
    client_secret: env.KAKAO_CLIENT_SECRET,
    redirect_uri: env.NEXT_PUBLIC_KAKAO_REDIRECT_URI,
    code,
  });

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`Kakao token exchange failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Kakao userinfo failed: ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 2: 카카오 콜백 라우트**

`src/app/auth/kakao/callback/route.ts`:
```typescript
import { exchangeKakaoCode, fetchKakaoUserInfo } from '@/lib/kakao/oauth';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // 1. 카카오 토큰 교환
    const tokens = await exchangeKakaoCode(code);
    const userInfo = await fetchKakaoUserInfo(tokens.access_token);

    const email = userInfo.kakao_account.email;
    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=no_email`);
    }

    // 2. Supabase에 카카오 사용자 매핑 (service role 사용)
    const admin = createServiceClient();

    // 이메일로 기존 사용자 조회
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email === email);

    let userId: string;
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: userInfo.kakao_account.profile?.nickname,
          avatar_url: userInfo.kakao_account.profile?.profile_image_url,
          provider: 'kakao',
          kakao_id: userInfo.id,
        },
      });
      if (error || !created.user) {
        throw new Error(`User creation failed: ${error?.message}`);
      }
      userId = created.user.id;
    }

    // 3. Supabase magic link 생성하여 세션 발급
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    if (linkError || !linkData.properties?.action_link) {
      throw new Error('Failed to generate session link');
    }

    // 4. magic link의 토큰만 추출하여 클라이언트 클라이언트로 verify
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get('token');

    if (!tokenHash) {
      throw new Error('No token in magic link');
    }

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });

    if (verifyError) {
      throw new Error(`OTP verify failed: ${verifyError.message}`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (e) {
    console.error('Kakao auth error:', e);
    return NextResponse.redirect(`${origin}/login?error=kakao_failed`);
  }
}
```

> ⚠️ **참고**: 카카오 OAuth를 Supabase Auth에 매핑하는 방식은 여러 가지가 있고, 위 구현은 magic link를 사용한 단순 매핑이다. 운영 환경에서는 보안 검토 후 [Supabase Edge Function 기반 사용자 정의 토큰 발급](https://supabase.com/docs/guides/auth/auth-hooks)을 검토할 것. V1 출시 후 보강.

- [ ] **Step 3: 검증 (수동)**

```bash
pnpm dev
```

http://localhost:3000/login → "카카오로 계속하기" → 카카오 로그인 → /dashboard 도달 확인.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Kakao OAuth flow with Supabase user mapping"
```

---

## Task 18: 로그아웃

**Files:**
- Create: `src/app/auth/logout/route.ts`, `src/components/auth/logout-button.tsx`

- [ ] **Step 1: 로그아웃 라우트**

`src/app/auth/logout/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}
```

- [ ] **Step 2: 로그아웃 버튼**

`src/components/auth/logout-button.tsx`:
```typescript
'use client';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const handleClick = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <Button variant="ghost" onClick={handleClick}>
      로그아웃
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add logout flow"
```

---

## Task 19: 인증된 라우트 그룹 + 레이아웃

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/layout/app-header.tsx`

- [ ] **Step 1: 앱 헤더**

`src/components/layout/app-header.tsx`:
```typescript
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';

export function AppHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold">
          AA
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{userEmail}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 인증 그룹 레이아웃**

`src/app/(app)/layout.tsx`:
```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/layout/app-header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader userEmail={user.email ?? ''} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add authenticated app layout with header"
```

---

## Task 20: 빈 대시보드 페이지

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: 페이지 작성**

`src/app/(app)/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // profiles 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              현재 플랜
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{profile?.plan ?? 'free'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              이번 달 사용량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {profile?.monthly_generation_used ?? 0} /{' '}
              {profile?.monthly_generation_limit ?? 5}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              생성 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="text-slate-500">
          아직 생성된 라이프스타일컷이 없습니다.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          (Plan 2에서 "새 생성" 버튼이 추가됩니다)
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 검증**

```bash
pnpm dev
```

로그인 후 http://localhost:3000/dashboard 에서 사용자 이메일 + Free 플랜 + 0/5 사용량 표시 확인.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add empty dashboard page"
```

---

## Task 21: 헬스체크 API

**Files:**
- Create: `src/app/api/health/route.ts`, `src/__tests__/api/health.test.ts`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/api/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
pnpm test:run src/__tests__/api/health.test.ts
```

Expected: FAIL — `@/app/api/health/route` 없음.

- [ ] **Step 3: 구현**

`src/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test:run src/__tests__/api/health.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add /api/health endpoint"
```

---

## Task 22: Playwright E2E 셋업

**Files:**
- Create: `playwright.config.ts`, `e2e/health.spec.ts`

- [ ] **Step 1: Playwright 설치**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: 설정 파일**

`playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: 헬스체크 E2E**

`e2e/health.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: 'ok' });
});

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByText('Google로 계속하기')).toBeVisible();
  await expect(page.getByText('카카오로 계속하기')).toBeVisible();
});

test('dashboard redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: package.json scripts에 e2e 추가**

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

- [ ] **Step 5: 실행**

```bash
pnpm e2e
```

Expected: 3개 테스트 PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: add Playwright E2E setup with health and auth tests"
```

---

## Task 23: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: CI 워크플로우 작성**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:run
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://test.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: anon
          SUPABASE_SERVICE_ROLE_KEY: service
          NEXT_PUBLIC_KAKAO_CLIENT_ID: kakao
          KAKAO_CLIENT_SECRET: secret
          NEXT_PUBLIC_KAKAO_REDIRECT_URI: http://localhost:3000/auth/kakao/callback
          NEXT_PUBLIC_APP_URL: http://localhost:3000

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://test.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: anon
          SUPABASE_SERVICE_ROLE_KEY: service
          NEXT_PUBLIC_KAKAO_CLIENT_ID: kakao
          KAKAO_CLIENT_SECRET: secret
          NEXT_PUBLIC_KAKAO_REDIRECT_URI: http://localhost:3000/auth/kakao/callback
          NEXT_PUBLIC_APP_URL: http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "ci: add GitHub Actions workflow for tests and build"
```

---

## Task 24: Vercel 배포 설정

**Files:**
- Create: `vercel.json` (필요시)

수동 + 코드 작업.

- [ ] **Step 1: GitHub에 push**

```bash
git remote add origin https://github.com/<your-username>/<repo>.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Vercel 대시보드에서 import**

https://vercel.com/new → GitHub 저장소 선택.

- [ ] **Step 3: Vercel 환경 변수 설정**

`Production`, `Preview`, `Development` 모두에 .env.local의 값 그대로 입력 (단 NEXT_PUBLIC_APP_URL은 production 도메인으로):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `NEXT_PUBLIC_KAKAO_REDIRECT_URI` → 프로덕션은 `https://<vercel-url>/auth/kakao/callback`
- `NEXT_PUBLIC_APP_URL` → 프로덕션 URL

- [ ] **Step 4: Deploy 트리거 + 배포 성공 확인**

- [ ] **Step 5: 카카오 디벨로퍼스에 프로덕션 redirect URI 추가**

`https://<vercel-url>/auth/kakao/callback`

- [ ] **Step 6: Google Cloud Console에 프로덕션 redirect URI 추가**

(Supabase가 표시하는 URL — 이미 등록돼있으면 OK)

- [ ] **Step 7: 프로덕션 배포에서 로그인 테스트 (수동)**

배포된 URL → /login → 구글/카카오 로그인 → /dashboard 진입 확인.

---

## Task 25: Sentry 통합

**Files:**
- Modify: `next.config.ts`
- Create: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

- [ ] **Step 1: Sentry 설치 마법사**

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
```

DSN, project name 입력하라는 프롬프트에 응답. 자동으로 설정 파일들이 생성됨.

- [ ] **Step 2: 환경 변수 확인**

`.env.local`에 `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` 입력 (Sentry Project Settings → Client Keys / Auth Tokens).

- [ ] **Step 3: 동작 검증 — 일부러 에러 발생**

`src/app/api/health/route.ts` 임시 수정 후 호출 → Sentry 대시보드에 이벤트 도착 확인 → 다시 정상화.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: integrate Sentry for error tracking"
```

---

## Task 26: PostHog 통합

**Files:**
- Create: `src/lib/posthog/client.ts`, `src/components/posthog-provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 패키지 설치**

```bash
pnpm add posthog-js
```

- [ ] **Step 2: 클라이언트 초기화 모듈**

`src/lib/posthog/client.ts`:
```typescript
import posthog from 'posthog-js';
import { env } from '@/lib/env';

if (typeof window !== 'undefined' && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // 직접 처리
  });
}

export { posthog };
```

- [ ] **Step 3: Provider 컴포넌트**

`src/components/posthog-provider.tsx`:
```typescript
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { posthog } from '@/lib/posthog/client';

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = `${pathname}${searchParams ? `?${searchParams.toString()}` : ''}`;
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
```

- [ ] **Step 4: layout.tsx 업데이트**

`src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { PostHogProvider } from '@/components/posthog-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AA — Korean Seller AI Visual',
  description: '한국 셀러용 AI 라이프스타일컷 생성기',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: 검증 — PostHog 대시보드에 pageview 도착 확인**

```bash
pnpm dev
```

브라우저에서 페이지 몇 개 이동 → PostHog Live Events에 도착 확인.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: integrate PostHog for product analytics"
```

---

## Task 27: 개발 환경 README

**Files:**
- Create: `README.md`, `docs/DEV_SETUP.md`

- [ ] **Step 1: README 작성**

`README.md`:
```markdown
# AA — Korean Seller AI Visual

한국 스마트스토어/쿠팡 셀러용 AI 라이프스타일컷 생성기.

## 개발 시작

\`\`\`bash
pnpm install
cp .env.local.example .env.local  # 환경 변수 입력
pnpm dev
\`\`\`

자세한 셋업 가이드: [docs/DEV_SETUP.md](docs/DEV_SETUP.md)

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres + Auth)
- TailwindCSS + shadcn/ui
- Vercel (배포)

## 명령

| 명령 | 설명 |
|---|---|
| \`pnpm dev\` | 개발 서버 |
| \`pnpm build\` | 프로덕션 빌드 |
| \`pnpm test\` | 단위 테스트 (watch) |
| \`pnpm test:run\` | 단위 테스트 1회 |
| \`pnpm e2e\` | E2E 테스트 |
| \`pnpm lint\` | ESLint |
| \`pnpm format\` | Prettier 포맷 |
| \`pnpm typecheck\` | TypeScript 타입 체크 |
| \`pnpm db:push\` | Supabase 마이그레이션 적용 |
| \`pnpm db:gen-types\` | DB 타입 생성 |
\`\`\`

## 문서

- [디자인 스펙](docs/superpowers/specs/2026-05-01-korean-seller-ai-visual-design.md)
- [Plan 1: Foundation](docs/superpowers/plans/2026-05-01-plan-1-foundation.md)
```

- [ ] **Step 2: DEV_SETUP.md 작성**

`docs/DEV_SETUP.md`:
```markdown
# 개발 환경 셋업

## 필수 사전 준비

1. **Node.js 20+** 설치
2. **pnpm 9+** 설치 (`npm install -g pnpm`)
3. **Supabase CLI** (이미 dev dep으로 설치됨)
4. **외부 서비스 계정**:
   - Supabase 프로젝트
   - Google Cloud OAuth 클라이언트
   - 카카오 디벨로퍼스 앱 (REST API + OIDC 활성화)
   - Vercel 계정
   - Sentry 프로젝트
   - PostHog 프로젝트

## 환경 변수

\`.env.local\`에 다음을 채워넣는다:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
\`\`\`

## DB 셋업

\`\`\`bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
pnpm db:push
pnpm db:gen-types
\`\`\`

## 첫 실행

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## OAuth 설정

### Google

Supabase Dashboard → Authentication → Providers → Google에서 활성화.
Google Cloud Console에서 redirect URI를 \`https://<project-ref>.supabase.co/auth/v1/callback\` 으로 등록.

### Kakao

카카오 디벨로퍼스에서:
1. 앱 생성 → REST API 키 복사
2. 카카오 로그인 활성화
3. OIDC 활성화
4. Redirect URI: \`http://localhost:3000/auth/kakao/callback\` (개발), \`https://<your-domain>/auth/kakao/callback\` (프로덕션)
5. 동의 항목: 닉네임, 이메일, 프로필 사진
\`\`\`

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "docs: add README and DEV_SETUP guide"
```

---

## Task 28: 최종 통합 테스트

전체 플랜이 끝난 시점의 검증.

- [ ] **Step 1: 모든 명령 실행**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm e2e
pnpm build
```

Expected: 전부 PASS.

- [ ] **Step 2: 수동 시나리오 테스트**

1. http://localhost:3000 접속 → /login 이동
2. Google로 로그인 → /dashboard 도달, 이메일 표시
3. 로그아웃 → /login 복귀
4. 카카오로 로그인 → /dashboard 도달
5. /api/health → `{"status":"ok"}` 응답
6. Sentry 일부러 에러 → Sentry 대시보드 확인
7. PostHog 라이브 이벤트 확인

- [ ] **Step 3: 프로덕션 배포 확인**

GitHub main에 푸시 → Vercel 자동 배포 → 프로덕션 URL에서 위 시나리오 반복.

- [ ] **Step 4: 최종 commit**

```bash
git add .
git commit --allow-empty -m "chore: complete Plan 1 (Foundation)"
git push
```

---

## Plan 1 완료 체크리스트

- [ ] Task 1: 프로젝트 초기화
- [ ] Task 2: ESLint, Prettier, Husky
- [ ] Task 3: TailwindCSS + shadcn/ui
- [ ] Task 4: 환경 변수 + zod 검증
- [ ] Task 5: Supabase CLI
- [ ] Task 6: DB profiles 테이블
- [ ] Task 7: DB brands 테이블
- [ ] Task 8: DB generations 테이블
- [ ] Task 9: DB subscriptions 테이블
- [ ] Task 10: DB usage_logs 테이블
- [ ] Task 11: RLS 정책
- [ ] Task 12: Supabase 브라우저 클라이언트
- [ ] Task 13: Supabase 서버 클라이언트
- [ ] Task 14: Auth 미들웨어
- [ ] Task 15: 구글 OAuth (Supabase 설정)
- [ ] Task 16: 구글 로그인 + 콜백
- [ ] Task 17: 카카오 OAuth
- [ ] Task 18: 로그아웃
- [ ] Task 19: 인증 레이아웃
- [ ] Task 20: 빈 대시보드
- [ ] Task 21: /api/health
- [ ] Task 22: Playwright E2E
- [ ] Task 23: GitHub Actions CI
- [ ] Task 24: Vercel 배포
- [ ] Task 25: Sentry
- [ ] Task 26: PostHog
- [ ] Task 27: README
- [ ] Task 28: 통합 테스트

---

## 다음: Plan 2 (AI Generation Core)

Plan 1 완료 후 Plan 2 작성. Plan 2 범위:

- Cloudflare R2 셋업 + 이미지 업로드 API
- Upstash Redis 셋업 + 사용량 카운터
- Replicate API 통합 (BiRefNet 누끼, FLUX + ControlNet 라이프스타일)
- 분위기/환경 프리셋 시스템 (V1: 50개)
- 생성 큐 + 비동기 처리
- generations 테이블 채우는 API
- 비용 추적
- 에러 처리 + 재시도

저장 위치 예정: `docs/superpowers/plans/2026-05-XX-plan-2-ai-generation.md`
