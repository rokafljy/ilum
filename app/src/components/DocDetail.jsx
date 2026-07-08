import { fmtDate, fmtMoney, sumItems } from "../lib/format.js";
import { FORM_NO } from "../lib/docs.js";
import { Badge } from "./ui/index.jsx";

/** 문서 본문 공용 뷰어 — 승인·활동 조회용 (정부 서식 필드 기준) */
export function DocDetail({ doc }) {
  const b = doc.body ?? {};
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
        {FORM_NO[doc.doc_type] && <Badge tone="neutral">{FORM_NO[doc.doc_type]}</Badge>}
        <span>일자 <b className="text-ink-900">{fmtDate(doc.doc_date)}</b></span>
      </div>

      {doc.doc_type === "request" && <RequestBody b={b} />}
      {doc.doc_type === "meeting" && <MeetingBody b={b} />}
      {doc.doc_type === "mentoring" && <MentoringBody b={b} />}
      {doc.doc_type === "expense_report" && <ExpenseBody b={b} />}
      {doc.doc_type === "inspection" && <InspectionBody b={b} />}
      {doc.doc_type === "business_trip" && <TripBody b={b} />}
      {doc.doc_type === "lecture_report" && <LectureBody b={b} />}
      {doc.doc_type === "plan" && <PlanBody b={b} />}
      {doc.doc_type === "final_report" && <FinalReportBody b={b} />}

      {b.photos?.length > 0 && <Photos urls={b.photos} />}
      {doc.reject_note && <p className="text-red-600 text-[13px]">반려 사유: {doc.reject_note}</p>}
    </div>
  );
}

function KV({ k, v }) {
  if (!v) return null;
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-ink-400">{k}</span>
      <span className="text-ink-900 whitespace-pre-wrap min-w-0">{v}</span>
    </div>
  );
}

