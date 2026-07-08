-- 0007: 정부 지정 서식 대응 — 문서 타입 확장
-- plan(서식20 수행계획서), final_report(서식21 결과보고서), mentor_plan(서식114-1 멘토 활동 계획서)
-- 기존 mentoring = 서식114-2 멘토 활동 결과(회차별) 기록으로 사용

alter table documents drop constraint if exists documents_doc_type_check;
alter table documents add constraint documents_doc_type_check check (doc_type in
  ('request','meeting','mentoring','expense_report','inspection','business_trip','lecture_report',
   'plan','final_report','mentor_plan'));
