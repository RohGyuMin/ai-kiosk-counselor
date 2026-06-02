// 가상 아파트 단지 지식베이스
//
// 데모용으로 만든 가공의 단지 정보. 실제 단지와 무관하다.
// 이 데이터가 (1) LLM 시스템 프롬프트의 근거가 되고,
// (2) LLM을 못 쓸 때의 폴백(FAQ) 답변 근거도 된다.

export const PROJECT = {
  brand: '한빛자이 더 센트럴',
  developer: '한빛건설 · 자이',
  location: '경기도 시안시 미래구 센트럴로 100 (센트럴역 도보 5분)',
  totalHouseholds: 1248,
  buildings: 12,
  floors: '지하 3층 ~ 지상 35층',
  moveInDate: '2028년 6월 예정',
  parking: '세대당 1.42대 (전기차 충전 120면)',
  heating: '개별난방(도시가스)',
  types: [
    {
      name: '59A',
      exclusive: '59.94㎡',
      supply: '84.21㎡',
      households: 320,
      rooms: '방3·욕실2',
      price: '6억 4,800만',
    },
    {
      name: '74B',
      exclusive: '74.88㎡',
      supply: '102.5㎡',
      households: 408,
      rooms: '방3·욕실2',
      price: '7억 9,500만',
    },
    {
      name: '84A',
      exclusive: '84.97㎡',
      supply: '114.3㎡',
      households: 412,
      rooms: '방4·욕실2',
      price: '9억 2,000만',
    },
    {
      name: '101P',
      exclusive: '101.2㎡',
      supply: '135.8㎡',
      households: 108,
      rooms: '방4·욕실2·알파룸',
      price: '12억 6,000만',
    },
  ],
  schedule: {
    특별공급: '2026-11-16 (월)',
    '1순위': '2026-11-17 (화)',
    '2순위': '2026-11-18 (수)',
    당첨자발표: '2026-11-25 (화)',
    정당계약: '2026-12-08 ~ 12-10',
  },
  amenities: [
    '단지 내 국공립 어린이집 2곳',
    '센트럴역(수도권 광역급행 GTX-가칭) 도보 5분',
    '대형마트·스트리트형 상가 단지 직결',
    '센트럴 호수공원 인접, 단지 내 1.2km 산책로',
    '커뮤니티: 실내수영장·피트니스·골프연습장·라운지·게스트하우스',
  ],
  finance: {
    중도금: '60% 무이자 (6회 분납)',
    계약금: '10%',
    잔금: '30%',
    발코니확장: '전 타입 무상 (지정 기간 내)',
  },
} as const;

// 답변과 함께 키오스크 화면에 띄울 안내 이미지 (그라데이션 일러스트, public/media)
export const MEDIA: Record<string, { src: string; alt: string }> = {
  floorplan: { src: '/media/floorplan.svg', alt: '평형별 평면 안내' },
  location: { src: '/media/location.svg', alt: '입지 및 교통 안내' },
  schedule: { src: '/media/schedule.svg', alt: '청약 일정 안내' },
  amenity: { src: '/media/amenity.svg', alt: '커뮤니티·생활 인프라' },
  finance: { src: '/media/finance.svg', alt: '분양가 및 납부 안내' },
  overview: { src: '/media/overview.svg', alt: '단지 전경 안내' },
};

/** LLM에 주입할 시스템 프롬프트 (가상 단지 데이터 기반) */
export function buildSystemPrompt(): string {
  const t = PROJECT.types
    .map(
      (x) =>
        `- ${x.name}형: 전용 ${x.exclusive}/공급 ${x.supply}, ${x.rooms}, ${x.households}세대, 분양가 약 ${x.price}원`,
    )
    .join('\n');
  const s = Object.entries(PROJECT.schedule)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `당신은 '${PROJECT.brand}' 모델하우스에 설치된 AI 상담사 키오스크입니다.
방문객의 청약 및 아파트 관련 질문에 친절하고 신뢰감 있게 한국어로 답합니다.

[응대 원칙]
- 음성으로 읽어줄 답변이므로 2~4문장으로 간결하게. 표·마크다운·이모지 금지.
- 아래 단지 정보에 근거해서만 답하고, 모르는 사실은 지어내지 말고 "상담 데스크에서 확인을 도와드리겠습니다"로 안내.
- 가격·일정은 "약", "예정" 등 확정이 아님을 자연스럽게 덧붙임.
- 마지막에 필요하면 관련 후속 질문 하나를 짧게 권유.

[단지 개요]
- 브랜드: ${PROJECT.brand} (${PROJECT.developer})
- 위치: ${PROJECT.location}
- 규모: 총 ${PROJECT.totalHouseholds}세대, ${PROJECT.buildings}개 동, ${PROJECT.floors}
- 입주: ${PROJECT.moveInDate}
- 주차: ${PROJECT.parking} / 난방: ${PROJECT.heating}

[공급 타입]
${t}

[청약 일정]
${s}

[금융 조건]
- 계약금 ${PROJECT.finance.계약금}, 중도금 ${PROJECT.finance.중도금}, 잔금 ${PROJECT.finance.잔금}
- 발코니: ${PROJECT.finance.발코니확장}

[생활 인프라]
${PROJECT.amenities.map((a) => `- ${a}`).join('\n')}`;
}

