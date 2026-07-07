import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTeam } from "./TeamSpace.jsx";
import { DOC_STATUS, listDocs, createDoc, updateDoc, deleteDoc } from "../../lib/docs.js";
import { fmtDate } from "../../lib/format.js";
import { Badge, Button, Card } from "../../components/ui/index.jsx";

/** 팀 문서 목록 쿼리 + 변이 훅 */
export function useTeamDocs(docType) {
  const { team } = useTeam();
  const qc = useQueryClient();
  const key = ["team-docs", team.id, docType];

  const query = useQuery({ queryKey: key, queryFn: () => listDocs({ teamId: team.id, docType }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["team-home-docs", team.id] });
  };

  const create = useMutation({
    mutationFn: (payload) =>
      createDoc({
        org_id: team.org_id,
        program_id: team.program_id,
        team_id: team.id,
        doc_type: docType,
        ...payload,
      }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, ...patch }) => updateDoc(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id) => deleteDoc(id), onSuccess: invalidate });

  return { ...query, create, update, remove, invalidate };
}

/** 문서 카드 한 줄 — 클릭 시 열기 */
export function DocRow({ doc, subtitle, amount, onClick }) {
  const st = DOC_STATUS[doc.status] ?? { label: doc.status, tone: "neutral" };
  return (
    <Card
      className="p-4 flex items-center gap-3 cursor-pointer hover:border-brand-300 transition-colors"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[15px] text-ink-900 truncate">{doc.title || "(제목 없음)"}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-500">
          {doc.session ? `${doc.session}회차 · ` : ""}
          {fmtDate(doc.doc_date)}
          {subtitle ? ` · ${subtitle}` : ""}
        </p>
        {doc.status === "rejected" && doc.reject_note && (
          <p className="mt-1 text-[13px] text-red-600">반려 사유: {doc.reject_note}</p>
        )}
      </div>
      {amount != null && <div className="font-bold text-ink-900 whitespace-nowrap">{amount}</div>}
    </Card>
  );
}

/** 페이지 머리글 + 작성 버튼 */
export function DocPageHeader({ title, description, onCreate, createLabel = "+ 작성" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold text-ink-900">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      {onCreate && <Button onClick={onCreate}>{createLabel}</Button>}
    </div>
  );
}

/** 편집 가능 여부 — 작성중/반려 상태만 수정 */
export const isEditable = (doc) => ["draft", "rejected"].includes(doc.status);

/** 제출/회수/삭제 푸터 버튼 묶음 */
export function DocActions({ doc, busy, onSubmit, onRecall, onDelete, submitLabel = "📨 승인요청" }) {
  return (
    <div className="flex items-center gap-2">
      {isEditable(doc) && onDelete && (
        <Button variant="ghost" size="sm" className="text-red-600" disabled={busy} onClick={onDelete}>
          삭제
        </Button>
      )}
      <div className="flex-1" />
      {doc.status === "submitted" && onRecall && (
        <Button variant="secondary" disabled={busy} onClick={onRecall}>
          제출 회수
        </Button>
      )}
      {isEditable(doc) && onSubmit && (
        <Button disabled={busy} onClick={onSubmit}>
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
