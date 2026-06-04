// 가상 의원 지식베이스 — 데모용 가공 정보
//
// 이 데이터가 (1) LLM 시스템 프롬프트의 근거가 되고,
// (2) LLM을 못 쓸 때의 폴백(FAQ) 답변 근거도 된다.

export const CLINIC = {
  name: '한빛내과의원',
  slogan: '가까운 곳에서, 믿을 수 있는 진료',
  director: '김한빛 원장 (내과 전문의)',
  location: '서울시 마포구 합정로 123, 한빛빌딩 3층',
  nearbyStation: '합정역 3번 출구 도보 2분',
  parking: '건물 지하주차장 2시간 무료 (원무과에서 스티커 수령)',
  phone: '02-123-4567',
  departments: [
    {
      name: '내과',
      desc: '감기·발열·소화기·고혈압·당뇨·갑상선 등 성인 만성·급성 질환',
    },
    {
      name: '가정의학과',
      desc: '건강검진·예방접종·금연·비만 관리, 전 연령 주치의 진료',
    },
    {
      name: '소아청소년과',
      desc: '영유아 검진·예방접종·소아 발열·성장 상담 (만 18세 이하)',
    },
  ],
  hours: {
    평일: '09:00 – 18:00',
    토요일: '09:00 – 13:00',
    점심시간: '13:00 – 14:00 (진료 중단)',
    일요일공휴일: '휴진',
  },
  reception: {
    예약: '네이버 예약 또는 똑닥 앱으로 사전 예약 가능 (당일 예약 당일 진료)',
    현장접수: '본 키오스크에서 번호표 발급 후 대기',
    준비물: '신분증, 건강보험증(또는 앱), 기존 복용 약 목록',
  },
  insurance: {
    건강보험: '건강보험 적용 (초진료·재진료 본인 부담 약 1,500원~5,000원)',
    비급여: '건강검진·예방접종·비만 주사 등은 비급여 항목',
    산재의보: '산재·자동차보험 진료 가능 — 원무과 문의',
  },
} as const;

// 답변과 함께 키오스크 화면에 띄울 안내 이미지
export const MEDIA: Record<string, { src: string; alt: string }> = {
  department: { src: '/media/department.svg', alt: '진료과 안내' },
  hours: { src: '/media/hours.svg', alt: '진료시간 안내' },
  location: { src: '/media/location.svg', alt: '위치 및 주차 안내' },
  reception: { src: '/media/reception.svg', alt: '접수 방법 안내' },
  insurance: { src: '/media/insurance.svg', alt: '보험 및 비용 안내' },
  overview: { src: '/media/overview.svg', alt: '한빛내과의원 소개' },
};

/** LLM에 주입할 시스템 프롬프트 */
export function buildSystemPrompt(): string {
  const depts = CLINIC.departments.map((d) => `- ${d.name}: ${d.desc}`).join('\n');
  const hrs = Object.entries(CLINIC.hours)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `당신은 '${CLINIC.name}'에 설치된 AI 안내 키오스크입니다.
내원객의 진료·접수·위치 관련 질문에 친절하고 간결하게 한국어로 답합니다.

[응대 원칙]
- 음성으로 읽어줄 답변이므로 2~4문장으로 간결하게. 표·마크다운·이모지 금지.
- 아래 병원 정보에 근거해서만 답하고, 모르는 내용은 "원무과 직원에게 직접 문의해 주세요"로 안내.
- 의학적 진단·처방·증상 해석은 절대 하지 않음. "원장님께 진료를 받아보시길 권합니다"로 안내.
- 마지막에 필요하면 관련 후속 질문 하나를 짧게 권유.

[병원 개요]
- 이름: ${CLINIC.name}
- 원장: ${CLINIC.director}
- 위치: ${CLINIC.location} (${CLINIC.nearbyStation})
- 주차: ${CLINIC.parking}
- 전화: ${CLINIC.phone}
- 슬로건: ${CLINIC.slogan}

[진료과목]
${depts}

[진료시간]
${hrs}

[접수 안내]
- 예약: ${CLINIC.reception.예약}
- 현장접수: ${CLINIC.reception.현장접수}
- 준비물: ${CLINIC.reception.준비물}

[보험·비용]
- 건강보험: ${CLINIC.insurance.건강보험}
- 비급여: ${CLINIC.insurance.비급여}
- 기타: ${CLINIC.insurance.산재의보}`;
}

// ── 폴백(무키/오프라인) 시나리오 ─────────────────────────────

