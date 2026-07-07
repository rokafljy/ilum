import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import {
  Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea,
} from "../../components/ui/index.jsx";

const blankItem = () => ({ name: "", unit: "개", qty: 1, price: 0 });
const itemTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);

/** 품의서 — 회차별 집행 계획 작성 → 승인요청 */
export default function RequestsPage() {
  const { settings } = useTeam();
  const docs = useTeamDocs("request");
  const [editing, setEditing] = useState(null); // 문서 객체 or "new"
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    const nextSession = Math.max(0, ...(docs.data ?? []).map((d) => d.session || 0)) + 1;
    setEditing({
      id: null,
      status: "draft",
      session: Math.min(nextSession, settings.sessionMax ?? 25),
      doc_date: todayStr(),
      body: { items: [blankItem()], note: "" },
    });
  };

  async function save(next, { close = false, submit = false } = {}) {
    setBusy(true);
    try {
      const payload = {
        title: `${next.session}회차 품의서`,
        session: Number(next.session) || null,
        doc_date: next.doc_date || null,
        body: next.body,
        ...(submit ? { status: "submitted" } : next.status === "rejected" ? { status: "draft" } : {}),
      };
      if (next.id) await docs.update.mutateAsync({ id: next.id, ...payload });
      else {
        const created = await docs.create.mutateAsync(payload);
        next = { ...next, id: created.id };
      }
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
        title="품의서"
        description="집행 전에 계획을 올려 승인받는 문서예요."
        onCreate={openNew}
      />

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="📋"
            title="첫 품의서를 작성해 보세요"
            description="사용할 예산 계획(품목·수량·단가)을 적어 승인요청하면 돼요."
            action={<Button onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              amount={`${fmtMoney(sumItems(d.body?.items?.map((it) => ({ amount: itemTotal(it) }))))}원`}
              onClick={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      <RequestModal
        doc={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onChange={setEditing}
        onSave={save}
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
    </div>
  );
}

function RequestModal({ doc, busy, onClose, onChange, onSave, onDelete, onRecall }) {
  if (!doc) return null;
  const editable = isEditable(doc);
  const items = doc.body?.items ?? [];
  const total = items.reduce((s, it) => s + itemTotal(it), 0);
  const setBody = (patch) => onChange({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) =>
    setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <Modal
      open
      onClose={onClose}
      title={doc.id ? `${doc.session}회차 품의서` : "품의서 작성"}
      footer={
        editable ? (
          <DocActions
            doc={doc}
            busy={busy}
            onDelete={doc.id ? onDelete : null}
            onSubmit={() => {
              if (!items.length || items.some((it) => !it.name.trim())) return alert("품목명을 입력해 주세요.");
              onSave(doc, { submit: true });
            }}
          />
        ) : (
          <DocActions doc={doc} busy={busy} onRecall={onRecall} />
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="회차">
            <Input
              type="number" min={1} value={doc.session ?? ""}
              disabled={!editable}
              onChange={(e) => onChange({ ...doc, session: e.target.value })}
            />
          </Field>
          <Field label="사용 예정일">
            <Input
              type="date" value={doc.doc_date ?? ""}
              disabled={!editable}
              onChange={(e) => onChange({ ...doc, doc_date: e.target.value })}
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">품목</span>
            {editable && (
              <Button variant="ghost" size="sm" onClick={() => setBody({ items: [...items, blankItem()] })}>
                + 품목 추가
              </Button>
            )}
          </div>
          <div className="mt-1.5 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  className="!h-9 flex-1 min-w-0 text-sm" placeholder="품명 (예: 도서)"
                  value={it.name} disabled={!editable}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                />
                <Input
                  className="!h-9 !w-14 text-sm text-center" placeholder="단위"
                  value={it.unit} disabled={!editable}
                  onChange={(e) => setItem(i, { unit: e.target.value })}
                />
                <Input
                  className="!h-9 !w-16 text-sm text-right" type="number" min={0} placeholder="수량"
                  value={it.qty} disabled={!editable}
                  onChange={(e) => setItem(i, { qty: e.target.value })}
                />
                <Input
                  className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} placeholder="단가"
                  value={it.price} disabled={!editable}
                  onChange={(e) => setItem(i, { price: e.target.value })}
                />
                {editable && items.length > 1 && (
                  <button
                    className="text-ink-300 hover:text-red-500 px-1"
                    onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-bold text-ink-900">합계 {fmtMoney(total)}원</p>
        </div>

        <Field label="비고 (선택)">
          <Textarea
            className="min-h-16" value={doc.body?.note ?? ""} disabled={!editable}
            onChange={(e) => setBody({ note: e.target.value })}
          />
        </Field>

        {editable && doc.id == null && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave(doc, { close: true })}>
            임시저장 (작성중으로 보관)
          </Button>
        )}
      </div>
    </Modal>
  );
}
