import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import { PhotoList, ReceiptSlot } from "../../components/FileUpload.jsx";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea,
} from "../../components/ui/index.jsx";

/* 서식 115 「프로젝트 회의록」
   회의주제 / 회의일시 / 회의장소 / 참여자 명단(서명) / 회의 내용 / 집행금액(항목·금액·대상자·비고) / 회의 사진
   ※ 식비 1인 15,000원(외부인원 참여 시 30,000원), 다과비 1인 10,000원, 주류 절대 금지, 22시 이후 결제 불가 */

const EXP_ITEMS = ["회의비(식비)", "회의비(다과)", "시내교통비", "기타"];
const blankExp = () => ({ item: EXP_ITEMS[0], amount: 0, people: "", note: "", external: false, receiptUrl: null });

const countPeople = (s) => (s ?? "").split(",").map((v) => v.trim()).filter(Boolean).length;

/** 서식115·지침 집행기준 검증 */
function validateExp(exp) {
  const amount = Number(exp.amount) || 0;
  const n = Math.max(1, countPeople(exp.people));
  if (exp.item === "회의비(식비)") {
    const per = exp.external ? 30000 : 15000;
    if (amount > per * n) return `식비는 1인 ${fmtMoney(per)}원 이내예요 (${n}명 기준 ${fmtMoney(per * n)}원).`;
  }
  if (exp.item === "회의비(다과)" && amount > 10000 * n) {
    return `다과비는 1인 10,000원 이내예요 (${n}명 기준 ${fmtMoney(10000 * n)}원).`;
  }
  if (exp.item === "시내교통비" && amount > 20000) {
    return "시내교통비는 1팀 1일 20,000원 한도예요.";
  }
  return null;
}

