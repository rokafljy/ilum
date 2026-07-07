import { DOC_TYPES } from "../../lib/docs.js";
import { fmtDate, fmtMoney, sumItems } from "../../lib/format.js";

/**
 * 정식양식 렌더러 — PDF 캡처 전용 (A4 비율, 794px 폭)
 * 공문서 톤: 검은 괘선 표, 서명란 포함
 */
export function FormalDoc({ doc, meta }) {
  const b = doc.body ?? {};
  return (
    <div style={{ width: 794, padding: "56px 52px", background: "#fff", color: "#111", fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, letterSpacing: 8, margin: 0 }}>
        {DOC_TYPES[doc.doc_type]}
      </h1>

      {/* 기본 정보 표 */}
      <table style={tableStyle}>
        <tbody>
          <tr>
            <th style={thStyle}>사업명</th>
            <td style={tdStyle} colSpan={3}>{meta.programName}</td>
          </tr>
          <tr>
            <th style={thStyle}>팀명</th>
            <td style={tdStyle}>{meta.teamName}</td>
            <th style={thStyle}>{doc.session ? "회차" : "구분"}</th>
            <td style={tdStyle}>{doc.session ? `${doc.session}회차` : DOC_TYPES[doc.doc_type]}</td>
          </tr>
          <tr>
            <th style={thStyle}>일자</th>
            <td style={tdStyle}>{fmtDate(doc.doc_date)}</td>
            <th style={thStyle}>상태</th>
            <td style={tdStyle}>{{ approved: "승인완료", confirmed: "확인완료", submitted: "승인대기", rejected: "반려", draft: "작성중" }[doc.status]}</td>
          </tr>
        </tbody>
      </table>

      {/* 유형별 본문 */}
      {doc.doc_type === "request" && <ItemsBlock items={(b.items ?? []).map((it) => ({ c1: it.name, c2: it.unit, c3: it.qty, amount: (Number(it.qty) || 0) * (Number(it.price) || 0) }))} head={["품명", "단위", "수량", "금액"]} note={b.note} />}

      {doc.doc_type === "meeting" && (
        <>
          <KVTable rows={[["주제", b.topic], ["장소", b.location], ["시간", b.startTime && `${b.startTime} ~ ${b.endTime}`], ["참석자", b.attendees], b.isMentoring ? ["멘토", `${b.mentorName} (${b.mentorOrg})`] : null, ["회의 내용", b.content]]} />
          {b.expenses?.length > 0 && (
            <ItemsBlock title="집행 내역" items={b.expenses.map((e) => ({ c1: e.type, c2: e.desc, c3: e.people ? `${e.people}인` : "", amount: Number(e.amount) || 0 }))} head={["유형", "내역", "인원", "금액"]} />
          )}
        </>
      )}

      {doc.doc_type === "mentoring" && (
        <KVTable rows={[["멘토", b.mentor && `${b.mentor}${b.mentorOrg ? ` (${b.mentorOrg})` : ""}`], ["장소", b.location], ["주제", b.topic], ["멘토링 내용", b.content], ["멘토 피드백", b.feedback]]} />
      )}

      {doc.doc_type === "expense_report" && (
        <ItemsBlock items={(b.items ?? []).map((it) => ({ c1: it.type, c2: it.desc, c3: it.evidence?.docId ? "양식연결" : it.evidence?.receiptUrl ? "영수증" : "-", amount: Number(it.amount) || 0 }))} head={["비목", "내역", "증빙", "금액"]} />
      )}

      {doc.doc_type === "inspection" && (
        <ItemsBlock items={(b.items ?? []).map((it) => ({ c1: it.name, c2: it.use, c3: it.qty, amount: (Number(it.qty) || 0) * (Number(it.price) || 0) }))} head={["품명", "용도", "수량", "금액"]} />
      )}

      {doc.doc_type === "business_trip" && (
        <KVTable rows={[["출장 목적", b.purpose], ["출장지", b.location], ["참석자", b.attendees], ["활동 내용", b.content]]} />
      )}

      {doc.doc_type === "lecture_report" && (
        <KVTable rows={[["강사", b.lecturer], ["강의 시간", b.hours && `${b.hours}시간`], ["주제", b.topic], ["강의 내용", b.content]]} />
      )}

      {/* 사진 */}
      {b.photos?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>증빙 사진</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {b.photos.slice(0, 6).map((u) => (
              <img key={u} src={u} crossOrigin="anonymous" style={{ width: 218, height: 150, objectFit: "cover", border: "1px solid #111" }} alt="" />
            ))}
          </div>
        </div>
      )}

      {/* 서명란 */}
      <table style={{ ...tableStyle, marginTop: 32 }}>
        <tbody>
          <tr>
            <th style={{ ...thStyle, width: "20%" }}>작성자</th>
            <td style={{ ...tdStyle, width: "30%" }}>
              {meta.leaderName}
              <span style={{ fontFamily: "'Nanum Pen Script', cursive", fontSize: 26, marginLeft: 10 }}>{meta.leaderName}</span>
            </td>
            <th style={{ ...thStyle, width: "20%" }}>확인자</th>
            <td style={{ ...tdStyle, width: "30%" }}>
              {["approved", "confirmed"].includes(doc.status) ? (meta.checkerName || meta.orgName) : "(승인 전)"}
              {["approved", "confirmed"].includes(doc.status) && (
                <span style={{ marginLeft: 8, color: "#059669", fontWeight: 800, fontSize: 13, border: "2px solid #059669", borderRadius: 999, padding: "2px 8px" }}>확인</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#666" }}>
        {meta.orgName} · {meta.programName}
      </p>
    </div>
  );
}

const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: 13 };
const thStyle = { border: "1px solid #111", background: "#f3f4f6", padding: "8px 10px", fontWeight: 700, width: "16%", textAlign: "center" };
const tdStyle = { border: "1px solid #111", padding: "8px 10px" };

function KVTable({ rows }) {
  return (
    <table style={tableStyle}>
      <tbody>
        {rows.filter(Boolean).filter(([, v]) => v).map(([k, v]) => (
          <tr key={k}>
            <th style={thStyle}>{k}</th>
            <td style={{ ...tdStyle, whiteSpace: "pre-wrap" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ItemsBlock({ title, items, head, note }) {
  const total = items.reduce((s, it) => s + it.amount, 0);
  return (
    <div style={{ marginTop: 20 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{title}</div>}
      <table style={{ ...tableStyle, marginTop: 0 }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={tdStyle}>{it.c1}</td>
              <td style={tdStyle}>{it.c2}</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>{it.c3}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(it.amount)}원</td>
            </tr>
          ))}
          <tr>
            <th style={thStyle} colSpan={3}>합계</th>
            <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>{fmtMoney(total)}원</td>
          </tr>
        </tbody>
      </table>
      {note && <p style={{ fontSize: 12, marginTop: 8 }}>비고: {note}</p>}
    </div>
  );
}
