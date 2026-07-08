import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocActions, isEditable } from "./docCommon.jsx";
import { DOC_STATUS } from "../../lib/docs.js";
import { fmtMoney, todayStr } from "../../lib/format.js";
import { PhotoList } from "../../components/FileUpload.jsx";
import {
  Badge, Button, Card, Field, Input, Modal, Select, Textarea,
} from "../../components/ui/index.jsx";

/* 프로젝트 문서 — 팀당 1개씩 작성하는 핵심 서식
   서식 20 「프로젝트형 일경험 수행계획서」: 개시 후 3일 이내 제출 (지침 1-3), 예산 활용 계획 포함
   서식 21 「프로젝트형 일경험 결과보고서」: 실행 종료 후 제출 → 운영기관이 10일 내 통합지원센터 보고 */

const JOB_FIELDS = ["경영·사무", "금융·회계", "영업·해외영업", "광고·마케팅", "IT", "연구·R&D", "생산·제조", "공공행정", "기타"];

const BLANK_PLAN = {
  companyName: "", companyContact: "", projectName: "", jobField: "IT",
  period: "", intro: "", background: "",
  roles: "", schedule: "", communication: "", mentorPlan: "",
  budget: [{ category: "임차비", item: "", detail: "", timing: "", amount: 0 }],
};

const BLANK_REPORT = {
  projectName: "", jobField: "IT",
  intro: "", background: "", features: "", mainFunctions: "", effects: "",
  composition: "", technologies: "", resultDesc: "", photos: [],
  roles: "", schedule: "", challenges: "",
  lessons: "", companyFeedback: "", mentorFeedback: "",
};

