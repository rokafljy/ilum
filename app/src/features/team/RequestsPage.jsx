import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { listDocs } from "../../lib/docs.js";
import { useQuery } from "@tanstack/react-query";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import {
  Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea,
} from "../../components/ui/index.jsx";

/* 서식 112 「프로젝트 실행비 지출 품의서」
   표: No. / 내용(품명) / 상세(규격) / 단위 / 수량 / 단가 / 금액 → 소계, 실행비 잔액 */
const blankItem = () => ({ name: "", spec: "", unit: "개", qty: 1, price: 0 });
const itemTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);
const reqTotal = (doc) => (doc.body?.items ?? []).reduce((s, it) => s + itemTotal(it), 0);

/** 팀 실행비 사용액(승인된 지출결과서 합) */
export function useSpentAmount(teamId) {
  const { data } = useQuery({
    queryKey: ["team-spent", teamId],
    queryFn: async () => {
      const docs = await listDocs({ teamId, docType: "expense_report", statuses: ["approved"] });
      return docs.reduce((s, d) => s + sumItems(d.body?.items), 0);
    },
  });
  return data ?? 0;
}

export default function RequestsPage() {
  const { team, settings } = useTeam();
  const docs = useTeamDocs("request");
  const spent = useSpentAmount(team.id);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const budget = settings.teamBudget ?? 0;

  const openNew = () =>
    setEditing({
      id: null,
      status: "draft",
      doc_date: todayStr(),
      body: { items: [blankItem()], note: "" },
    });

  async function save(next, { close = false, submit = false } = {}) {
    setBusy(true);
    try {
      const payload = {
        title: `실행비 지출 품의서 (${fmtMoney(reqTotal(next))}원)`,
        doc_date: next.doc_date || null,
        body: next.body,
        ...(submit ? { status: "submitted" } : next.status === "rejected" ? { status: "draft" } : {}),
      };
      if (next.id) await docs.update.mutateAsync({ id: next.id, ...payload });
      else next = { ...next, id: (await docs.create.mutateAsync(payload)).id };
      if (close || submit) setEditing(null);
      else setEditing(next);
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <DocPageHeader
        title="지출 품의서"
        description="서식 112 — 실행비를 쓰기 전에 품의를 올려 운영기관 승인을 받아요."
        onCreate={openNew}
      />

      <Card className="mt-4 p-4 flex items-center gap-4 text-sm">
        <div>
          <span className="text-ink-400">실행비 총액</span>{" "}
          <b className="text-ink-900">{fmtMoney(budget)}원</b>
        </div>
        <div>
          <span className="text-ink-400">집행액(승인)</span>{" "}
          <b className="text-ink-900">{fmtMoney(spent)}원</b>
        </div>
        <div>
          <span className="text-ink-400">잔액</span>{" "}
          <b className="text-brand-700">{fmtMoney(budget - spent)}원</b>
        </div>
      </Card>

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="📋"
            title="첫 품의서를 작성해 보세요"
            description="임차비·재료비·강사비 등을 집행하려면 지출 전에 품의서 승인이 필요해요 (시행지침 1-5)."
            action={<Button onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow key={d.id} doc={d} amount={`${fmtMoney(reqTotal(d))}원`} onClick={() => setEditing(d)} />
          ))}
        </div>
      )}

      {editing && (
        <RequestModal
          doc={editing} busy={busy} budget={budget} spent={spent}
          prohibited={settings.prohibited}
          onClose={() => setEditing(null)} onChange={setEditing} onSave={save}
          onDelete={async () => {
            if (!confirm("이 품의서를 삭제할까요?")) return;
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

function RequestModal({ doc, busy, budget, spent, prohibited, onClose, onChange, onSave, onDelete, onRecall }) {
  const editable = isEditable(doc);
  const items = doc.body?.items ?? [];
  const total = reqTotal(doc);
  const remain = budget - spent - total;
  const setBody = (patch) => onChange({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) =>
    setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <Modal
      open onClose={onClose}
      title="프로젝트 실행비 지출 품의서 (서식 112)"
      footer={
        editable ? (
          <DocActions
            doc={doc} busy={busy}
            onDelete={doc.id ? onDelete : null}
            onSubmit={() => {
              if (!items.length || items.some((it) => !it.name.trim())) return alert("내용(품명)을 입력해 주세요.");
              if (total <= 0) return alert("금액을 입력해 주세요.");
              if (remain < 0 && !confirm(`실행비 잔액을 ${fmtMoney(-remain)}원 초과합니다. 그래도 제출할까요?`)) return;
              onSave(doc, { submit: true });
            }}
          />
        ) : (
          <DocActions doc={doc} busy={busy} onRecall={onRecall} />
        )
      }
    >
      <div className="space-y-4">
        <Field label="사용 예정일">
          <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
            onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
        </Field>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">품의 내역</span>
            {editable && (
              <Button variant="ghost" size="sm" onClick={() => setBody({ items: [...items, blankItem()] })}>
                + 품목 추가
              </Button>
            )}
          </div>
          <div className="mt-1.5 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 text-center text-[12px] text-ink-400 shrink-0">{i + 1}</span>
                  <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="내용(품명) 예: 카메라(대여)"
                    value={it.name} disabled={!editable} onChange={(e) => setItem(i, { name: e.target.value })} />
                  {editable && items.length > 1 && (
                    <button className="text-ink-300 hover:text-red-500 px-1"
                      onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}>×</button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pl-6">
                  <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="상세(규격)"
                    value={it.spec} disabled={!editable} onChange={(e) => setItem(i, { spec: e.target.value })} />
                  <Input className="!h-9 !w-14 text-sm text-center" placeholder="단위"
                    value={it.unit} disabled={!editable} onChange={(e) => setItem(i, { unit: e.target.value })} />
                  <Input className="!h-9 !w-14 text-sm text-right" type="number" min={0} placeholder="수량"
                    value={it.qty} disabled={!editable} onChange={(e) => setItem(i, { qty: e.target.value })} />
                  <Input className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} placeholder="단가"
                    value={it.price} disabled={!editable} onChange={(e) => setItem(i, { price: e.target.value })} />
                </div>
                <p className="pl-6 text-right text-[12px] text-ink-500">금액 {fmtMoney(itemTotal(it))}원</p>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right text-sm space-y-0.5">
            <p className="font-bold text-ink-900">소계 {fmtMoney(total)}원</p>
            <p className={remain < 0 ? "text-red-600 font-bold" : "text-ink-500"}>
              품의 후 실행비 잔액 {fmtMoney(remain)}원
            </p>
          </div>
        </div>

        <Field label="비고 (선택)" hint="품의 내용 변경·취소 일자 또는 항목별 특이사항">
          <Textarea className="min-h-14" value={doc.body?.note ?? ""} disabled={!editable}
            onChange={(e) => setBody({ note: e.target.value })} />
        </Field>

        {editable && prohibited?.length > 0 && (
          <details className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">
            <summary className="cursor-pointer font-semibold">⚠ 실행비 지원 불가 항목 (시행지침)</summary>
            <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
              {prohibited.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </details>
        )}

        {editable && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave(doc, { close: true })}>
            임시저장
          </Button>
        )}
      </div>
    </Modal>
  );
}
