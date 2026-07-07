import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { createDoc, updateDoc, DOC_TYPES } from "../../lib/docs.js";
import { fmtMoney } from "../../lib/format.js";
import { PhotoList } from "../../components/FileUpload.jsx";
import { Button, Field, Input, Modal, Spinner, Textarea } from "../../components/ui/index.jsx";

/** 하위양식 초기 body */
const BLANK = {
  inspection: { items: [{ name: "", use: "", qty: 1, price: 0 }], photos: [] },
  business_trip: { purpose: "", location: "", attendees: "", content: "", photos: [] },
  lecture_report: { lecturer: "", hours: 1, topic: "", content: "", photos: [] },
};

/**
 * 하위양식 모달 (검수확인서 / 출장보고서 / 강의결과보고서)
 * 저장 시 parent(지출결과서)에 연결된 자식 문서를 생성·수정하고 onLinked(docId) 호출
 */
export function SubFormModal({ kind, docId, parent, editable, onClose, onLinked }) {
  const qc = useQueryClient();
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (docId) {
        const { data } = await supabase.from("documents").select("*").eq("id", docId).single();
        if (alive) setDoc(data);
      } else {
        setDoc({
          id: null,
          doc_date: parent.doc_date,
          body: structuredClone(BLANK[kind]),
        });
      }
    })();
    return () => { alive = false; };
  }, [docId, kind, parent.doc_date]);

  async function save() {
    setBusy(true);
    try {
      const payload = {
        title: `${DOC_TYPES[kind]} — ${parent.session}회차`,
        doc_date: doc.doc_date || null,
        session: parent.session,
        body: doc.body,
      };
      let id = doc.id;
      if (id) await updateDoc(id, payload);
      else {
        const created = await createDoc({
          org_id: parent.org_id,
          program_id: parent.program_id,
          team_id: parent.team_id,
          doc_type: kind,
          parent_id: parent.id,
          ...payload,
        });
        id = created.id;
      }
      qc.invalidateQueries({ queryKey: ["team-docs"] });
      onLinked(id);
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  const ctx = { orgId: parent.org_id, teamId: parent.team_id };

  return (
    <Modal
      open onClose={onClose}
      title={DOC_TYPES[kind]}
      footer={
        editable && (
          <Button disabled={busy || !doc} onClick={save}>
            {busy ? "저장 중…" : "저장하고 연결"}
          </Button>
        )
      }
    >
      {!doc ? (
        <div className="py-10 grid place-items-center"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <Field label="작성일">
            <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
              onChange={(e) => setDoc({ ...doc, doc_date: e.target.value })} />
          </Field>
          {kind === "inspection" && <InspectionForm doc={doc} setDoc={setDoc} editable={editable} />}
          {kind === "business_trip" && <TripForm doc={doc} setDoc={setDoc} editable={editable} />}
          {kind === "lecture_report" && <LectureForm doc={doc} setDoc={setDoc} editable={editable} />}
          <Field label="증빙 사진 (구매·납품·현장)">
            <PhotoList value={doc.body.photos} ctx={ctx} onChange={(photos) => setDoc({ ...doc, body: { ...doc.body, photos } })} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function InspectionForm({ doc, setDoc, editable }) {
  const items = doc.body.items;
  const setBody = (patch) => setDoc({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) => setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-700">검수 품목</span>
        {editable && (
          <Button variant="ghost" size="sm" onClick={() => setBody({ items: [...items, { name: "", use: "", qty: 1, price: 0 }] })}>
            + 품목
          </Button>
        )}
      </div>
      <div className="mt-1.5 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="품명" value={it.name} disabled={!editable}
              onChange={(e) => setItem(i, { name: e.target.value })} />
            <Input className="!h-9 !w-20 text-sm" placeholder="용도" value={it.use} disabled={!editable}
              onChange={(e) => setItem(i, { use: e.target.value })} />
            <Input className="!h-9 !w-14 text-sm text-right" type="number" min={0} value={it.qty} disabled={!editable}
              onChange={(e) => setItem(i, { qty: e.target.value })} />
            <Input className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} value={it.price} disabled={!editable}
              onChange={(e) => setItem(i, { price: e.target.value })} />
            {editable && items.length > 1 && (
              <button className="text-ink-300 hover:text-red-500 px-1"
                onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}>×</button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-sm font-bold">합계 {fmtMoney(total)}원</p>
    </div>
  );
}

function TripForm({ doc, setDoc, editable }) {
  const b = doc.body;
  const setBody = (patch) => setDoc({ ...doc, body: { ...b, ...patch } });
  return (
    <div className="space-y-4">
      <Field label="출장 목적">
        <Input value={b.purpose} disabled={!editable} onChange={(e) => setBody({ purpose: e.target.value })} />
      </Field>
      <Field label="출장지">
        <Input value={b.location} disabled={!editable} onChange={(e) => setBody({ location: e.target.value })} />
      </Field>
      <Field label="참석자" hint="쉼표로 구분">
        <Input value={b.attendees} disabled={!editable} onChange={(e) => setBody({ attendees: e.target.value })} />
      </Field>
      <Field label="활동 내용">
        <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
      </Field>
    </div>
  );
}

function LectureForm({ doc, setDoc, editable }) {
  const b = doc.body;
  const setBody = (patch) => setDoc({ ...doc, body: { ...b, ...patch } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="강사명">
          <Input value={b.lecturer} disabled={!editable} onChange={(e) => setBody({ lecturer: e.target.value })} />
        </Field>
        <Field label="강의 시간(시간)">
          <Input type="number" min={0.5} step={0.5} value={b.hours} disabled={!editable}
            onChange={(e) => setBody({ hours: e.target.value })} />
        </Field>
      </div>
      <Field label="강의 주제">
        <Input value={b.topic} disabled={!editable} onChange={(e) => setBody({ topic: e.target.value })} />
      </Field>
      <Field label="강의 내용">
        <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
      </Field>
    </div>
  );
}
