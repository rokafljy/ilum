import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { useSpentAmount } from "./RequestsPage.jsx";
import { listDocs, DOC_TYPES } from "../../lib/docs.js";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import { ReceiptSlot } from "../../components/FileUpload.jsx";
import { SubFormModal } from "./subForms.jsx";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea,
} from "../../components/ui/index.jsx";

/* 서식 113 「프로젝트 실행비 지출 결과서」
   번호 / 내용(품명) / 상세내역 / 금액 → 소계, 실행비 잔액, 특이사항
   ※ 첨부: 지출 증빙(검수확인서·회의록·출장보고서 등) — 비목별 자동 매핑 */

const blankItem = (category) => ({ category, name: "", desc: "", amount: 0, evidence: {} });

const EVIDENCE_LABEL = {
  meeting: "회의록",
  inspection: "검수확인서",
  business_trip: "출장보고서",
  lecture_report: "강의결과보고서",
  receipt: "영수증",
};

export default function ExpenseReportsPage() {
  const { team, settings } = useTeam();
  const docs = useTeamDocs("expense_report");
  const spent = useSpentAmount(team.id);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const budget = settings.teamBudget ?? 0;
  const categories = Object.keys(settings.evidenceReq ?? {});

  async function openNew() {
    setBusy(true);
    try {
      const created = await docs.create.mutateAsync({
        title: "실행비 지출 결과서",
        doc_date: todayStr(),
        body: { items: [blankItem(categories[0] ?? "기타")], remark: "" },
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
        title: `실행비 지출 결과서 (${fmtMoney(sumItems(next.body.items))}원)`,
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
        title="지출 결과서"
        description="서식 113 — 실제 집행 결과를 증빙과 함께 보고해요. 비목별 증빙 서식이 자동으로 연결돼요."
        onCreate={busy ? null : openNew}
      />

      <Card className="mt-4 p-4 flex items-center gap-4 text-sm">
        <div><span className="text-ink-400">실행비 총액</span> <b className="text-ink-900">{fmtMoney(budget)}원</b></div>
        <div><span className="text-ink-400">집행액(승인)</span> <b className="text-ink-900">{fmtMoney(spent)}원</b></div>
        <div><span className="text-ink-400">잔액</span> <b className="text-brand-700">{fmtMoney(budget - spent)}원</b></div>
      </Card>

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="💳"
            title="첫 지출 결과서를 작성해 보세요"
            description="임차·재료비는 검수확인서, 회의비는 회의록, 교통비는 출장보고서가 증빙으로 연결돼요."
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
          doc={editing} busy={busy} categories={categories} evidenceReq={settings.evidenceReq}
          budget={budget} spent={spent} team={team}
          onClose={() => setEditing(null)} onChange={setEditing} onSave={save}
          onDelete={async () => {
            if (!confirm("이 지출 결과서를 삭제할까요?")) return;
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

function ReportModal({ doc, busy, categories, evidenceReq, budget, spent, team, onClose, onChange, onSave, onDelete, onRecall }) {
  const editable = isEditable(doc);
  const items = doc.body?.items ?? [];
  const total = sumItems(items);
  const [subForm, setSubForm] = useState(null);
  const setBody = (patch) => onChange({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) => setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  const { data: meetings } = useQuery({
    queryKey: ["team-docs", team.id, "meeting"],
    queryFn: () => listDocs({ teamId: team.id, docType: "meeting" }),
  });

  function submit() {
    for (const it of items) {
      if (!it.name.trim()) return alert("내용(품명)을 입력해 주세요.");
      if ((Number(it.amount) || 0) <= 0) return alert("금액을 입력해 주세요.");
      const kind = evidenceReq?.[it.category] ?? "receipt";
      const ok = kind === "receipt" ? Boolean(it.evidence?.receiptUrl) : Boolean(it.evidence?.docId);
      if (!ok) return alert(`[${it.category}] 항목에 ${EVIDENCE_LABEL[kind]} 증빙이 필요해요.`);
    }
    onSave(doc, { submit: true });
  }

  return (
    <>
      <Modal
        open onClose={onClose}
        title="프로젝트 실행비 지출 결과서 (서식 113)"
        footer={
          editable ? (
            <DocActions doc={doc} busy={busy} onDelete={onDelete} onSubmit={submit} />
          ) : (
            <DocActions doc={doc} busy={busy} onRecall={onRecall} />
          )
        }
      >
        <div className="space-y-4">
          <Field label="보고일">
            <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
              onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
          </Field>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-700">지출 내역</span>
              {editable && (
                <Button variant="ghost" size="sm"
                  onClick={() => setBody({ items: [...items, blankItem(categories[0] ?? "기타")] })}>
                  + 항목 추가
                </Button>
              )}
            </div>
            <div className="mt-1.5 space-y-2">
              {items.map((it, i) => {
                const kind = evidenceReq?.[it.category] ?? "receipt";
                const linked = Boolean(it.evidence?.docId);
                const hasReceipt = Boolean(it.evidence?.receiptUrl);
                return (
                  <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-center text-[12px] text-ink-400 shrink-0">{i + 1}</span>
                      <Select className="!h-9 !w-32 text-sm" value={it.category} disabled={!editable}
                        onChange={(e) => setItem(i, { category: e.target.value, evidence: {} })}>
                        {categories.map((c) => <option key={c}>{c}</option>)}
                      </Select>
                      <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="내용(품명)"
                        value={it.name} disabled={!editable} onChange={(e) => setItem(i, { name: e.target.value })} />
                      {editable && items.length > 1 && (
                        <button className="text-ink-300 hover:text-red-500 px-1"
                          onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}>×</button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 pl-6">
                      <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="상세내역 (예: R6Mark2 SET 대여)"
                        value={it.desc} disabled={!editable} onChange={(e) => setItem(i, { desc: e.target.value })} />
                      <Input className="!h-9 !w-28 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                        value={it.amount} disabled={!editable} onChange={(e) => setItem(i, { amount: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-6">
                      <Badge tone={linked || hasReceipt ? "brand" : "warning"}>
                        {EVIDENCE_LABEL[kind]} {linked || hasReceipt ? "✓" : "필요"}
                      </Badge>
                      {kind === "receipt" && (
                        <ReceiptSlot value={it.evidence?.receiptUrl}
                          ctx={{ orgId: team.org_id, teamId: team.id }}
                          onChange={(url) => editable && setItem(i, { evidence: { ...it.evidence, receiptUrl: url } })} />
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
            <div className="mt-2 text-right text-sm space-y-0.5">
              <p className="font-bold text-ink-900">소계 {fmtMoney(total)}원</p>
              <p className="text-ink-500">보고 후 실행비 잔액 {fmtMoney(budget - spent - (doc.status === "approved" ? 0 : total))}원</p>
            </div>
          </div>

          <Field label="특이사항 (선택)">
            <Textarea className="min-h-14" value={doc.body?.remark ?? ""} disabled={!editable}
              onChange={(e) => setBody({ remark: e.target.value })} />
          </Field>

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
