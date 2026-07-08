import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { createDoc, updateDoc, DOC_TYPES } from "../../lib/docs.js";
import { fmtMoney, sumItems } from "../../lib/format.js";
import { PhotoList } from "../../components/FileUpload.jsx";
import { Button, Field, Input, Modal, Select, Spinner, Textarea } from "../../components/ui/index.jsx";

/* 하위양식 (정부 서식 그대로)
   - 검수확인서(서식 113 첨부1): 구분·품명·용도·수량·단가·금액 + 증빙사진(구매·납품)
   - 출장보고서(서식 116): 목적·출장일자·출장지·출장명단·출장내용·집행금액(항목·금액·대상자·비고)·관련사진
   - 강의결과보고서: 강사·시간·주제·내용 (강사비 지침 증빙) */

const INSPECTION_CATEGORIES = ["재료비", "임차비", "도서비", "인쇄비"];
const TRIP_EXP_ITEMS = ["교통비(대중교통)", "택시비", "유류비(자차)", "회의비(식비)", "기타"];

const BLANK = {
  inspection: { items: [{ category: "재료비", name: "", use: "", qty: 1, price: 0 }], photos: [] },
  business_trip: {
    purpose: "", tripDate: "", location: "", attendees: "", content: "",
    expenses: [], photos: [], photoNote: "",
  },
  lecture_report: { lecturer: "", hours: 1, topic: "", content: "", photos: [] },
};

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
        setDoc({ id: null, doc_date: parent.doc_date, body: structuredClone(BLANK[kind]) });
      }
    })();
    return () => { alive = false; };
  }, [docId, kind, parent.doc_date]);

  async function save() {
    setBusy(true);
    try {
      const payload = {
        title: DOC_TYPES[kind],
        doc_date: doc.doc_date || null,
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
      title={`${DOC_TYPES[kind]}${kind === "inspection" ? " (서식 113 첨부1)" : kind === "business_trip" ? " (서식 116)" : ""}`}
      footer={editable && (
        <Button disabled={busy || !doc} onClick={save}>{busy ? "저장 중…" : "저장하고 연결"}</Button>
      )}
    >
      {!doc ? (
        <div className="py-10 grid place-items-center"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          {kind === "inspection" && <InspectionForm doc={doc} setDoc={setDoc} editable={editable} ctx={ctx} />}
          {kind === "business_trip" && <TripForm doc={doc} setDoc={setDoc} editable={editable} ctx={ctx} />}
          {kind === "lecture_report" && <LectureForm doc={doc} setDoc={setDoc} editable={editable} ctx={ctx} />}
        </div>
      )}
    </Modal>
  );
}

/* ─── 검수확인서 ─── */
function InspectionForm({ doc, setDoc, editable, ctx }) {
  const items = doc.body.items;
  const setBody = (patch) => setDoc({ ...doc, body: { ...doc.body, ...patch } });
  const setItem = (i, patch) => setBody({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <>
      <Field label="검수일">
        <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
          onChange={(e) => setDoc({ ...doc, doc_date: e.target.value })} />
      </Field>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-700">검수 품목</span>
          {editable && (
            <Button variant="ghost" size="sm"
              onClick={() => setBody({ items: [...items, { category: "재료비", name: "", use: "", qty: 1, price: 0 }] })}>
              + 품목
            </Button>
          )}
        </div>
        <div className="mt-1.5 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Select className="!h-9 !w-24 text-sm" value={it.category} disabled={!editable}
                  onChange={(e) => setItem(i, { category: e.target.value })}>
                  {INSPECTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="품명" value={it.name} disabled={!editable}
                  onChange={(e) => setItem(i, { name: e.target.value })} />
                {editable && items.length > 1 && (
                  <button className="text-ink-300 hover:text-red-500 px-1"
                    onClick={() => setBody({ items: items.filter((_, idx) => idx !== i) })}>×</button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="용도" value={it.use} disabled={!editable}
                  onChange={(e) => setItem(i, { use: e.target.value })} />
                <Input className="!h-9 !w-14 text-sm text-right" type="number" min={0} value={it.qty} disabled={!editable}
                  onChange={(e) => setItem(i, { qty: e.target.value })} />
                <Input className="!h-9 !w-24 text-sm text-right" type="number" min={0} step={100} value={it.price} disabled={!editable}
                  onChange={(e) => setItem(i, { price: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-sm font-bold">합계 {fmtMoney(total)}원</p>
      </div>
      <Field label="증빙 사진" hint="제품 사진, 카드 영수증, 임차내역(계약서·명세서), 구매 또는 납품 사진">
        <PhotoList value={doc.body.photos} ctx={ctx} onChange={(photos) => setBody({ photos })} />
      </Field>
      <p className="text-[11px] text-ink-400">검사(수)자: 프로젝트 팀장·멘토 — PDF 출력 시 서명란이 포함돼요.</p>
    </>
  );
}

/* ─── 출장보고서 (서식 116) ─── */
function TripForm({ doc, setDoc, editable, ctx }) {
  const b = doc.body;
  const setBody = (patch) => setDoc({ ...doc, body: { ...b, ...patch } });
  const expenses = b.expenses ?? [];
  const setExp = (i, patch) => setBody({ expenses: expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  return (
    <>
      <Field label="목적">
        <Input value={b.purpose} disabled={!editable} onChange={(e) => setBody({ purpose: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="출장일자">
          <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
            onChange={(e) => setDoc({ ...doc, doc_date: e.target.value })} />
        </Field>
        <Field label="출장지">
          <Input value={b.location} disabled={!editable} onChange={(e) => setBody({ location: e.target.value })} />
        </Field>
      </div>
      <Field label="출장 명단" hint="쉼표로 구분 — PDF 서명란으로 출력">
        <Input value={b.attendees} disabled={!editable} onChange={(e) => setBody({ attendees: e.target.value })} />
      </Field>
      <Field label="출장 내용" hint="출장 활동 및 상세 내용">
        <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
      </Field>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-700">집행금액</span>
          {editable && (
            <Button variant="ghost" size="sm"
              onClick={() => setBody({ expenses: [...expenses, { item: TRIP_EXP_ITEMS[0], amount: 0, people: "", note: "" }] })}>
              + 항목
            </Button>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-ink-400">
          시내교통비 1팀 1일 20,000원 · 자차 1팀 1일 50,000원(유류비산출내역서 첨부) · KTX 일반실 기준 실비
        </p>
        <div className="mt-1.5 space-y-2">
          {expenses.map((e, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Select className="!h-9 !w-36 text-sm" value={e.item} disabled={!editable}
                  onChange={(ev) => setExp(i, { item: ev.target.value })}>
                  {TRIP_EXP_ITEMS.map((t) => <option key={t}>{t}</option>)}
                </Select>
                <Input className="!h-9 flex-1 min-w-0 text-sm text-right" type="number" min={0} step={100} placeholder="금액"
                  value={e.amount} disabled={!editable} onChange={(ev) => setExp(i, { amount: ev.target.value })} />
                {editable && (
                  <button className="text-ink-300 hover:text-red-500 px-1"
                    onClick={() => setBody({ expenses: expenses.filter((_, idx) => idx !== i) })}>×</button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Input className="!h-9 flex-1 min-w-0 text-sm" placeholder="대상자" value={e.people} disabled={!editable}
                  onChange={(ev) => setExp(i, { people: ev.target.value })} />
                <Input className="!h-9 !w-24 text-sm" placeholder="비고" value={e.note} disabled={!editable}
                  onChange={(ev) => setExp(i, { note: ev.target.value })} />
              </div>
            </div>
          ))}
        </div>
        {expenses.length > 0 && (
          <p className="mt-2 text-right text-sm font-bold">총계 {fmtMoney(sumItems(expenses))}원</p>
        )}
      </div>

      <Field label="관련 사진" hint="집행금액에 대한 사진 첨부">
        <PhotoList value={b.photos} ctx={ctx} onChange={(photos) => setBody({ photos })} />
      </Field>
      <Field label="사진 부가 설명 (선택)">
        <Input value={b.photoNote ?? ""} disabled={!editable} onChange={(e) => setBody({ photoNote: e.target.value })} />
      </Field>
    </>
  );
}

/* ─── 강의결과보고서 ─── */
function LectureForm({ doc, setDoc, editable, ctx }) {
  const b = doc.body;
  const setBody = (patch) => setDoc({ ...doc, body: { ...b, ...patch } });
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="강의일">
          <Input type="date" value={doc.doc_date ?? ""} disabled={!editable}
            onChange={(e) => setDoc({ ...doc, doc_date: e.target.value })} />
        </Field>
        <Field label="강의 시간(시간)" hint="1일 최대 3시간">
          <Input type="number" min={0.5} max={3} step={0.5} value={b.hours} disabled={!editable}
            onChange={(e) => setBody({ hours: e.target.value })} />
        </Field>
      </div>
      <Field label="강사명">
        <Input value={b.lecturer} disabled={!editable} onChange={(e) => setBody({ lecturer: e.target.value })} />
      </Field>
      <Field label="강의 주제">
        <Input value={b.topic} disabled={!editable} onChange={(e) => setBody({ topic: e.target.value })} />
      </Field>
      <Field label="강의 내용">
        <Textarea value={b.content} disabled={!editable} onChange={(e) => setBody({ content: e.target.value })} />
      </Field>
      <Field label="증빙 사진" hint="강의 사진 필수 (지침: 강의 결과보고서·사진 첨부)">
        <PhotoList value={b.photos} ctx={ctx} onChange={(photos) => setBody({ photos })} />
      </Field>
      <p className="text-[11px] text-ink-400">
        강사비는 시간당 100,000원 한도, 강사 명의 계좌이체(원천징수)로 지급해야 해요. 현금 지급 불가.
      </p>
    </>
  );
}
