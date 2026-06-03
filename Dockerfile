# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# AI 키오스크 상담사 — Cloud Run / Docker 이미지
#
# 설계 의도:
# - Node 22+ 필요 (node:sqlite 내장 모듈 사용)
# - Next.js standalone 출력 → 런타임 이미지에 node_modules 전체가 아닌
#   실제 필요한 파일만 담겨 이미지가 가볍다.
# - 멀티스테이지 빌드: deps → builder → runner
# ─────────────────────────────────────────────────────────────

# 1) 의존성 설치 (pnpm)
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# 2) 빌드
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm build

# 3) 런타임 (가장 가벼운 이미지)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# node:sqlite 가용성 확보 (Node 22에서 실험적 플래그 필요 시 무해한 보강)
ENV NODE_OPTIONS=--experimental-sqlite

# 비루트 사용자 (보안)
RUN addgroup -S app && adduser -S app -G app

# Cloud Run의 쓰기 가능 영역은 /tmp (in-memory). 데이터는 컨테이너 수명 동안만 유지(휘발).
ENV DATA_DIR=/tmp
RUN chown -R app:app /app

# Next.js standalone 결과물
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 8080
# Cloud Run은 PORT 환경변수로 포트를 주입한다 (기본 8080)
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
