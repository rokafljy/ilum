import { useState } from "react";
import { useTeam } from "./TeamSpace.jsx";
import { useTeamDocs, DocRow, DocPageHeader, isEditable } from "./docCommon.jsx";
import { todayStr } from "../../lib/format.js";
import {
  Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea,
} from "../../components/ui/index.jsx";

/** 멘토링 일지 — 회차별 기록 (승인 없음, 기관은 조회) */
export default function MentoringPage() {
  const { settings } = useTeam();
  const docs = useTeamDocs("mentoring");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const total = settings.mentoringTotal ?? 8;
  const done = docs.data?.length ?? 0;

  const openNew = () =>
    setEditing({
      id: null,
      status: "draft",
      session: done + 1,
      doc_date: todayStr(),
      body: { mentor: "", mentorOrg: "", location: "", topic: "", content: "", feedback: "" },
    });

  async function save(next) {
    setBusy(true);
    try {
      const payload = {
        title: `${next.session}회차 멘토링`,
        session: Number(next.session) || null,
        doc_date: next.doc_date || null,
        body: next.body,
      };
      if (next.id) await docs.update.mutateAsync({ id: next.id, ...payload });
      else await docs.create.mutateAsync(payload);
      setEditing(null);
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <DocPageHeader
        title={`멘토링 일지 (${done}/${total}회)`}
        description="멘토링을 마칠 때마다 일지를 남겨 주세요."
        onCreate={openNew}
      />

      <div className="mt-3 h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
      </div>

      {docs.isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs.data?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="🤝"
            title="첫 멘토링 일지를 남겨 보세요"
            description={`이 사업은 총 ${total}회의 멘토링이 필요해요.`}
            action={<Button onClick={openNew}>+ 작성하기</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {docs.data.map((d) => (
            <DocRow key={d.id} doc={{ ...d, status: "draft", reject_note: null }} subtitle={d.body?.mentor ? `멘토 ${d.body.mentor}` : null} onClick={() => setEditing(d)} />
          ))}
        </div>
      )}

      {editing && (
        <Modal
          open onClose={() => setEditing(null)}
          title={editing.id ? `${editing.session}회차 멘토링` : "멘토링 일지 작성"}
          footer={
            <>
              {editing.id && (
                <Button variant="ghost" size="sm" className="text-red-600 mr-auto" disabled={busy}
                  onClick={async () => {
                    if (!confirm("이 일지를 삭제할까요?")) return;
                    await docs.remove.mutateAsync(editing.id);
                    setEditing(null);
                  }}>
                  삭제
                </Button>
              )}
              <Button disabled={busy || !editing.body.topic.trim()} onClick={() => save(editing)}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            </>
          }
        >
          <MentoringForm doc={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}

function MentoringForm({ doc, onChange }) {
  const b = doc.body;
  const setBody = (patch) => onChange({ ...doc, body: { ...b, ...patch } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="회차">
          <Input type="number" min={1} value={doc.session ?? ""} onChange={(e) => onChange({ ...doc, session: e.target.value })} />
        </Field>
        <Field label="날짜">
          <Input type="date" value={doc.doc_date ?? ""} onChange={(e) => onChange({ ...doc, doc_date: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="멘토 이름">
          <Input value={b.mentor} onChange={(e) => setBody({ mentor: e.target.value })} />
        </Field>
        <Field label="멘토 소속">
          <Input value={b.mentorOrg} onChange={(e) => setBody({ mentorOrg: e.target.value })} />
        </Field>
      </div>
      <Field label="장소">
        <Input value={b.location} onChange={(e) => setBody({ location: e.target.value })} />
      </Field>
      <Field label="주제">
        <Input value={b.topic} onChange={(e) => setBody({ topic: e.target.value })} />
      </Field>
      <Field label="멘토링 내용">
        <Textarea value={b.content} onChange={(e) => setBody({ content: e.target.value })} />
      </Field>
      <Field label="멘토 피드백">
        <Textarea className="min-h-16" value={b.feedback} onChange={(e) => setBody({ feedback: e.target.value })} />
      </Field>
    </div>
  );
}