export default function MeetingsPage() {
  const { team } = useTeam();
  const docs = useTeamDocs("meeting");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const ctx = { orgId: team.org_id, teamId: team.id };

  const openNew = () =>
    setEditing({
      id: null,
      status: "draft",
      doc_date: todayStr(),
      body: {
        topic: "", location: "", startTime: "", endTime: "",
        attendees: "", content: "", isMentoring: false,
        expenses: [], photos: [],
      },
    });

  async function save(next, { submit = false, close = false } = {}) {
    setBusy(true);
    try {
      const payload = {
        title: next.body.topic ? `회의록 — ${next.body.topic}` : "프로젝트 회의록",
        doc_date: next.doc_date || null,
        body: next.body,
        ...(submit ? { status: "submitted" } : next.status === "rejected" ? { status: "draft" } : {}),
      };
      if (next.id) await docs.update.mutateAsync({ id: next.id, ...payload });
      else next = { ...next, id: (await docs.create.mutateAsync(payload)).id };
      if (submit || close) setEditing(null);
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
        title="프로젝트 회의록"
        description="서식 115 — 회의 내용과 회의비 집행을 기록해요. 식비·다과 집행 시 영수증 필수."
        onCreate={openNew}
      />

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="📝"
            title="첫 회의록을 작성해 보세요"
            description="회의비(식비·다과)를 집행했다면 회의록이 곧 증빙 서류가 돼요."
            action={<Button onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              subtitle={d.body?.isMentoring ? "멘토 참여" : null}
              amount={d.body?.expenses?.length ? `${fmtMoney(sumItems(d.body.expenses))}원` : null}
              onClick={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      {editing && (
        <MeetingModal
          doc={editing} busy={busy} ctx={ctx}
          onClose={() => setEditing(null)} onChange={setEditing} onSave={save}
          onDelete={async () => {
            if (!confirm("이 회의록을 삭제할까요?")) return;
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

function MeetingModal({ doc, busy, ctx, onClose, onChange, onSave, onDelete, onRecall }) {
  const editable = isEditable(doc);
  const b = doc.body;
  const setBody = (patch) => onChange({ ...doc, body: { ...b, ...patch } });
  const setExp = (i, patch) =>
    setBody({ expenses: b.expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });

  function submit() {
    if (!b.topic.trim()) return alert("회의 주제를 입력해 주세요.");
    if (!b.attendees.trim()) return alert("참여자 명단을 입력해 주세요.");
    for (const e of b.expenses) {
      if ((Number(e.amount) || 0) > 0 && !e.receiptUrl) return alert("집행 항목에는 영수증 첨부가 필요해요.");
      const warn = validateExp(e);
      if (warn && !confirm(`[${e.item}] ${warn}\n한도 초과 시 반려·환수될 수 있어요. 그래도 제출할까요?`)) return;
    }
    onSave(doc, { submit: true });
  }

  return (
    <Modal
      open onClose={onClose}
      title="프로젝트 회의록 (서식 115)"
      footer={
        editable ? (
          <DocActions doc={doc} busy={busy} onDelete={doc.id ? onDelete : null} onSubmit={submit} submitLabel="📨 확인요청" />
        ) : (
          <DocActions doc={doc} busy={busy} onRecall={onRecall} />
        )
      }
    >
      <div className="space-y-4">
        <Field label="회의 주제">
          <Input value={b.topic} disabled={!editable} onChange={(e) => setBody({ topic: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="회의일">
            <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
              onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
          </Field>
          <Field label="시작">
            <Input type="time" value={b.startTime} disabled={!editable} onChange={(e) => setBody({ startTime: e.target.value })} />
          </Field>
          <Field label="종료">
            <Input type="time" value={b.endTime} disabled={!editable} onChange={(e) => setBody({ endTime: e.target.value })} />
          </Field>
        </div>
        <Field label="회의 장소">
          <Input value={b.location} disabled={!editable} onChange={(e) => setBody({ location: e.target.value })} />
        </Field>
        <Field label="참여자 명단" hint="쉼표로 구분 — PDF에서 서명란으로 출력돼요">
          <Input value={b.attendees} disabled={!editable} placeholder="예: 김새싹, 박일움, 이멘토(멘토)"
            onChange={(e) => setBody({ attendees: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="size-4 accent-brand-600" checked={b.isMentoring} disabled={!editable}
            onChange={(e) => setBody({ isMentoring: e.target.checked })} />
          멘토가 참여한 회의예요
        </label>
        <Field label="회의 내용">
          <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
        </Field>

        {/* 집행금액 — 서식 115 표 구조 */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">집행금액</span>
            {editable && (
              <Button variant="ghost" size="sm" onClick={() => setBody({ expenses: [...b.expenses, blankExp()] })}>
                + 항목 추가
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-400 leading-relaxed">
            식비 1인 15,000원(외부인원 참여 시 30,000원) · 다과비 1인 10,000원 · 주류 절대 금지 · 22시 이후 결제 불가
          </p>
          <div className="mt-1.5 space-y-2">
            {b.expenses.map((e, i) => {
              const warn = validateExp(e);
              return (
                <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Select className="!h-9 !w-32 text-sm" value={e.item} disabled={!editable}
                      onChange={(ev) => setExp(i, { item: ev.target.value })}>
                      {EXP_ITEMS.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                    <Input className="!h-9 flex-1 min-w-0 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                      value={e.amount} disabled={!editable} onChange={(ev) => setExp(i, { amount: ev.target.value })} />
                    {e.item === "회의비(식비)" && (
                      <label className="flex items-center gap-1 text-[11px] text-ink-500 whitespace-nowrap">
                        <input type="checkbox" className="accent-brand-600" checked={e.external} disabled={!editable}
                          onChange={(ev) => setExp(i, { external: ev.target.checked })} />
                        외부인원
                      </label>
                    )}
                    {editable && (
                      <button className="text-ink-300 hover:text-red-500 px-1"
                        onClick={() => setBody({ expenses: b.expenses.filter((_, idx) => idx !== i) })}>×</button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="대상자 (쉼표 구분)"
                      value={e.people} disabled={!editable} onChange={(ev) => setExp(i, { people: ev.target.value })} />
                    <Input className="!h-9 !w-24 text-sm" placeholder="비고"
                      value={e.note} disabled={!editable} onChange={(ev) => setExp(i, { note: ev.target.value })} />
                    <ReceiptSlot value={e.receiptUrl} ctx={ctx} onChange={(url) => editable && setExp(i, { receiptUrl: url })} />
                  </div>
                  {warn && <Badge tone="warning">⚠ {warn}</Badge>}
                </div>
              );
            })}
          </div>
          {b.expenses.length > 0 && (
            <p className="mt-2 text-right text-sm font-bold text-ink-900">총계 {fmtMoney(sumItems(b.expenses))}원</p>
          )}
        </div>

        <Field label="회의 사진" hint="회의 장면만 허용 — 식당 사진 불가">
          <PhotoList value={b.photos} ctx={ctx} onChange={(photos) => setBody({ photos })} />
        </Field>

        {editable && (
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onSave(doc, { close: true })}>
            임시저장
          </Button>
        )}
      </div>
    </Modal>
  );
}