interface FallbackRule {
  keyword: string;
  patterns: RegExp;
  imageKey?: string;
  answer: string;
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    keyword: '진료과/전문',
    patterns: /(진료과|내과|가정의학|소아|어린이|아이|무슨 과|어떤 과|전문)/,
    imageKey: 'department',
    answer: `한빛내과의원은 내과, 가정의학과, 소아청소년과를 운영합니다. 감기·소화기·고혈압 같은 성인 질환은 내과에서, 건강검진이나 예방접종은 가정의학과에서 진료받으실 수 있습니다. 소아청소년과는 만 18세 이하 환자를 담당합니다. 어떤 진료과가 더 궁금하신가요?`,
  },
  {
    keyword: '진료시간',
    patterns: /(시간|언제|몇 시|영업|운영|휴일|토요일|일요일|공휴일|점심)/,
    imageKey: 'hours',
    answer: `평일은 오전 9시부터 오후 6시까지, 토요일은 오전 9시부터 1시까지 진료합니다. 점심시간은 오후 1시부터 2시까지 진료가 중단되며, 일요일과 공휴일은 휴진입니다. 더 궁금한 점이 있으신가요?`,
  },
  {
    keyword: '위치/주차',
    patterns: /(위치|어디|주소|주차|역|교통|어떻게 오|찾아오)/,
    imageKey: 'location',
    answer: `한빛내과의원은 서울시 마포구 합정로 123, 한빛빌딩 3층에 있습니다. 합정역 3번 출구에서 도보로 2분 거리입니다. 주차는 건물 지하주차장을 이용하시고 원무과에서 무료 스티커를 받으시면 2시간 무료입니다.`,
  },
  {
    keyword: '접수/예약',
    patterns: /(접수|예약|번호표|대기|순서|대기시간|기다|준비물|신분증)/,
    imageKey: 'reception',
    answer: `네이버 예약 또는 똑닥 앱으로 사전 예약이 가능합니다. 현장 방문 시에는 이 키오스크에서 번호표를 발급받고 대기하시면 됩니다. 준비물은 신분증과 건강보험증이며 기존에 복용하시는 약이 있다면 목록을 지참하시면 좋습니다.`,
  },
  {
    keyword: '보험/비용',
    patterns: /(보험|비용|가격|얼마|급여|비급여|산재|실비|본인부담)/,
    imageKey: 'insurance',
    answer: `건강보험 적용 진료의 본인 부담금은 초진 기준 약 1,500원에서 5,000원 수준입니다. 건강검진이나 예방접종, 비만 관리 주사는 비급여 항목으로 별도 비용이 발생합니다. 정확한 금액은 원무과에 문의해 주세요.`,
  },
  {
    keyword: '의료진/병원소개',
    patterns: /(원장|의사|의료진|선생님|소개|어떤 병원|몇 년|특징)/,
    imageKey: 'overview',
    answer: `한빛내과의원은 김한빛 원장이 운영하는 내과 전문의 의원입니다. 내과, 가정의학과, 소아청소년과를 통해 전 연령 환자의 주치의 역할을 목표로 합니다. 가까운 곳에서 믿을 수 있는 진료를 제공하고 있습니다.`,
  },
];

const DEFAULT_FALLBACK: Omit<FallbackRule, 'patterns'> = {
  keyword: '일반문의',
  imageKey: 'overview',
  answer: `한빛내과의원 AI 안내입니다. 진료과목, 진료시간, 위치와 주차, 접수 방법, 보험 및 비용 안내를 도와드릴 수 있습니다. 어떤 점이 궁금하신가요?`,
};

export interface FallbackResult {
  answer: string;
  keyword: string;
  imageKey?: string;
}

export function getFallbackAnswer(message: string): FallbackResult {
  for (const rule of FALLBACK_RULES) {
    if (rule.patterns.test(message)) {
      return { answer: rule.answer, keyword: rule.keyword, imageKey: rule.imageKey };
    }
  }
  return {
    answer: DEFAULT_FALLBACK.answer,
    keyword: DEFAULT_FALLBACK.keyword,
    imageKey: DEFAULT_FALLBACK.imageKey,
  };
}

export function classifyKeyword(message: string): string {
  for (const rule of FALLBACK_RULES) {
    if (rule.patterns.test(message)) return rule.keyword;
  }
  return DEFAULT_FALLBACK.keyword;
}

export function inferImageKey(message: string): string | undefined {
  for (const rule of FALLBACK_RULES) {
    if (rule.patterns.test(message)) return rule.imageKey;
  }
  return DEFAULT_FALLBACK.imageKey;
}

export const SUGGESTED_QUESTIONS = [
  '진료시간이 어떻게 되나요?',
  '주차는 어떻게 하나요?',
  '어떤 진료과가 있나요?',
  '예약은 어떻게 하나요?',
  '진료비가 얼마나 되나요?',
];
