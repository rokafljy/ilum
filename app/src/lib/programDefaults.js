/**
 * 사업 규칙 기본 템플릿 — 「2026년 청년 일경험 지원사업 시행지침」(2026.03) 프로젝트형 기준.
 * 신규 사업 생성 시 복사되며, 기관이 사업 설정에서 수정 가능 (단, 지침 위반 값은 권장하지 않음).
 */
export const DEFAULT_PROGRAM_SETTINGS = {
  // ── 지원금 (지침 1-5) ──
  teamBudget: 1_800_000, // 프로젝트 실행비: 팀당 90만원 × 2개월
  monthlyTeamBudget: 900_000, // 월 단위 실행비
  participantAllowance: 400_000, // 참여수당: 1인당 월 40만원 (개인계좌 지급)
  mentorAllowance: 150_000, // 멘토수당: 참여청년 1인당 월 15만원
  companyAllowance: 50_000, // 기업지원금: 참여청년 1인당 월 5만원

  // ── 팀·기간 (지침 1-1, 1-3) ──
  teamSize: 4, // 4인 내외
  maxTeamsPerProject: 5, // 프로젝트 1개당 최대 5팀
  durationWeeks: 8, // 8주 내외 (최소 6주)
  minDurationWeeks: 6,
  mentoringTotal: 8, // 멘토 활동 계획서 기준 회차
  companyCheckMin: 2, // 참여기업 담당자 중간점검 최소 2회 + 최종 피드백 1회
  sessionMax: 25,

  // ── 실행비 집행기준 (지침 1-5 집행기준 표) ──
  expRules: {
    "회의비(식대)": { perPerson: 15000, externalPerPerson: 30000, note: "내부 1인 15,000원, 외부인원 참여 시 30,000원. 주류 절대 금지, 22시 이후 결제 불가" },
    "회의비(다과)": { perPerson: 10000, note: "1인당 10,000원 이내. 주류 절대 금지" },
    "교통비(시내)": { perTeamPerDay: 20000, note: "시내버스·지하철·택시, 1팀 1일 20,000원 한도. 출장보고서 첨부" },
    "교통비(자차)": { perTeamPerDay: 50000, note: "자차 이용 시 1팀 1일 50,000원 한도. 유류비산출내역서 첨부, 계좌이체" },
    강사비: { perHour: 100000, maxHours: 3, note: "시간당 10만원, 1일 최대 3시간. 강사 명의 계좌이체(원천징수), 강의결과보고서 필수" },
  },

  // 비목 → 요구 증빙(서식) 매핑 — 서식 113 첨부 기준
  evidenceReq: {
    임차비: "inspection", // 시설·장비·SW 임차 (운영기관 소유는 불가)
    재료비: "inspection", // 수행계획서 집행계획 포함분에 한함
    도서비: "inspection",
    인쇄비: "inspection", // 원가계산 내역 첨부
    "회의비(식대)": "meeting",
    "회의비(다과)": "meeting",
    "교통비(시내)": "business_trip",
    "교통비(시외)": "business_trip",
    "교통비(자차)": "business_trip",
    강사비: "lecture_report",
    기타: "receipt",
  },

  // 지원 불가 항목 (집행기준 표 — 품의·지출 작성 화면에 안내)
  prohibited: [
    "팀장·팀원 인건비, 사무실 임대료·유지비",
    "장비 구매 (임차만 가능)",
    "주류, 프로젝트와 관련 없는 식음료, 유흥오락",
    "해외 출장비·교통비·숙박비",
    "장학금·선물·상금, 여행 목적 경비",
    "유흥·위생·레저·사행·성인용품 업종 사용 불가",
    "22시 이후 결제 건",
  ],

  // 진행 단계 (지침 1-3 추진체계)
  stages: [
    { name: "사전직무교육", week: 0, note: "15시간 이상 + 선수교육 2시간" },
    { name: "프로젝트 실행", week: 1 },
    { name: "중간점검", week: 4, note: "참여기업 담당자 점검" },
    { name: "결과보고", week: 8, note: "종료 후 10일 이내 결과보고서 제출" },
    { name: "성과공유회", week: 9 },
  ],

  autoApprove: { enabled: false, limit: 0 },
};

export const PROGRAM_TYPES = ["프로젝트형", "인턴형", "ESG지원형", "기타"];

/** 실행비 지출 비목 목록 (서식 112·113·검수확인서 구분 기준) */
export const EXP_CATEGORIES = Object.keys(DEFAULT_PROGRAM_SETTINGS.evidenceReq);
