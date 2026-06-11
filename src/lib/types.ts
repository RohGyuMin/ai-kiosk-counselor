// 공용 타입 정의

export type Role = 'user' | 'assistant';

/** 답변 출처: 실제 LLM 호출인지, 폴백 시나리오인지 표시 (데모 투명성) */
export type AnswerSource = 'llm' | 'fallback';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  source: AnswerSource;
  /** 답변과 함께 노출할 안내 이미지 키 (knowledge의 media 키) */
  imageKey?: string;
  /** 통계용으로 분류된 질문 키워드 */
  keyword?: string;
}

export interface SessionRecord {
  id: string;
  name: string;
  phone: string;
  consent: number;
  started_at: string;
  ended_at: string | null;
}

export interface MessageRecord {
  id: number;
  session_id: string;
  role: Role;
  content: string;
  source: AnswerSource | null;
  created_at: string;
}

export interface AdminStats {
  totalVisitors: number;
  totalSessions: number;
  totalMessages: number;
  keywordCounts: { keyword: string; count: number }[];
  dailyVisitors: { date: string; count: number }[];
  /** 시간대(0~23)별 방문 분포 */
  hourlyVisitors: { hour: number; count: number }[];
}
