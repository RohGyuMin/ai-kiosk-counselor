# Google Cloud Run 배포 가이드

이 문서는 AI 키오스크 상담사 데모를 **Google Cloud Run**에 배포하는 절차입니다.
Cloud Run은 컨테이너 서버리스로, 사용량 기반 과금이며 작은 트래픽에서 무료 등급
범위 안에 들어옵니다.

> ⚠️ **데이터 휘발성**: Cloud Run 인스턴스는 상태가 없습니다. SQLite의 방문 기록은
> 인스턴스 재시작/재배포 시 사라집니다. 데모/시연 용도에는 충분하며, 영구 보존이
> 필요한 운영 단계에서는 Cloud SQL(PostgreSQL)로 전환을 권장합니다.

---

## 1. 사전 준비

```bash
# (한 번만) Google Cloud SDK 설치 후 로그인
gcloud auth login
gcloud auth configure-docker

# 프로젝트 ID 설정 (없으면 GCP 콘솔에서 새 프로젝트 생성)
gcloud config set project YOUR_PROJECT_ID

# 필요한 API 활성화
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com
```

---

## 2. API 키 시크릿 등록 (선택)

API 키를 환경변수로 노출하지 않고 Secret Manager에 저장합니다.

```bash
# Gemini 키 (무료 등급)
printf "AIza..." | gcloud secrets create GEMINI_API_KEY --data-file=-

# (선택) Anthropic 키
printf "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
```

시크릿 없이 배포해도 동작합니다(자동으로 폴백 답변으로 전환).

---

## 3. 배포 (가장 간단한 방법: 소스에서 직접)

저장소 루트에서 한 줄로 배포할 수 있습니다. Cloud Build가 클라우드에서
`Dockerfile`을 읽어 빌드 → 이미지 푸시 → Cloud Run 배포까지 자동으로 처리합니다.

```bash
gcloud run deploy ai-kiosk-counselor \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_OPTIONS=--experimental-sqlite
```

옵션 설명:
- `--region asia-northeast3` — 서울 리전(낮은 지연)
- `--allow-unauthenticated` — 공개 URL로 누구나 접근 가능 (포트폴리오용)
- `--min-instances 0` — 트래픽 없을 때 0으로 축소 → 비용 0원
- `--max-instances 3` — 폭주 방지 상한
- `--set-secrets` — Secret Manager의 값을 환경변수로 주입 (값이 코드/이미지에 박히지 않음)

시크릿 없이 배포할 경우 `--set-secrets` 줄을 제거하면 됩니다.

배포가 완료되면 `Service URL:` 형태로 공개 URL이 출력됩니다.

---

## 4. 동작 확인

```bash
URL=$(gcloud run services describe ai-kiosk-counselor \
  --region asia-northeast3 --format='value(status.url)')

echo "$URL"        # 키오스크
echo "$URL/admin"  # 관리자 대시보드
```

브라우저에서 URL로 접속해 상담을 진행해 보세요.

---

## 5. 재배포

코드를 수정한 뒤 **같은 명령**을 다시 실행하면 새 리비전이 배포됩니다.

```bash
gcloud run deploy ai-kiosk-counselor --source . --region asia-northeast3
```

---

## 6. 비용 감각

- **Cloud Run 무료 등급(매월)**: 200만 요청, 360,000 GB-초 메모리, 180,000 vCPU-초.
- 키오스크 데모 트래픽(하루 수십~수백 요청 수준)은 **거의 항상 무료** 범위 안.
- Gemini는 별도 무료 등급(분당·일일 요청 제한 안).
- 무료 한도를 넘어도 종량제라 큰 비용이 발생하지는 않지만, `--max-instances`로
  안전 상한을 두는 것을 권장합니다.

---

## 7. 한계와 다음 단계

- **데이터 휘발성**: 영구 보존이 필요하면 `src/lib/db.ts`를 Cloud SQL(PostgreSQL)로
  교체. 표준 SQL만 쓰고 있어 마이그레이션 코드 양이 적습니다.
- **관리자 인증 없음**: 공개 URL이라 `/admin`이 누구에게나 보입니다. 실제 운영 전에
  Cloud Run의 IAM 인증 또는 앱 단 비밀번호로 보호하세요.
- **콜드 스타트**: 0 → 1 인스턴스 기동에 1~2초 걸립니다. 시연 전 미리 한 번 호출해
  워밍하는 것을 권장합니다.