// ── 폴백(무키/오프라인) 시나리오 ─────────────────────────────
// 키워드 매칭으로 미리 작성한 답변을 돌려준다. 발표 현장에서 키 없이도 데모 가능.

interface FallbackRule {
  keyword: string; // 통계 분류용 대표 키워드
  patterns: RegExp;
  imageKey?: string;
  answer: string;
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    keyword: '평형/타입',
    patterns: /(평형|타입|면적|몇 평|방 ?개수|구조|평면)/,
    imageKey: 'floorplan',
    answer: `${PROJECT.brand}은 59·74·84·101 네 가지 타입으로 공급됩니다. 가장 인기 있는 84A형은 전용 84.97제곱미터, 방 4개 구조로 412세대 규모입니다. 특정 타입의 평면이나 분양가가 궁금하시면 말씀해 주세요.`,
  },
  {
    keyword: '분양가/금융',
    // '얼마(?!나)': "얼마인가요"(가격)는 잡고 "얼마나"(거리·정도)는 제외
    patterns: /(분양가|가격|얼마(?!나)|금액|계약금|중도금|잔금|대출|무이자)/,
    imageKey: 'finance',
    answer: `분양가는 59A형 약 6억 4천8백만 원부터 101P형 약 12억 6천만 원까지입니다. 계약금 10퍼센트, 중도금 60퍼센트는 무이자 6회 분납, 잔금 30퍼센트 조건입니다. 관심 있는 타입을 알려주시면 더 자세히 안내해 드릴게요.`,
  },
  {
    keyword: '청약일정',
    patterns: /(일정|언제|청약일|접수|발표|당첨|계약일|순위)/,
    imageKey: 'schedule',
    answer: `특별공급은 2026년 11월 16일, 1순위 청약은 11월 17일에 진행됩니다. 당첨자 발표는 11월 25일, 정당 계약은 12월 8일부터 사흘간 예정입니다. 청약 자격이나 준비 서류가 궁금하시면 도와드리겠습니다.`,
  },
  {
    keyword: '입지/교통',
    patterns: /(위치|교통|지하철|역|입지|어디|버스|학교|학군)/,
    imageKey: 'location',
    answer: `단지는 센트럴역에서 도보 5분 거리이며, 광역급행 노선으로 도심 접근성이 좋습니다. 단지 내 국공립 어린이집 두 곳과 센트럴 호수공원이 인접해 생활 여건이 우수합니다. 교통이나 학군 중 어떤 점이 더 궁금하신가요?`,
  },
  {
    keyword: '커뮤니티',
    patterns: /(커뮤니티|수영장|헬스|피트니스|주차|시설|상가|마트)/,
    imageKey: 'amenity',
    answer: `커뮤니티 시설로 실내수영장, 피트니스, 골프연습장, 라운지, 게스트하우스를 갖추고 있습니다. 주차는 세대당 1.42대로 넉넉하며 전기차 충전 120면을 마련했습니다. 더 궁금한 시설이 있으면 말씀해 주세요.`,
  },
  {
    keyword: '입주/규모',
    patterns: /(입주|규모|세대수|동수|준공|난방)/,
    imageKey: 'overview',
    answer: `${PROJECT.brand}은 총 1,248세대, 12개 동 규모로 2028년 6월 입주 예정입니다. 개별 도시가스 난방을 적용합니다. 단지 규모나 입주 일정 중 어떤 점을 더 알려드릴까요?`,
  },
];

const DEFAULT_FALLBACK: Omit<FallbackRule, 'patterns'> = {
  keyword: '일반문의',
  imageKey: 'overview',
  answer: `${PROJECT.brand} AI 상담사입니다. 평형과 분양가, 청약 일정, 입지와 교통, 커뮤니티 시설 등을 안내해 드릴 수 있습니다. 어떤 점이 궁금하신가요?`,
};

export interface FallbackResult {
  answer: string;
  keyword: string;
  imageKey?: string;
}

/** 키워드 매칭으로 폴백 답변 생성 */
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

/** 질문을 통계용 키워드로 분류 (LLM 답변 경로에서도 사용) */
export function classifyKeyword(message: string): string {
  for (const rule of FALLBACK_RULES) {
    if (rule.patterns.test(message)) return rule.keyword;
  }
  return DEFAULT_FALLBACK.keyword;
}

/** 질문에 맞는 안내 이미지 키 추론 */
export function inferImageKey(message: string): string | undefined {
  for (const rule of FALLBACK_RULES) {
    if (rule.patterns.test(message)) return rule.imageKey;
  }
  return DEFAULT_FALLBACK.imageKey;
}

/** 키오스크 첫 화면 추천 질문 칩 */
export const SUGGESTED_QUESTIONS = [
  '84형 분양가가 얼마인가요?',
  '청약 일정이 어떻게 되나요?',
  '지하철역에서 얼마나 걸리나요?',
  '커뮤니티 시설은 뭐가 있나요?',
  '중도금 무이자 조건이 궁금해요',
];