export default function ProjectDocsPage() {
  const { team, settings } = useTeam();
  const plans = useTeamDocs("plan");
  const reports = useTeamDocs("final_report");
  const plan = plans.data?.[0] ?? null;
  const report = reports.data?.[0] ?? null;

  const [editing, setEditing] = useState(null); // { kind: 'plan'|'report', doc }
  const [busy, setBusy] = useState(false);

  async function save(kind, doc, { submit = false } = {}) {
    const hook = kind === "plan" ? plans : reports;
    setBusy(true);
    try {
      const payload = {
        title: kind === "plan" ? "일경험 수행계획서" : "일경험 결과보고서",
        doc_date: doc.doc_date || todayStr(),
        body: doc.body,
        ...(submit ? { status: "submitted" } : doc.status === "rejected" ? { status: "draft" } : {}),
      };
      if (doc.id) await hook.update.mutateAsync({ id: doc.id, ...payload });
      else await hook.create.mutateAsync(payload);
      setEditing(null);
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">프로젝트 문서</h1>
        <p className="mt-0.5 text-[13px] text-ink-500">프로젝트당 1개씩 작성하는 정부 지정 필수 서식이에요.</p>
      </div>

      <DocCard
        formNo="서식 20" name="일경험 수행계획서" icon="🗺️"
        desc="프로젝트 개시 후 3일 이내 제출 — 예산 활용 계획이 승인되어야 실행비가 지급돼요."
        doc={plan}
        onOpen={() =>
          setEditing({
            kind: "plan",
            doc: plan ?? { id: null, status: "draft", doc_date: todayStr(), body: structuredClone(BLANK_PLAN) },
          })
        }
      />
      <DocCard
        formNo="서식 21" name="일경험 결과보고서" icon="🏁"
        desc="프로젝트 실행 종료 후 제출 — 수료 처리와 정부 보고의 근거가 되는 최종 문서예요."
        doc={report}
        onOpen={() =>
          setEditing({
            kind: "report",
            doc: report ?? { id: null, status: "draft", doc_date: todayStr(), body: structuredClone(BLANK_REPORT) },
          })
        }
      />

      {editing?.kind === "plan" && (
        <PlanModal
          doc={editing.doc} busy={busy} team={team} settings={settings}
          onClose={() => setEditing(null)}
          onChange={(doc) => setEditing({ kind: "plan", doc })}
          onSave={(opts) => save("plan", editing.doc, opts)}
          onRecall={async () => {
            await plans.update.mutateAsync({ id: editing.doc.id, status: "draft" });
            setEditing(null);
          }}
        />
      )}
      {editing?.kind === "report" && (
        <ReportModal
          doc={editing.doc} busy={busy} team={team}
          onClose={() => setEditing(null)}
          onChange={(doc) => setEditing({ kind: "report", doc })}
          onSave={(opts) => save("report", editing.doc, opts)}
          onRecall={async () => {
            await reports.update.mutateAsync({ id: editing.doc.id, status: "draft" });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DocCard({ formNo, name, icon, desc, doc, onOpen }) {
  const st = doc ? DOC_STATUS[doc.status] : null;
  return (
    <Card className="p-5 flex items-center gap-4 cursor-pointer hover:border-brand-300 transition-colors" onClick={onOpen}>
      <div className="text-3xl">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-ink-900">{name}</span>
          <Badge tone="neutral">{formNo}</Badge>
          {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge tone="warning">미작성</Badge>}
        </div>
        <p className="mt-0.5 text-[13px] text-ink-500">{desc}</p>
        {doc?.status === "rejected" && doc.reject_note && (
          <p className="mt-1 text-[13px] text-red-600">반려 사유: {doc.reject_note}</p>
        )}
      </div>
      <Button variant="secondary" size="sm">{doc ? "열기" : "작성"}</Button>
    </Card>
  );
}

/* ─── 서식 20 수행계획서 ─── */
function PlanModal({ doc, busy, team, settings, onClose, onChange, onSave, onRecall }) {
  const editable = isEditable(doc);
  const b = doc.body;
  const setBody = (patch) => onChange({ ...doc, body: { ...b, ...patch } });
  const budget = b.budget ?? [];
  const setBudget = (i, patch) => setBody({ budget: budget.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const total = budget.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cap = settings.teamBudget ?? 1_800_000;
  const categories = Object.keys(settings.evidenceReq ?? {});

  return (
    <Modal
      open onClose={onClose}
      title="일경험 수행계획서 (서식 20)"
      footer={
        editable ? (
          <DocActions doc={doc} busy={busy}
            onSubmit={() => {
              if (!b.projectName.trim()) return alert("프로젝트명을 입력해 주세요.");
              if (total !== cap && !confirm(`예산 총계(${fmtMoney(total)}원)가 실행비 총액(${fmtMoney(cap)}원)과 달라요. 그래도 제출할까요?`)) return;
              onSave({ submit: true });
            }} />
        ) : (
          <DocActions doc={doc} busy={busy} onRecall={onRecall} />
        )
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">1. 프로젝트 개요</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="제안기업명">
              <Input value={b.companyName} disabled={!editable} onChange={(e) => setBody({ companyName: e.target.value })} />
            </Field>
            <Field label="기업 담당자 연락처">
              <Input value={b.companyContact} disabled={!editable} onChange={(e) => setBody({ companyContact: e.target.value })} />
            </Field>
          </div>
          <Field label="프로젝트명">
            <Input value={b.projectName} disabled={!editable} onChange={(e) => setBody({ projectName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="직무 분야">
              <Select value={b.jobField} disabled={!editable} onChange={(e) => setBody({ jobField: e.target.value })}>
                {JOB_FIELDS.map((f) => <option key={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="실행기간" hint="예: 2026.04.22 ~ 2026.06.14 (8주)">
              <Input value={b.period} disabled={!editable} onChange={(e) => setBody({ period: e.target.value })} />
            </Field>
          </div>
          <Field label="프로젝트 소개 (제안 배경·내용)">
            <Textarea value={b.intro} disabled={!editable} onChange={(e) => setBody({ intro: e.target.value })} />
          </Field>
          <Field label="추진 배경 및 필요성">
            <Textarea className="min-h-16" value={b.background} disabled={!editable} onChange={(e) => setBody({ background: e.target.value })} />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">2. 수행 방법</h3>
          <Field label="추진 일정" hint="도입-계획-실행-마무리 단계별 내용">
            <Textarea className="min-h-16" value={b.schedule} disabled={!editable} onChange={(e) => setBody({ schedule: e.target.value })} />
          </Field>
          <Field label="역할 분담" hint="팀원별 담당 업무">
            <Textarea className="min-h-16" value={b.roles} disabled={!editable} onChange={(e) => setBody({ roles: e.target.value })} />
          </Field>
          <Field label="커뮤니케이션 계획" hint="예: 주 1회 온라인 미팅, 2주 1회 오프라인, Notion 공유">
            <Textarea className="min-h-14" value={b.communication} disabled={!editable} onChange={(e) => setBody({ communication: e.target.value })} />
          </Field>
          <Field label="멘토 선임 및 활용 계획">
            <Textarea className="min-h-14" value={b.mentorPlan} disabled={!editable} onChange={(e) => setBody({ mentorPlan: e.target.value })} />
          </Field>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-700">3. 프로젝트 예산 활용 계획</h3>
            {editable && (
              <Button variant="ghost" size="sm"
                onClick={() => setBody({ budget: [...budget, { category: categories[0] ?? "기타", item: "", detail: "", timing: "", amount: 0 }] })}>
                + 행 추가
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-400">
            예산 총액 {fmtMoney(cap)}원 ({fmtMoney(settings.monthlyTeamBudget ?? 900000)}원 × 2개월) — 총계가 일치해야 해요.
          </p>
          <div className="mt-1.5 space-y-2">
            {budget.map((r, i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Select className="!h-9 !w-32 text-sm" value={r.category} disabled={!editable}
                    onChange={(e) => setBudget(i, { category: e.target.value })}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                  <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="지출항목 (예: 회의실 대여)"
                    value={r.item} disabled={!editable} onChange={(e) => setBudget(i, { item: e.target.value })} />
                  {editable && budget.length > 1 && (
                    <button className="text-ink-300 hover:text-red-500 px-1"
                      onClick={() => setBody({ budget: budget.filter((_, idx) => idx !== i) })}>×</button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="세부내역 [단가×횟수]"
                    value={r.detail} disabled={!editable} onChange={(e) => setBudget(i, { detail: e.target.value })} />
                  <Input className="!h-9 !w-20 text-sm" placeholder="사용시기"
                    value={r.timing} disabled={!editable} onChange={(e) => setBudget(i, { timing: e.target.value })} />
                  <Input className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                    value={r.amount} disabled={!editable} onChange={(e) => setBudget(i, { amount: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-right text-sm font-bold ${total === cap ? "text-brand-700" : "text-red-600"}`}>
            총계 {fmtMoney(total)}원 / {fmtMoney(cap)}원
          </p>
        </section>

        {editable && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave({})}>
            임시저장
          </Button>
        )}
      </div>
    </Modal>
  );
}

/* ─── 서식 21 결과보고서 ─── */
function ReportModal({ doc, busy, team, onClose, onChange, onSave, onRecall }) {
  const editable = isEditable(doc);
  const b = doc.body;
  const setBody = (patch) => onChange({ ...doc, body: { ...b, ...patch } });
  const ctx = { orgId: team.org_id, teamId: team.id };

  const T = (label, key, hint) => (
    <Field label={label} hint={hint}>
      <Textarea className="min-h-16" value={b[key] ?? ""} disabled={!editable}
        onChange={(e) => setBody({ [key]: e.target.value })} />
    </Field>
  );

  return (
    <Modal
      open onClose={onClose}
      title="일경험 결과보고서 (서식 21)"
      footer={
        editable ? (
          <DocActions doc={doc} busy={busy}
            onSubmit={() => {
              if (!b.projectName.trim()) return alert("프로젝트명을 입력해 주세요.");
              if (!b.intro.trim()) return alert("프로젝트 소개를 입력해 주세요.");
              onSave({ submit: true });
            }} />
        ) : (
          <DocActions doc={doc} busy={busy} onRecall={onRecall} />
        )
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">I. 프로젝트 개요</h3>
          <Field label="프로젝트명" hint="프로그램 개설 시 프로젝트명과 동일">
            <Input value={b.projectName} disabled={!editable} onChange={(e) => setBody({ projectName: e.target.value })} />
          </Field>
          <Field label="수행 직무">
            <Select value={b.jobField} disabled={!editable} onChange={(e) => setBody({ jobField: e.target.value })}>
              {JOB_FIELDS.map((f) => <option key={f}>{f}</option>)}
            </Select>
          </Field>
          {T("프로젝트 소개", "intro", "프로젝트 의도, 주요 내용")}
          {T("수행 배경 및 필요성", "background")}
          {T("프로젝트 특징", "features", "독창성, 기존 대비 차별성")}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">II. 프로젝트 내용</h3>
          {T("프로젝트 구성", "composition", "전체 구성 설명")}
          {T("주요 기능", "mainFunctions", "결과물의 기능 상세")}
          {T("주요 기술", "technologies", "적용 기술·알고리즘·논리")}
          {T("프로젝트 결과물 설명", "resultDesc", "실물이 없는 경우 코딩·문서 일부 설명")}
          <Field label="결과물 이미지">
            <PhotoList value={b.photos} ctx={ctx} onChange={(photos) => setBody({ photos })} />
          </Field>
          {T("기대효과", "effects", "정량·정성 성과, 참여기업 활용 시 기대효과")}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">III. 프로젝트 수행</h3>
          {T("업무 분장", "roles", "멘토·팀장·팀원별 담당 업무")}
          {T("수행 일정", "schedule", "시작부터 종료까지 절차·일정")}
          {T("프로젝트 도전 및 해결", "challenges", "수행 중 발생한 문제와 해결 과정")}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-ink-700">IV. 배운 점과 피드백</h3>
          {T("배우거나 느낀 점", "lessons", "팀원 개인별로 상세히")}
          {T("참여기업 피드백", "companyFeedback")}
          {T("멘토 피드백", "mentorFeedback")}
        </section>

        <p className="text-[11px] text-ink-400">
          V. 첨부 — 실행비 지출 결과서(서식 113)와 증빙은 제출 시 자동으로 함께 관리돼요.
        </p>

        {editable && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave({})}>
            임시저장
          </Button>
        )}
      </div>
    </Modal>
  );
}
