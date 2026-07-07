import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { listDocs, DOC_TYPES } from "../../lib/docs.js";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import { ReceiptSlot } from "../../components/FileUpload.jsx";
import { SubFormModal } from "./subForms.jsx";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner,
} from "../../components/ui/index.jsx";

const blankItem = () => ({ type: "", desc: "", amount: 0, evidence: {} });

/** 항목 유형 → 요구 증빙 종류 */
const evidenceKind = (type, evidenceReq) => evidenceReq?.[type] ?? "receipt";

const EVIDENCE_LABEL = {
  meeting: "회의록 연결",
  inspection: "검수확인서",
  business_trip: "출장보고서",
  lecture_report: "강의결과보고서",
  receipt: "영수증",
};

/** 지출결과서 — 회차별 실집행 보고 + 증빙(하위양식) 연결 */
export default function ExpenseReportsPage() {
  const { team, settings } = useTeam();
  const docs = useTeamDocs("expense_report");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const expTypes = Object.keys(settings.evidenceReq ?? {});

  async function openNew() {
    // 하위양식 연결에 문서 id가 필요해서 생성 즉시 draft 저장
    setBusy(true);
    try {
      const session = Math.max(0, ...(docs.data ?? []).map((d) => d.session || 0)) + 1;
      const created = await docs.create.mutateAsync({
        title: `${session}회차 지출결과서`,
        session,
        doc_date: todayStr(),
        body: { items: [{ ...blankItem(), type: expTypes[0] ?? "기타" }] },
      });
      setEditing(created);
    } finally {
      setBusy(false);
    }
  }

  async function save(next, { submit = false, close = false } = {}) {
    setBusy(true);
    try {
      await docs.update.mutateAsync({
        id: next.id,
        title: `${next.session}회차 지출결과서`,
        session: Number(next.session) || null,
        doc_date: next.doc_date || null,
        body: next.body,
        ...(submit ? { status: "submitted" } : next.status === "rejected" ? { status: "draft" } : {}),
      });
      if (submit || close) setEditing(null);
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <DocPageHeader
        title="지출결과서"
        description="실제 집행 내역을 증빙과 함께 보고하는 문서예요."
        onCreate={busy ? null : openNew}
      />

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="💳"
            title="첫 지출결과서를 작성해 보세요"
            description="항목 유형에 따라 회의록·검수확인서 등 증빙이 자동으로 연결돼요."
            action={<Button disabled={busy} onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow key={d.id} doc={d} amount={`${fmtMoney(sumItems(d.body?.items))}원`} onClick={() => setEditing(d)} />
          ))}
        </div>
      )}

      {editing && (
        <ReportModal
          doc={editing} busy={busy} expTypes={expTypes} evidenceReq={settings.evidenceReq}
          team={team}
          onClose={() => setEditing(null)} onChange={setEditing} onSave={save}
          onDelete={async () => {
            if (!confirm("이 지출결과서를 삭제할까요? 연결된 하위양식도 함께 정리해야 해요.")) return;
            await docs.remove.mutateAsync(editing.id);
            setEditing(null);
          }}
          onRecall={async () => {
            await docs.update.mutateAsync({ id: editing.id, status: "draft" });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ReportModal({ doc, busy, expTypes, evidenceReq, team, onClose, onChange, onSave, onDelete, onRecall }) {
  const editable = isEditable(doc);
  const items = doc.body?.items ?? [];
  const [subForm, setSubForm] = useState(null); // { kind, itemIndex, docId }
  const setBody = (patch) => onChange({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) => setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  // 회의록 연결용 목록
  const { data: meetings } = useQuery({
    queryKey: ["team-docs", team.id, "meeting"],
    queryFn: () => listDocs({ teamId: team.id, docType: "meeting" }),
  });

  function submit() {
    for (const it of items) {
      if (!it.type) return alert("항목 유형을 선택해 주세요.");
      if ((Number(it.amount) || 0) <= 0) return alert("금액을 입력해 주세요.");
      const kind = evidenceKind(it.type, evidenceReq);
      const ok = kind === "receipt" ? Boolean(it.evidence?.receiptUrl) : Boolean(it.evidence?.docId);
      if (!ok) return alert(`[${it.type}] 항목에 ${EVIDENCE_LABEL[kind]} 증빙이 필요해요.`);
    }
    onSave(doc, { submit: true });
  }

  return (
    <>
      <Modal
        open onClose={onClose}
        title={`${doc.session}회차 지출결과서`}
        footer={
          editable ? (
            <DocActions doc={doc} busy={busy} onDelete={onDelete} onSubmit={submit} />
          ) : (
            <DocActions doc={doc} busy={busy} onRecall={onRecall} />
          )
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="회차">
              <Input type="number" min={1} value={doc.session ?? ""} disabled={!editable}
                onChange={(e) => onChange({ ...doc, session: e.target.value })} />
            </Field>
            <Field label="보고일">
              <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
                onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-700">지출 항목</span>
              {editable && (
                <Button variant="ghost" size="sm"
                  onClick={() => setBody({ items: [...items, { ...blankItem(), type: expTypes[0] ?? "기타" }] })}>
                  + 항목 추가
                </Button>
              )}
            </div>
            <div className="mt-1.5 space-y-2">
              {items.map((it, i) => {
                const kind = evidenceKind(it.type, evidenceReq);
                const linked = it.evidence?.docId;
                return (
                  <div key={i} className="rounded-xl border border-ink-200 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Select className="!h-9 flex-1 text-sm" value={it.type} disabled={!editable}
                        onChange={(e) => setItem(i, { type: e.target.value, evidence: {} })}>
                        {expTypes.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                      <Input className="!h-9 !w-28 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                        value={it.amount} disabled={!editable} onChange={(e) => setItem(i, { amount: e.target.value })} />
                      {editable && items.length > 1 && (
                        <button className="text-ink-300 hover:text-red-500 px-1"
                          onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}>
                          ×
                        </button>
                      )}
                    </div>
                    <Input className="!h-9 text-sm" placeholder="내역 (예: 시제품 재료 구입)"
                      value={it.desc} disabled={!editable} onChange={(e) => setItem(i, { desc: e.target.value })} />

                    {/* 증빙 셀 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={linked || it.evidence?.receiptUrl ? "brand" : "warning"}>
                        {EVIDENCE_LABEL[kind]} {linked || it.evidence?.receiptUrl ? "✓" : "필요"}
                      </Badge>
                      {kind === "receipt" && (
                        <ReceiptSlot
                          value={it.evidence?.receiptUrl}
                          ctx={{ orgId: team.org_id, teamId: team.id }}
                          onChange={(url) => editable && setItem(i, { evidence: { ...it.evidence, receiptUrl: url } })}
                        />
                      )}
                      {kind === "meeting" && (
                        <Select className="!h-9 !w-auto flex-1 text-sm" value={it.evidence?.docId ?? ""} disabled={!editable}
                          onChange={(e) => setItem(i, { evidence: { kind, docId: e.target.value || null } })}>
                          <option value="">회의록 선택…</option>
                          {(meetings ?? []).map((m) => (
                            <option key={m.id} value={m.id}>{m.title} ({m.doc_date ?? "-"})</option>
                          ))}
                        </Select>
                      )}
                      {["inspection", "business_trip", "lecture_report"].includes(kind) && (
                        <Button variant="secondary" size="sm"
                          onClick={() => setSubForm({ kind, itemIndex: i, docId: it.evidence?.docId ?? null })}>
                          {linked ? `${DOC_TYPES[kind]} 열기` : `${DOC_TYPES[kind]} 작성`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-right text-sm font-bold text-ink-900">합계 {fmtMoney(sumItems(items))}원</p>
          </div>

          {editable && (
            <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave(doc, { close: true })}>
              임시저장
            </Button>
          )}
        </div>
      </Modal>

      {subForm && (
        <SubFormModal
          kind={subForm.kind}
          docId={subForm.docId}
          parent={doc}
          editable={editable}
          onClose={() => setSubForm(null)}
          onLinked={(childId) => {
            setItem(subForm.itemIndex, { evidence: { kind: subForm.kind, docId: childId } });
            setSubForm(null);
          }}
        />
      )}
    </>
  );
}
