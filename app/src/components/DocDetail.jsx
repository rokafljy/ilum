import { fmtDate, fmtMoney, sumItems } from "../lib/format.js";
import { Badge } from "./ui/index.jsx";

/** 문서 본문 공용 뷰어 — 승인 화면·상세 조회에서 사용 */
export function DocDetail({ doc }) {
  const b = doc.body ?? {};
  return (
    <div className="space-y-4 text-sm">
      <Meta doc={doc} />
      {doc.doc_type === "request" && <RequestBody b={b} />}
      {doc.doc_type === "meeting" && <MeetingBody b={b} />}
      {doc.doc_type === "mentoring" && <MentoringBody b={b} />}
      {doc.doc_type === "expense_report" && <ExpenseBody b={b} />}
      {doc.doc_type === "inspection" && <InspectionBody b={b} />}
      {doc.doc_type === "business_trip" && <TripBody b={b} />}
      {doc.doc_type === "lecture_report" && <LectureBody b={b} />}
      {b.photos?.length > 0 && <Photos urls={b.photos} />}
      {doc.reject_note && (
        <p className="text-red-600 text-[13px]">반려 사유: {doc.reject_note}</p>
      )}
    </div>
  );
}

function Meta({ doc }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
      {doc.session && <span>회차 <b className="text-ink-900">{doc.session}</b></span>}
      <span>날짜 <b className="text-ink-900">{fmtDate(doc.doc_date)}</b></span>
    </div>
  );
}

function KV({ k, v }) {
  if (!v) return null;
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-ink-400">{k}</span>
      <span className="text-ink-900 whitespace-pre-wrap">{v}</span>
    </div>
  );
}

function ItemsTable({ head, rows, total }) {
  return (
    <div className="rounded-xl border border-ink-100 overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-ink-50 text-ink-500">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-semibold ${i >= head.length - 2 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-100">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j >= r.length - 2 ? "text-right" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {total != null && (
          <tfoot>
            <tr className="border-t border-ink-200 bg-ink-50 font-bold">
              <td className="px-3 py-2" colSpan={head.length - 1}>합계</td>
              <td className="px-3 py-2 text-right">{fmtMoney(total)}원</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Photos({ urls, label = "첨부 사진" }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="block size-20 rounded-lg overflow-hidden border border-ink-200">
            <img src={u} alt="" className="size-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

function RequestBody({ b }) {
  const rows = (b.items ?? []).map((it) => [
    it.name, it.unit, it.qty, `${fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}원`,
  ]);
  const total = (b.items ?? []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <>
      <ItemsTable head={["품명", "단위", "수량", "금액"]} rows={rows} total={total} />
      <KV k="비고" v={b.note} />
    </>
  );
}

function MeetingBody({ b }) {
  return (
    <>
      <div className="space-y-1.5">
        <KV k="주제" v={b.topic} />
        <KV k="장소" v={b.location} />
        <KV k="시간" v={b.startTime && `${b.startTime} ~ ${b.endTime}`} />
        <KV k="참석자" v={b.attendees} />
        {b.isMentoring && <KV k="멘토" v={`${b.mentorName} (${b.mentorOrg})`} />}
        <KV k="내용" v={b.content} />
      </div>
      {b.expenses?.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-ink-500 mb-1.5">집행 항목</p>
          <div className="space-y-1.5">
            {b.expenses.map((e, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
                <Badge tone="neutral">{e.type}</Badge>
                <span className="flex-1 text-ink-700 truncate">{e.desc}</span>
                {e.receiptUrl ? (
                  <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-700 text-[12px] font-semibold">
                    영수증
                  </a>
                ) : (
                  <span className="text-red-500 text-[12px]">영수증 없음</span>
                )}
                <b>{fmtMoney(e.amount)}원</b>
              </div>
            ))}
            <p className="text-right font-bold">합계 {fmtMoney(sumItems(b.expenses))}원</p>
          </div>
        </div>
      )}
    </>
  );
}

function MentoringBody({ b }) {
  return (
    <div className="space-y-1.5">
      <KV k="멘토" v={b.mentor && `${b.mentor}${b.mentorOrg ? ` (${b.mentorOrg})` : ""}`} />
      <KV k="장소" v={b.location} />
      <KV k="주제" v={b.topic} />
      <KV k="내용" v={b.content} />
      <KV k="피드백" v={b.feedback} />
    </div>
  );
}

function ExpenseBody({ b }) {
  return (
    <div className="space-y-1.5">
      {(b.items ?? []).map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
          <Badge tone="neutral">{it.type}</Badge>
          <span className="flex-1 text-ink-700 truncate">{it.desc}</span>
          {it.evidence?.receiptUrl && (
            <a href={it.evidence.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-700 text-[12px] font-semibold">영수증</a>
          )}
          {it.evidence?.docId && <Badge tone="brand">양식 연결됨</Badge>}
          <b>{fmtMoney(it.amount)}원</b>
        </div>
      ))}
      <p className="text-right font-bold">합계 {fmtMoney(sumItems(b.items))}원</p>
    </div>
  );
}

function InspectionBody({ b }) {
  const rows = (b.items ?? []).map((it) => [
    it.name, it.use, it.qty, `${fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}원`,
  ]);
  const total = (b.items ?? []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return <ItemsTable head={["품명", "용도", "수량", "금액"]} rows={rows} total={total} />;
}

function TripBody({ b }) {
  return (
    <div className="space-y-1.5">
      <KV k="목적" v={b.purpose} />
      <KV k="출장지" v={b.location} />
      <KV k="참석자" v={b.attendees} />
      <KV k="내용" v={b.content} />
    </div>
  );
}

function LectureBody({ b }) {
  return (
    <div className="space-y-1.5">
      <KV k="강사" v={b.lecturer} />
      <KV k="시간" v={b.hours && `${b.hours}시간`} />
      <KV k="주제" v={b.topic} />
      <KV k="내용" v={b.content} />
    </div>
  );
}