function Table({ head, rows, total }) {
  return (
    <div className="rounded-xl border border-ink-100 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-ink-50 text-ink-500">
            {head.map((h, i) => (
              <th key={i} className={`px-2.5 py-2 font-semibold whitespace-nowrap ${i === head.length - 1 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-100">
              {r.map((c, j) => (
                <td key={j} className={`px-2.5 py-2 ${j === r.length - 1 ? "text-right whitespace-nowrap" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {total != null && (
          <tfoot>
            <tr className="border-t border-ink-200 bg-ink-50 font-bold">
              <td className="px-2.5 py-2" colSpan={head.length - 1}>합계</td>
              <td className="px-2.5 py-2 text-right">{fmtMoney(total)}원</td>
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

/* 서식 112 */
function RequestBody({ b }) {
  const rows = (b.items ?? []).map((it, i) => [
    i + 1, it.name, it.spec, it.unit, it.qty, `${fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}원`,
  ]);
  const total = (b.items ?? []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <>
      <Table head={["No.", "내용(품명)", "상세(규격)", "단위", "수량", "금액"]} rows={rows} total={total} />
      <KV k="비고" v={b.note} />
    </>
  );
}

/* 서식 115 */
function MeetingBody({ b }) {
  return (
    <>
      <div className="space-y-1.5">
        <KV k="회의주제" v={b.topic} />
        <KV k="회의일시" v={b.startTime && `${b.startTime} ~ ${b.endTime}`} />
        <KV k="회의장소" v={b.location} />
        <KV k="참여자" v={b.attendees} />
        {b.isMentoring && <KV k="멘토 참여" v="예" />}
        <KV k="회의 내용" v={b.content} />
      </div>
      {b.expenses?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-ink-500">집행금액</p>
          {b.expenses.map((e, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
              <Badge tone="neutral">{e.item}</Badge>
              <span className="flex-1 text-ink-700 truncate">{e.people}{e.note ? ` · ${e.note}` : ""}</span>
              {e.receiptUrl ? (
                <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-700 text-[12px] font-semibold">영수증</a>
              ) : (
                <span className="text-red-500 text-[12px]">영수증 없음</span>
              )}
              <b>{fmtMoney(e.amount)}원</b>
            </div>
          ))}
          <p className="text-right font-bold">총계 {fmtMoney(sumItems(b.expenses))}원</p>
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
      <KV k="활동 내용" v={b.content} />
      <KV k="멘토 피드백" v={b.feedback} />
    </div>
  );
}

/* 서식 113 */
function ExpenseBody({ b }) {
  const rows = (b.items ?? []).map((it, i) => [i + 1, it.category, it.name, it.desc, `${fmtMoney(it.amount)}원`]);
  return (
    <>
      <Table head={["번호", "비목", "내용(품명)", "상세내역", "금액"]} rows={rows} total={sumItems(b.items)} />
      <div className="flex flex-wrap gap-1.5">
        {(b.items ?? []).map((it, i) => (
          <Badge key={i} tone={it.evidence?.docId || it.evidence?.receiptUrl ? "brand" : "danger"}>
            {i + 1}. 증빙 {it.evidence?.docId ? "양식연결 ✓" : it.evidence?.receiptUrl ? "영수증 ✓" : "없음"}
          </Badge>
        ))}
      </div>
      <KV k="특이사항" v={b.remark} />
    </>
  );
}

/* 검수확인서 */
function InspectionBody({ b }) {
  const rows = (b.items ?? []).map((it, i) => [
    i + 1, it.category, it.name, it.use, it.qty, `${fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}원`,
  ]);
  const total = (b.items ?? []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return <Table head={["순번", "구분", "품명", "용도", "수량", "금액"]} rows={rows} total={total} />;
}

/* 서식 116 */
function TripBody({ b }) {
  return (
    <>
      <div className="space-y-1.5">
        <KV k="목적" v={b.purpose} />
        <KV k="출장지" v={b.location} />
        <KV k="출장명단" v={b.attendees} />
        <KV k="출장 내용" v={b.content} />
      </div>
      {b.expenses?.length > 0 && (
        <Table
          head={["항목", "대상자", "비고", "금액"]}
          rows={b.expenses.map((e) => [e.item, e.people, e.note, `${fmtMoney(e.amount)}원`])}
          total={sumItems(b.expenses)}
        />
      )}
    </>
  );
}

function LectureBody({ b }) {
  return (
    <div className="space-y-1.5">
      <KV k="강사" v={b.lecturer} />
      <KV k="강의 시간" v={b.hours && `${b.hours}시간`} />
      <KV k="주제" v={b.topic} />
      <KV k="내용" v={b.content} />
    </div>
  );
}

/* 서식 20 */
function PlanBody({ b }) {
  return (
    <>
      <div className="space-y-1.5">
        <KV k="제안기업" v={b.companyName} />
        <KV k="프로젝트명" v={b.projectName} />
        <KV k="직무 분야" v={b.jobField} />
        <KV k="실행기간" v={b.period} />
        <KV k="소개" v={b.intro} />
        <KV k="배경·필요성" v={b.background} />
        <KV k="추진 일정" v={b.schedule} />
        <KV k="역할 분담" v={b.roles} />
        <KV k="커뮤니케이션" v={b.communication} />
        <KV k="멘토 활용" v={b.mentorPlan} />
      </div>
      {b.budget?.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-ink-500 mb-1.5">예산 활용 계획</p>
          <Table
            head={["항목", "지출항목", "세부내역", "사용시기", "금액"]}
            rows={b.budget.map((r) => [r.category, r.item, r.detail, r.timing, `${fmtMoney(r.amount)}원`])}
            total={b.budget.reduce((s, r) => s + (Number(r.amount) || 0), 0)}
          />
        </div>
      )}
    </>
  );
}

/* 서식 21 */
function FinalReportBody({ b }) {
  return (
    <div className="space-y-1.5">
      <KV k="프로젝트명" v={b.projectName} />
      <KV k="수행 직무" v={b.jobField} />
      <KV k="소개" v={b.intro} />
      <KV k="배경·필요성" v={b.background} />
      <KV k="특징" v={b.features} />
      <KV k="구성" v={b.composition} />
      <KV k="주요 기능" v={b.mainFunctions} />
      <KV k="주요 기술" v={b.technologies} />
      <KV k="결과물" v={b.resultDesc} />
      <KV k="기대효과" v={b.effects} />
      <KV k="업무 분장" v={b.roles} />
      <KV k="수행 일정" v={b.schedule} />
      <KV k="도전·해결" v={b.challenges} />
      <KV k="배운 점" v={b.lessons} />
      <KV k="기업 피드백" v={b.companyFeedback} />
      <KV k="멘토 피드백" v={b.mentorFeedback} />
    </div>
  );
}
