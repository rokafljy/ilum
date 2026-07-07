import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, DocActions, isEditable } from "./docCommon.jsx";
import { fmtMoney, sumItems, todayStr } from "../../lib/format.js";
import { PhotoList, ReceiptSlot } from "../../components/FileUpload.jsx";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea,
} from "../../components/ui/index.jsx";

const EXP_TYPES = ["식대(내부)", "식대(외부)", "다과비", "교통비(시내)", "임차비", "기타"];
const blankExp = () => ({ type: EXP_TYPES[0], amount: 0, people: 1, desc: "", receiptUrl: null });

/** 집행항목 한도 검증 — 사업 설정(expRules) 기반 */
function validateExp(exp, rules) {
  const r = rules?.[exp.type];
  if (!r) return null;
  const amount = Number(exp.amount) || 0;
  const people = Number(exp.people) || 1;
  if (r.perPerson && amount > r.perPerson * Math.min(people, r.maxPeople ?? people)) {
    return `1인당 ${fmtMoney(r.perPerson)}원${r.maxPeople ? ` (최대 ${r.maxPeople}인)` : ""} 한도를 초과했어요.`;
  }
  if (r.perTeamPerDay && amount > r.perTeamPerDay) {
    return `1일 ${fmtMoney(r.perTeamPerDay)}원 한도를 초과했어요.`;
  }
  return null;
}

/** 회의록 — 회의 개요 + 집행항목(영수증) + 사진 */
export default function MeetingsPage() {
  const { team, settings } = useTeam();
  const docs = useTeamDocs("meeting");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const ctx = { orgId: team.org_id, teamId: team.id };

  const openNew = () =>
    setEditing({
      id: null,
      status: "draft",
      session: Math.max(0, ...(docs.data ?? []).map((d) => d.session || 0)) + 1,
      doc_date: todayStr(),
      body: {
        topic: "", location: "", startTime: "", endTime: "",
        attendees: "", content: "", isMentoring: false, mentorName: "", mentorOrg: "",
        expenses: [], photos: [],
      },
    });

  async function save(next, { submit = false, close = false } = {}) {
    setBusy(true);
    try {
      const payload = {
        title: next.body.topic ? `회의록 — ${next.body.topic}` : `${next.session}회차 회의록`,
        session: Number(next.session) || null,
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
        title="회의록"
        description="회의 내용과 집행 항목을 기록하고 확인을 요청하세요."
        onCreate={openNew}
      />

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="📝"
            title="첫 회의록을 작성해 보세요"
            description="식대·다과 등 집행이 있었다면 영수증과 함께 기록해요."
            action={<Button onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              subtitle={d.body?.isMentoring ? "멘토링 회의" : null}
              amount={d.body?.expenses?.length ? `${fmtMoney(sumItems(d.body.expenses))}원` : null}
              onClick={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      {editing && (
        <MeetingModal
          doc={editing} busy={busy} ctx={ctx} rules={settings.expRules}
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

function MeetingModal({ doc, busy, ctx, rules, onClose, onChange, onSave, onDelete, onRecall }) {
  const editable = isEditable(doc);
  const b = doc.body;
  const setBody = (patch) => onChange({ ...doc, body: { ...b, ...patch } });
  const setExp = (i, patch) =>
    setBody({ expenses: b.expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });

  function submit() {
    if (!b.topic.trim()) return alert("회의 주제를 입력해 주세요.");
    for (const e of b.expenses) {
      if ((Number(e.amount) || 0) > 0 && !e.receiptUrl) return alert("집행 항목에는 영수증 첨부가 필요해요.");
      const warn = validateExp(e, rules);
      if (warn && !confirm(`[${e.type}] ${warn}\n그래도 제출할까요? (관리자 검토 시 반려될 수 있어요)`)) return;
    }
    onSave(doc, { submit: true });
  }

  return (
    <Modal
      open onClose={onClose}
      title={doc.id ? "회의록" : "회의록 작성"}
      footer={
        editable ? (
          <DocActions doc={doc} busy={busy} onDelete={doc.id ? onDelete : null} onSubmit={submit} submitLabel="📨 확인요청" />
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
          <Field label="회의일">
            <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
              onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
          </Field>
        </div>
        <Field label="주제">
          <Input value={b.topic} disabled={!editable} onChange={(e) => setBody({ topic: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="장소">
            <Input value={b.location} disabled={!editable} onChange={(e) => setBody({ location: e.target.value })} />
          </Field>
          <Field label="참석자" hint="쉼표로 구분">
            <Input value={b.attendees} disabled={!editable} onChange={(e) => setBody({ attendees: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작">
            <Input type="time" value={b.startTime} disabled={!editable} onChange={(e) => setBody({ startTime: e.target.value })} />
          </Field>
          <Field label="종료">
            <Input type="time" value={b.endTime} disabled={!editable} onChange={(e) => setBody({ endTime: e.target.value })} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input
            type="checkbox" className="size-4 accent-brand-600" checked={b.isMentoring} disabled={!editable}
            onChange={(e) => setBody({ isMentoring: e.target.checked })}
          />
          멘토링 회의예요
        </label>
        {b.isMentoring && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="멘토 이름">
              <Input value={b.mentorName} disabled={!editable} onChange={(e) => setBody({ mentorName: e.target.value })} />
            </Field>
            <Field label="멘토 소속">
              <Input value={b.mentorOrg} disabled={!editable} onChange={(e) => setBody({ mentorOrg: e.target.value })} />
            </Field>
          </div>
        )}

        <Field label="회의 내용">
          <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
        </Field>

        {/* 집행 항목 */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">집행 항목 (영수증 필수)</span>
            {editable && (
              <Button variant="ghost" size="sm" onClick={() => setBody({ expenses: [...b.expenses, blankExp()] })}>
                + 항목 추가
              </Button>
            )}
          </div>
          <div className="mt-1.5 space-y-2">
            {b.expenses.map((e, i) => {
              const warn = validateExp(e, rules);
              return (
                <div key={i} className="rounded-xl border border-ink-200 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Select className="!h-9 !w-32 text-sm" value={e.type} disabled={!editable}
                      onChange={(ev) => setExp(i, { type: ev.target.value })}>
                      {EXP_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                    <Input className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                      value={e.amount} disabled={!editable} onChange={(ev) => setExp(i, { amount: ev.target.value })} />
                    <Input className="!h-9 !w-14 text-sm text-right" type="number" min={1} placeholder="인원"
                      value={e.people} disabled={!editable} onChange={(ev) => setExp(i, { people: ev.target.value })} />
                    {editable && (
                      <button className="text-ink-300 hover:text-red-500 px-1 ml-auto"
                        onClick={() => setBody({ expenses: b.expenses.filter((_, idx) => idx !== i) })}>
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input className="!h-9 flex-1 text-sm" placeholder="내역 (예: 회의 식대)"
                      value={e.desc} disabled={!editable} onChange={(ev) => setExp(i, { desc: ev.target.value })} />
                    <ReceiptSlot value={e.receiptUrl} ctx={ctx} onChange={(url) => setExp(i, { receiptUrl: url })} />
                  </div>
                  {warn && <Badge tone="warning">⚠ {warn}</Badge>}
                </div>
              );
            })}
          </div>
          {b.expenses.length > 0 && (
            <p className="mt-2 text-right text-sm font-bold text-ink-900">
              집행 합계 {fmtMoney(sumItems(b.expenses))}원
            </p>
          )}
        </div>

        <Field label="회의 사진">
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
