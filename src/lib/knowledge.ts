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
  // 가벼운 증상 안내 가이드 (의학적 진단 X — 대기·진료 우선순위만 안내)
  symptomGuide: {
    원칙: '증상 호소 시 진단·처방은 절대 하지 않고, 적합한 진료과/진료 우선순위만 안내',
    응급: '의식 저하·심한 흉통·호흡곤란·심한 출혈·심한 복통·고열 동반 의식 변화 → 즉시 119 또는 응급실',
    내과대상: '감기·기침·콧물·인후통·발열·소화불량·복통·설사·구토·어지럼증·고혈압·당뇨 관리',
    소아대상: '만 18세 이하 발열·기침·설사·예방접종·성장 상담',
    재방문: '기존 진료 환자분은 처방약 재처방 위해 진료 후 처방 가능 (전화 처방은 어렵습니다)',
  },
  appointment: {
    네이버예약: 'https://booking.naver.com 또는 네이버 검색 "한빛내과의원" → 예약하기',
    똑닥: '똑닥 앱에서 "한빛내과의원" 검색 → 당일 대기 등록',
    전화예약: '02-123-4567 (평일 09:00–17:30, 토 09:00–12:30)',
    당일진료: '당일 예약·당일 진료 가능 — 평일 17시 이전 방문 권장',
    취소변경: '예약 1시간 전까지 앱 또는 전화로 변경 가능',
  },
  prescription: {
    원칙: '처방전은 의사 진료 후에만 발급 — 비대면·전화 처방은 운영하지 않습니다',
    재방문주기: '고혈압·당뇨 등 만성 질환은 보통 1~3개월 간격 처방',
    분실: '처방전 분실 시 재방문하여 진료 후 재발급',
    조제: '인근 약국(한빛약국 1층, 합정약국 도보 1분)에서 조제 가능',
  },
  vaccination: {
    독감: '매년 10월~익년 2월, 만 65세 이상 무료 (보건소 사업 연동)',
    폐렴구균: '만 65세 이상 1회 무료, 기타 연령은 비급여',
    파상풍: '10년마다 추가 접종 권장',
    상시문의: '예방접종 일정·재고는 원무과(02-123-4567)에 문의',
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
- 음성으로 읽어줄 답변이므로 매우 간결하게: 1~2문장, 80자 이내가 이상적. 절대 4문장을 넘기지 말 것.
- 표·마크다운·이모지·줄바꿈 금지. 평문 한 단락.
- 아래 병원 정보에 근거해서만 답하고, 모르는 내용은 "원무과에 문의해 주세요"로 짧게 안내.
- 의학적 진단·처방·증상 해석은 절대 하지 않음. "원장님께 진료를 받아보시길 권합니다"로 안내.
- 후속 질문 권유는 하지 않음 (사용자가 충분히 듣고 다음을 결정).

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
- 기타: ${CLINIC.insurance.산재의보}

[증상 관련 응대 원칙]
- 진단·처방은 절대 하지 않음. 적합한 진료과/방문 권유만.
- 응급 상황(${CLINIC.symptomGuide.응급})으로 추정되면 "즉시 119 또는 응급실 이용을 권합니다"로 안내.
- 내과 영역: ${CLINIC.symptomGuide.내과대상}
- 소아(만 18세 이하): ${CLINIC.symptomGuide.소아대상}
- 기존 환자의 재처방: ${CLINIC.symptomGuide.재방문}

[예약 안내]
- 네이버 예약/똑닥 앱/전화 예약 가능, 당일 예약 당일 진료
- ${CLINIC.appointment.당일진료}
- 변경/취소: ${CLINIC.appointment.취소변경}

[처방·약]
- ${CLINIC.prescription.원칙}
- 만성 질환 처방 주기: ${CLINIC.prescription.재방문주기}
- 처방전 분실 시: ${CLINIC.prescription.분실}
- 인근 약국: ${CLINIC.prescription.조제}

[예방접종]
- 독감: ${CLINIC.vaccination.독감}
- 폐렴구균: ${CLINIC.vaccination.폐렴구균}
- 파상풍: ${CLINIC.vaccination.파상풍}
- 일정·재고 문의는 원무과로 안내`;
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
  {
    keyword: '증상상담',
    patterns:
      /(아파|아픈|증상|기침|콧물|열|발열|두통|복통|배 ?아프|어지|소화|설사|구토|어떤 ?병|걸린|감기)/,
    imageKey: 'department',
    answer: `증상은 직접 진단해드리지 못해 죄송하지만, 감기·발열·소화기 증상이면 내과 진료가 적합합니다. 자녀분 증상은 소아청소년과로 안내드립니다. 의식 저하나 심한 흉통·호흡곤란이 있다면 즉시 119나 응급실로 가셔야 합니다. 원장님 진료를 받아보시길 권합니다.`,
  },
  {
    keyword: '예약',
    patterns: /(예약|네이버 ?예약|똑닥|당일|대기 ?등록|순서|취소|변경)/,
    imageKey: 'reception',
    answer: `예약은 네이버 예약, 똑닥 앱, 전화(02-123-4567) 세 가지 방법이 있습니다. 당일 예약과 당일 진료 모두 가능하며 평일 17시 이전 방문을 권장드립니다. 예약 변경이나 취소는 진료 1시간 전까지 가능합니다.`,
  },
  {
    keyword: '처방',
    patterns: /(처방|약|재처방|처방전|만성|고혈압.*약|당뇨.*약|복용|먹는 ?약)/,
    imageKey: 'reception',
    answer: `처방전은 의사 진료를 받으신 뒤에만 발급됩니다. 비대면이나 전화 처방은 운영하지 않습니다. 고혈압·당뇨 같은 만성 질환은 보통 1~3개월 간격으로 재처방을 받으시며, 인근 한빛약국이나 합정약국에서 조제가 가능합니다.`,
  },
  {
    keyword: '예방접종',
    patterns: /(접종|예방접종|독감|폐렴|파상풍|백신|주사)/,
    imageKey: 'insurance',
    answer: `독감 접종은 매년 10월부터 다음해 2월까지 진행되며 만 65세 이상은 무료입니다. 폐렴구균은 65세 이상 1회 무료, 파상풍은 10년마다 추가 접종을 권장합니다. 일정과 백신 재고는 원무과(02-123-4567)에 문의해 주세요.`,
  },
  {
    keyword: '응급',
    patterns: /(응급|119|쓰러|의식|흉통|호흡곤란|숨이|피가|출혈)/,
    imageKey: 'overview',
    answer: `의식 저하, 심한 흉통, 호흡곤란, 많은 출혈은 즉시 119에 신고하시거나 가까운 응급실로 가셔야 합니다. 본 의원은 응급실이 아니므로 응급 상황에서는 119 도움을 우선 받으시기 바랍니다.`,
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

/** 시간대 + 이름 + 익명 여부에 따라 다양한 인사를 생성 */
export function buildGreeting(opts: { name?: string; anonymous?: boolean; hour?: number }): string {
  const h = opts.hour ?? new Date().getHours();
  const slot =
    h < 6
      ? '이른 새벽'
      : h < 11
        ? '아침'
        : h < 13
          ? '점심'
          : h < 17
            ? '오후'
            : h < 21
              ? '저녁'
              : '늦은 저녁';

  const timeOpener = h < 11 ? '오늘 아침' : h < 13 ? '점심시간' : h < 17 ? '오후' : '저녁';

  const closers = [
    '진료시간, 위치, 접수 방법 등 무엇이든 편하게 물어보세요.',
    '오늘 어떤 안내가 필요하신가요?',
    '진료·예약·증상 안내 무엇이든 도와드리겠습니다.',
    '편하게 말씀하시면 안내해 드릴게요.',
  ];
  // 시간대 기반 결정론적 선택 (같은 분에 들어오면 같은 인사)
  const idx = Math.floor((h * 60 + new Date().getMinutes()) / 7) % closers.length;
  const closer = closers[idx];

  if (opts.anonymous) {
    return slot === '이른 새벽' || slot === '늦은 저녁'
      ? `안녕하세요, 한빛내과의원 AI 안내입니다. ${closer}`
      : `${timeOpener}에도 한빛내과의원을 찾아 주셔서 감사합니다. ${closer}`;
  }
  const name = (opts.name || '').trim();
  if (!name) return `안녕하세요, 한빛내과의원 AI 안내입니다. ${closer}`;
  return slot === '이른 새벽' || slot === '늦은 저녁'
    ? `${name}님, 한빛내과의원 AI 안내입니다. ${closer}`
    : `${name}님, ${timeOpener}에 한빛내과의원을 찾아 주셔서 감사합니다. ${closer}`;
}

/** 초기(대화 시작 시) 표시되는 추천 질문 */
export const SUGGESTED_QUESTIONS = [
  '진료시간이 어떻게 되나요?',
  '예약은 어떻게 하나요?',
  '감기 증상은 어디서 진료받나요?',
  '주차는 어떻게 하나요?',
  '독감 접종 가능한가요?',
  '처방전 재발급 받을 수 있나요?',
];

/** 직전 답변 키워드에 따라 자연스럽게 이어갈 후속 질문 */
export const FOLLOWUP_BY_KEYWORD: Record<string, string[]> = {
  진료시간: ['지금 가면 진료 받을 수 있나요?', '점심시간에도 접수되나요?', '주말에도 진료하나요?'],
  '진료과/전문': [
    '아이도 진료 받을 수 있나요?',
    '건강검진도 가능한가요?',
    '소아과 진료 시간은 따로인가요?',
  ],
  '위치/주차': ['지하철에서 얼마나 걸리나요?', '주차 시간 연장도 되나요?', '근처에 약국이 있나요?'],
  '접수/예약': [
    '예약 없이 바로 진료 되나요?',
    '준비물은 어떻게 되나요?',
    '대기 시간은 얼마나 되나요?',
  ],
  예약: [
    '예약을 취소하려면 어떻게 하나요?',
    '대기 시간은 얼마나 되나요?',
    '준비물은 무엇이 필요한가요?',
  ],
  '보험/비용': [
    '비급여 항목은 뭐가 있나요?',
    '실비 청구 서류 받을 수 있나요?',
    '비용 결제는 카드도 되나요?',
  ],
  '의료진/병원소개': [
    '진료시간이 어떻게 되나요?',
    '어떤 진료과가 있나요?',
    '예약은 어떻게 하나요?',
  ],
  증상상담: [
    '예약 없이 바로 진료 가능한가요?',
    '준비물은 무엇이 필요한가요?',
    '진료비는 얼마인가요?',
  ],
  처방: ['처방전 분실했어요', '인근 약국은 어디인가요?', '만성질환 재처방 받으려면요?'],
  예방접종: [
    '독감 접종 비용은 얼마인가요?',
    '아이 예방접종도 가능한가요?',
    '예약하고 가야 하나요?',
  ],
  응급: ['가까운 응급실은 어디인가요?', '의원 진료시간은 언제인가요?', '예약 가능한가요?'],
  일반문의: ['진료시간이 어떻게 되나요?', '예약은 어떻게 하나요?', '어디에 위치해 있나요?'],
};

export function getFollowupSuggestions(lastKeyword?: string): string[] {
  if (lastKeyword && FOLLOWUP_BY_KEYWORD[lastKeyword]) return FOLLOWUP_BY_KEYWORD[lastKeyword];
  return SUGGESTED_QUESTIONS.slice(0, 3);
}
