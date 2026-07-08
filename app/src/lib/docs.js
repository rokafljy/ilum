import { supabase } from "./supabase.js";

/** 문서 타입 라벨 — 정부 지정 서식명 기준 */
export const DOC_TYPES = {
  plan: "일경험 수행계획서",
  request: "프로젝트 실행비 지출 품의서",
  meeting: "프로젝트 회의록",
  mentoring: "멘토 활동 결과",
  mentor_plan: "멘토 활동 계획서",
  expense_report: "프로젝트 실행비 지출 결과서",
  inspection: "검수확인서",
  business_trip: "프로젝트 출장보고서",
  lecture_report: "강의결과보고서",
  final_report: "일경험 결과보고서",
};

/** 서식 번호 (2026 청년 일경험 지원사업 주요 서식) */
export const FORM_NO = {
  plan: "서식 20",
  request: "서식 112",
  meeting: "서식 115",
  mentor_plan: "서식 114-1",
  mentoring: "서식 114-2",
  expense_report: "서식 113",
  inspection: "서식 113 첨부1",
  business_trip: "서식 116",
  lecture_report: "",
  final_report: "서식 21",
};

/** 상태 뱃지 정보 */
export const DOC_STATUS = {
  draft: { label: "작성중", tone: "neutral" },
  submitted: { label: "승인대기", tone: "warning" },
  approved: { label: "승인완료", tone: "brand" },
  rejected: { label: "반려", tone: "danger" },
  confirmed: { label: "확인완료", tone: "brand" },
};

/** 문서 타입별 승인 결정 값 (회의록은 '확인', 그 외는 '승인') */
export const DECISION_FOR = (docType) => (docType === "meeting" ? "confirmed" : "approved");

export async function listDocs({ teamId, programId, docType, statuses }) {
  let q = supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (teamId) q = q.eq("team_id", teamId);
  if (programId) q = q.eq("program_id", programId);
  if (docType) q = q.eq("doc_type", docType);
  if (statuses) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createDoc(doc) {
  const { data, error } = await supabase.from("documents").insert(doc).select().single();
  if (error) throw error;
  return data;
}

export async function updateDoc(id, patch) {
  const { data, error } = await supabase.from("documents").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDoc(id) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function decideDoc(id, decision, note) {
  const { data, error } = await supabase.rpc("decide_document", {
    p_doc: id,
    p_decision: decision,
    p_note: note ?? null,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "decide failed");
}
