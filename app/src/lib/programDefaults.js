/**
 * 사업 규칙 기본 템플릿 — 신규 사업 생성 시 복사되는 초기값.
 * (영메이커스 운영에서 검증된 건국대 규칙 기반. 기관이 사업 설정에서 수정 가능)
 */
export const DEFAULT_PROGRAM_SETTINGS = {
  teamBudget: 1_800_000, // 팀당 활동비 (원)
  mentoringTotal: 8, // 필수 멘토링 회차
  sessionMax: 25, // 활동 회차 수
  expRules: {
    "식대(내부)": { perPerson: 15000, maxPeople: 4, note: "팀원 식대" },
    "식대(외부)": { perPerson: 30000, note: "외부 인원 포함 식대" },
    다과비: { perPerson: 10000, note: "주류 구매 불가" },
    교통비: { perTeamPerDay: 20000, note: "1팀 1일 한도(시내)" },
    강사비: { perHour: 100000, maxHours: 3, note: "시간당, 1일 최대 3시간" },
  },
  // 지출 유형 → 요구 증빙(하위양식) 매핑
  evidenceReq: {
    "식대(내부)": "meeting",
    "식대(외부)": "meeting",
    다과비: "meeting",
    "교통비(시내)": "meeting",
    "교통비(시외)": "business_trip",
    임차비: "inspection",
    재료비: "inspection",
    도서비: "inspection",
    인쇄비: "inspection",
    강사비: "lecture_report",
    기타: "receipt",
  },
  // 진행 단계 (주차 기준)
  stages: [
    { name: "사전직무교육", week: 0 },
    { name: "프로젝트 실행", week: 1 },
    { name: "중간점검", week: 4 },
    { name: "결과보고", week: 8 },
    { name: "성과공유회", week: 9 },
  ],
  autoApprove: { enabled: false, limit: 0 },
};

export const PROGRAM_TYPES = ["프로젝트형", "인턴형", "기업탐방형", "기타"];
