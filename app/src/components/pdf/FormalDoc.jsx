import { fmtDate, fmtMoney, sumItems } from "../../lib/format.js";

/**
 * 정부 지정 서식 PDF 렌더러 — 「2026년 청년 일경험 사업 주요 서식(프로젝트형)」 레이아웃 재현
 * A4 비율 794px 폭, html2canvas 캡처 전용.
 * meta: { orgName, programName, projectName, teamName, leaderName, memberNames[], mentorName, checkerName, budget, spent }
 */
export function FormalDoc({ doc, meta }) {
  const b = doc.body ?? {};
  return (
    <div style={{ width: 794, padding: "52px 56px", background: "#fff", color: "#111", fontFamily: "'Pretendard Variable', Pretendard, sans-serif", fontSize: 13, lineHeight: 1.5 }}>
      {doc.doc_type === "request" && <Form112 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "expense_report" && <Form113 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "inspection" && <FormInspection doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "meeting" && <Form115 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "business_trip" && <Form116 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "lecture_report" && <FormLecture doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "plan" && <Form20 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "final_report" && <Form21 doc={doc} b={b} meta={meta} />}
      {doc.doc_type === "mentoring" && <FormMentoring doc={doc} b={b} meta={meta} />}
    </div>
  );
}

/* ── 공통 요소 ── */
const line = "1px solid #111";
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = { border: line, background: "#f1f3f5", padding: "7px 9px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" };
const td = { border: line, padding: "7px 9px", verticalAlign: "top" };
const tdC = { ...td, textAlign: "center" };
const tdR = { ...td, textAlign: "right" };

function Title({ children }) {
  return (
    <h1 style={{ textAlign: "center", fontSize: 25, fontWeight: 800, letterSpacing: 6, margin: "0 0 26px" }}>
      {children}
    </h1>
  );
}

function Sign({ name }) {
  if (!name) return <span style={{ color: "#999" }}>(인)</span>;
  return (
    <>
      {name}{" "}
      <span style={{ fontFamily: "'Nanum Pen Script', cursive", fontSize: 24, color: "#1a1a1a" }}>{name}</span>
      <span style={{ fontSize: 11, color: "#888" }}> (인)</span>
    </>
  );
}

function DateLine({ date }) {
  const d = date ? new Date(date) : new Date();
  return (
    <p style={{ textAlign: "center", fontSize: 14, margin: "26px 0 18px" }}>
      {d.getFullYear()}년 {d.getMonth() + 1}월 {d.getDate()}일
    </p>
  );
}

function TeamSignBlock({ meta, confirmed }) {
  const members = meta.memberNames ?? [];
  return (
    <table style={{ ...tbl, marginTop: 8 }}>
      <tbody>
        <tr>
          <th style={{ ...th, width: "18%" }} rowSpan={Math.max(1, members.length + 1)}>
            참여청년<br />(작성자)
          </th>
          <td style={{ ...td, width: "32%" }}>팀장 <Sign name={meta.leaderName} /></td>
          <th style={{ ...th, width: "18%" }} rowSpan={Math.max(1, members.length + 1)}>
            운영기관<br />(확인자)
          </th>
          <td style={{ ...td, width: "32%" }} rowSpan={Math.max(1, members.length + 1)}>
            {confirmed ? (
              <>
                {meta.checkerName || meta.orgName}
                <span style={{ marginLeft: 8, color: "#c0392b", fontWeight: 800, fontSize: 12, border: "2px solid #c0392b", borderRadius: "50%", padding: "6px 5px", display: "inline-block", lineHeight: 1 }}>
                  확인
                </span>
              </>
            ) : (
              <span style={{ color: "#999" }}>(승인 전) (인)</span>
            )}
          </td>
        </tr>
        {members.map((m) => (
          <tr key={m}>
            <td style={td}>팀원 <Sign name={m} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PhotoGrid({ urls, cols = 3 }) {
  if (!urls?.length) return null;
  const w = cols === 2 ? 320 : 210;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {urls.slice(0, 6).map((u) => (
        <img key={u} src={u} crossOrigin="anonymous" alt=""
          style={{ width: w, height: w * 0.7, objectFit: "cover", border: "1px solid #111" }} />
      ))}
    </div>
  );
}

/* ── 서식 112 프로젝트 실행비 지출 품의서 ── */
function Form112({ doc, b, meta }) {
  const items = b.items ?? [];
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const remain = (meta.budget ?? 0) - (meta.spent ?? 0) - total;
  return (
    <>
      <Title>프로젝트 실행비 지출 품의서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>운영기관명</th><td style={td} colSpan={3}>{meta.orgName}</td></tr>
          <tr><th style={th}>프로젝트명</th><td style={td} colSpan={3}>{meta.projectName}</td></tr>
          <tr>
            <th style={th}>팀 명</th><td style={td}>{meta.teamName}</td>
            <th style={{ ...th, width: "20%" }}>실행비 총액</th><td style={tdR}>{fmtMoney(meta.budget)}원</td>
          </tr>
          <tr>
            <th style={th}>품의 금액</th>
            <td style={td} colSpan={3}>金 {fmtMoney(total)}원整 (₩ {fmtMoney(total)})</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tbl, marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "7%" }}>No.</th>
            <th style={th}>내용(품명)</th>
            <th style={th}>상세(규격)</th>
            <th style={{ ...th, width: "8%" }}>단위</th>
            <th style={{ ...th, width: "8%" }}>수량</th>
            <th style={{ ...th, width: "13%" }}>단가</th>
            <th style={{ ...th, width: "14%" }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={tdC}>{i + 1}</td>
              <td style={td}>{it.name}</td>
              <td style={td}>{it.spec}</td>
              <td style={tdC}>{it.unit}</td>
              <td style={tdC}>{it.qty}</td>
              <td style={tdR}>{fmtMoney(it.price)}원</td>
              <td style={tdR}>{fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}원</td>
            </tr>
          ))}
          <tr>
            <th style={th} colSpan={6}>소 계</th>
            <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(total)}원</td>
          </tr>
          <tr>
            <th style={th} colSpan={6}>프로젝트 실행비 잔액</th>
            <td style={tdR}>{fmtMoney(remain)}원</td>
          </tr>
        </tbody>
      </table>

      {b.note && <p style={{ marginTop: 10, fontSize: 12 }}>※ 비고: {b.note}</p>}
      <p style={{ textAlign: "center", marginTop: 24 }}>
        프로젝트 실행비를 상기와 같이 지출코자 하오니, 확인하여 주시기 바랍니다.
      </p>
      <DateLine date={doc.doc_date} />
      <TeamSignBlock meta={meta} confirmed={doc.status === "approved"} />
    </>
  );
}

/* ── 서식 113 프로젝트 실행비 지출 결과서 ── */
function Form113({ doc, b, meta }) {
  const items = b.items ?? [];
  const total = sumItems(items);
  const remain = (meta.budget ?? 0) - (meta.spent ?? 0) - (doc.status === "approved" ? 0 : total);
  return (
    <>
      <Title>프로젝트 실행비 지출 결과서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>운영기관명</th><td style={td} colSpan={3}>{meta.orgName}</td></tr>
          <tr><th style={th}>프로젝트명</th><td style={td} colSpan={3}>{meta.projectName}</td></tr>
          <tr>
            <th style={th}>팀 명</th><td style={td}>{meta.teamName}</td>
            <th style={{ ...th, width: "20%" }}>실행비 총액</th><td style={tdR}>{fmtMoney(meta.budget)}원</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tbl, marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "8%" }}>번호</th>
            <th style={{ ...th, width: "14%" }}>구분</th>
            <th style={th}>내용(품명)</th>
            <th style={th}>상세내역</th>
            <th style={{ ...th, width: "15%" }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={tdC}>{i + 1}</td>
              <td style={tdC}>{it.category}</td>
              <td style={td}>{it.name}</td>
              <td style={td}>{it.desc}</td>
              <td style={tdR}>{fmtMoney(it.amount)}원</td>
            </tr>
          ))}
          <tr>
            <th style={th} colSpan={4}>소 계</th>
            <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(total)}원</td>
          </tr>
          <tr>
            <th style={th} colSpan={4}>프로젝트 실행비 잔액</th>
            <td style={tdR}>{fmtMoney(remain)}원</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tbl, marginTop: 12 }}>
        <tbody>
          <tr>
            <th style={{ ...th, width: "14%" }}>특이<br />사항</th>
            <td style={{ ...td, height: 44 }}>{b.remark}</td>
          </tr>
        </tbody>
      </table>

      <DateLine date={doc.doc_date} />
      <TeamSignBlock meta={meta} confirmed={doc.status === "approved"} />
      <p style={{ marginTop: 14, fontSize: 11, color: "#555" }}>
        ※ 첨부. 프로젝트 실행비 지출 증빙(검수확인서, 회의록, 출장보고서 등)<br />
        ※ 비고란은 품의서 내용 변경 및 취소 일자 작성 또는 항목별 특이사항 작성
      </p>
    </>
  );
}

/* ── 검수확인서 (서식 113 첨부1) ── */
function FormInspection({ doc, b, meta }) {
  const items = b.items ?? [];
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return (
    <>
      <Title>검 수 확 인 서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "20%" }}>프로젝트명</th><td style={td}>{meta.projectName}</td></tr>
          <tr><th style={th}>팀명</th><td style={td}>{meta.teamName}</td></tr>
        </tbody>
      </table>
      <table style={{ ...tbl, marginTop: 14 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "8%" }}>순번</th>
            <th style={{ ...th, width: "13%" }}>구분</th>
            <th style={th}>품명</th>
            <th style={th}>용도</th>
            <th style={{ ...th, width: "8%" }}>수량</th>
            <th style={{ ...th, width: "13%" }}>단가(원)</th>
            <th style={{ ...th, width: "14%" }}>금액(원)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={tdC}>{i + 1}</td>
              <td style={tdC}>{it.category}</td>
              <td style={td}>{it.name}</td>
              <td style={td}>{it.use}</td>
              <td style={tdC}>{it.qty}</td>
              <td style={tdR}>{fmtMoney(it.price)}</td>
              <td style={tdR}>{fmtMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...tdC, color: "#888" }} colSpan={7}>이 하 여 백</td>
          </tr>
          <tr>
            <th style={th} colSpan={6}>합 계</th>
            <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(total)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ textAlign: "center", marginTop: 22 }}>상기와 같이 검사(수)함</p>
      <DateLine date={doc.doc_date} />
      <div style={{ textAlign: "right", marginTop: 8, lineHeight: 2.2 }}>
        <p>검사(수)자 : 프로젝트 팀장 <Sign name={meta.leaderName} /></p>
        <p>검사(수)자 : 멘토 <Sign name={meta.mentorName} /></p>
      </div>
      {b.photos?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p style={{ fontWeight: 700, fontSize: 12 }}>(첨부1) 증빙 사진 — 제품 사진, 카드 영수증, 임차내역, 구매 또는 납품 사진</p>
          <PhotoGrid urls={b.photos} />
        </div>
      )}
    </>
  );
}

/* ── 서식 115 프로젝트 회의록 ── */
function Form115({ doc, b, meta }) {
  const attendees = (b.attendees ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const expenses = b.expenses ?? [];
  return (
    <>
      <Title>프로젝트 회의록</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "18%" }}>회의주제</th><td style={td} colSpan={3}>{b.topic}</td></tr>
          <tr>
            <th style={th}>회의일시</th>
            <td style={td}>{fmtDate(doc.doc_date)} {b.startTime && `, ${b.startTime}~${b.endTime}`}</td>
            <th style={{ ...th, width: "18%" }}>회의장소</th>
            <td style={td}>{b.location}</td>
          </tr>
          <tr>
            <th style={th}>참여자 명단</th>
            <td style={td} colSpan={3}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
                {attendees.map((a) => <span key={a}><Sign name={a} /></span>)}
              </div>
            </td>
          </tr>
          <tr>
            <th style={{ ...th, height: 120 }}>회의 내용</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }} colSpan={3}>{b.content}</td>
          </tr>
        </tbody>
      </table>

      {expenses.length > 0 && (
        <table style={{ ...tbl, marginTop: 14 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "20%" }}>항목</th>
              <th style={{ ...th, width: "16%" }}>금액</th>
              <th style={th}>대상자</th>
              <th style={{ ...th, width: "14%" }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={i}>
                <td style={tdC}>{e.item}{e.external ? " (외부)" : ""}</td>
                <td style={tdR}>{fmtMoney(e.amount)}</td>
                <td style={td}>{e.people}</td>
                <td style={tdC}>{e.note}</td>
              </tr>
            ))}
            <tr>
              <th style={th}>총계</th>
              <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(sumItems(expenses))}</td>
              <td style={td} colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      )}
      <p style={{ fontSize: 10.5, color: "#555", marginTop: 6 }}>
        ※ 식비 1인 15,000원 이내(외부인원 참여시 30,000원), 다과비 1인 최대 10,000원, 주류 절대 금지, 22시 이후 결제건 불가
      </p>

      {b.photos?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 12 }}>회의 사진 (회의 장면만 허용, 식당 사진 불가)</p>
          <PhotoGrid urls={b.photos} />
        </div>
      )}
    </>
  );
}

/* ── 서식 116 프로젝트 출장보고서 ── */
function Form116({ doc, b, meta }) {
  const attendees = (b.attendees ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const expenses = b.expenses ?? [];
  return (
    <>
      <Title>프로젝트 출장보고서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "18%" }}>목적</th><td style={td} colSpan={3}>{b.purpose}</td></tr>
          <tr>
            <th style={th}>출장일자</th><td style={td}>{fmtDate(doc.doc_date)}</td>
            <th style={{ ...th, width: "18%" }}>출장지</th><td style={td}>{b.location}</td>
          </tr>
          <tr>
            <th style={th}>출장명단</th>
            <td style={td} colSpan={3}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
                {attendees.map((a) => <span key={a}><Sign name={a} /></span>)}
              </div>
            </td>
          </tr>
          <tr>
            <th style={{ ...th, height: 110 }}>출장 내용</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }} colSpan={3}>{b.content}</td>
          </tr>
        </tbody>
      </table>

      {expenses.length > 0 && (
        <table style={{ ...tbl, marginTop: 14 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "22%" }}>항목</th>
              <th style={{ ...th, width: "16%" }}>금액</th>
              <th style={th}>대상자</th>
              <th style={{ ...th, width: "14%" }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={i}>
                <td style={tdC}>{e.item}</td>
                <td style={tdR}>{fmtMoney(e.amount)}</td>
                <td style={td}>{e.people}</td>
                <td style={tdC}>{e.note}</td>
              </tr>
            ))}
            <tr>
              <th style={th}>총계</th>
              <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(sumItems(expenses))}</td>
              <td style={td} colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      )}

      {b.photos?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 12 }}>관련 사진 — 집행금액에 대한 사진 첨부</p>
          <PhotoGrid urls={b.photos} />
          {b.photoNote && <p style={{ fontSize: 11, marginTop: 4 }}>{b.photoNote}</p>}
        </div>
      )}
      <p style={{ fontSize: 10.5, color: "#555", marginTop: 8 }}>첨부: 유류비산출내역서 (자차 이용 시)</p>
    </>
  );
}

/* ── 강의결과보고서 ── */
function FormLecture({ doc, b, meta }) {
  return (
    <>
      <Title>강의 결과 보고서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "20%" }}>프로젝트명</th><td style={td} colSpan={3}>{meta.projectName}</td></tr>
          <tr><th style={th}>팀명</th><td style={td} colSpan={3}>{meta.teamName}</td></tr>
          <tr>
            <th style={th}>강의일</th><td style={td}>{fmtDate(doc.doc_date)}</td>
            <th style={{ ...th, width: "20%" }}>강의 시간</th><td style={td}>{b.hours}시간</td>
          </tr>
          <tr><th style={th}>강사명</th><td style={td} colSpan={3}>{b.lecturer}</td></tr>
          <tr><th style={th}>강의 주제</th><td style={td} colSpan={3}>{b.topic}</td></tr>
          <tr>
            <th style={{ ...th, height: 140 }}>강의 내용</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }} colSpan={3}>{b.content}</td>
          </tr>
        </tbody>
      </table>
      {b.photos?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 12 }}>강의 사진</p>
          <PhotoGrid urls={b.photos} />
        </div>
      )}
      <p style={{ fontSize: 10.5, color: "#555", marginTop: 8 }}>
        ※ 강사비는 시간당 100,000원 한도(1일 최대 3시간), 강사 명의 계좌이체(원천징수). 현금지급 불가
      </p>
    </>
  );
}

/* ── 서식 20 수행계획서 ── */
function Form20({ doc, b, meta }) {
  const budget = b.budget ?? [];
  const total = budget.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const S = ({ title, children }) => (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 6px" }}>{title}</p>
      {children}
    </div>
  );
  const P = ({ text }) => <p style={{ whiteSpace: "pre-wrap", margin: 0, border: line, padding: "8px 10px", minHeight: 40 }}>{text}</p>;
  return (
    <>
      <Title>일경험 프로젝트 수행 계획서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>제안기업명</th><td style={td}>{b.companyName}</td>
            <th style={{ ...th, width: "22%" }}>담당자 연락처</th><td style={td}>{b.companyContact}</td></tr>
          <tr><th style={th}>프로젝트명</th><td style={td} colSpan={3}>{b.projectName}</td></tr>
          <tr><th style={th}>직무 분야</th><td style={td}>{b.jobField}</td>
            <th style={th}>실행기간</th><td style={td}>{b.period}</td></tr>
          <tr><th style={th}>팀명</th><td style={td}>{meta.teamName}</td>
            <th style={th}>팀 구성</th><td style={td}>팀장 {meta.leaderName}{meta.memberNames?.length ? `, 팀원 ${meta.memberNames.join(", ")}` : ""}</td></tr>
        </tbody>
      </table>

      <S title="1. 프로젝트 개요"><P text={b.intro} /></S>
      <S title="2. 추진 배경 및 필요성"><P text={b.background} /></S>
      <S title="3. 프로젝트 수행방법">
        <p style={{ fontWeight: 700, fontSize: 12, margin: "4px 0" }}>가. 추진 일정</p><P text={b.schedule} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>나. 역할 분담</p><P text={b.roles} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>다. 커뮤니케이션 계획</p><P text={b.communication} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>라. 멘토 선임 및 활용 계획</p><P text={b.mentorPlan} />
      </S>

      <S title="4. 프로젝트 예산 활용 계획">
        <table style={tbl}>
          <thead>
            <tr>
              <th style={{ ...th, width: "14%" }}>항목</th>
              <th style={th}>지출항목</th>
              <th style={th}>세부내역</th>
              <th style={{ ...th, width: "13%" }}>사용시기</th>
              <th style={{ ...th, width: "15%" }}>금액(원)</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((r, i) => (
              <tr key={i}>
                <td style={tdC}>{r.category}</td>
                <td style={td}>{r.item}</td>
                <td style={td}>{r.detail}</td>
                <td style={tdC}>{r.timing}</td>
                <td style={tdR}>{fmtMoney(r.amount)}</td>
              </tr>
            ))}
            <tr>
              <th style={th} colSpan={4}>총 계</th>
              <td style={{ ...tdR, fontWeight: 800 }}>{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 10.5, color: "#555", marginTop: 4 }}>
          ※ 예산 총액: {fmtMoney(meta.budget)}원 (900,000원 × 2개월)
        </p>
      </S>
    </>
  );
}

/* ── 서식 21 결과보고서 ── */
function Form21({ doc, b, meta }) {
  const S = ({ no, title, children }) => (
    <div style={{ marginTop: 14 }}>
      <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 5px" }}>{no} {title}</p>
      {children}
    </div>
  );
  const P = ({ text }) => <p style={{ whiteSpace: "pre-wrap", margin: 0, border: line, padding: "8px 10px", minHeight: 36 }}>{text}</p>;
  return (
    <>
      <div style={{ textAlign: "center", padding: "40px 0 30px" }}>
        <p style={{ fontSize: 16, letterSpacing: 4, margin: 0 }}>미래내일 일경험</p>
        <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, margin: "10px 0" }}>프로젝트형 일경험<br />결과 보고서</p>
        <p style={{ marginTop: 26, fontSize: 14 }}>
          프로젝트명 : {b.projectName}<br />
          팀명 : {meta.teamName} · 참여기업 : {meta.programName}
        </p>
        <p style={{ marginTop: 14, fontSize: 13, color: "#555" }}>{fmtDate(doc.doc_date)} · {meta.orgName}</p>
      </div>

      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>프로젝트명</th><td style={td}>{b.projectName}</td></tr>
          <tr><th style={th}>수행 직무</th><td style={td}>{b.jobField}</td></tr>
        </tbody>
      </table>

      <S no="I." title="프로젝트 개요">
        <p style={{ fontWeight: 700, fontSize: 12, margin: "4px 0" }}>1. 프로젝트 소개</p><P text={b.intro} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>2. 수행 배경 및 필요성</p><P text={b.background} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>3. 프로젝트 특징</p><P text={b.features} />
      </S>
      <S no="II." title="프로젝트 내용">
        <p style={{ fontWeight: 700, fontSize: 12, margin: "4px 0" }}>1. 프로젝트 구성</p><P text={b.composition} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>2. 주요 기능</p><P text={b.mainFunctions} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>3. 주요 기술</p><P text={b.technologies} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>4. 프로젝트 결과물</p><P text={b.resultDesc} />
        <PhotoGrid urls={b.photos} cols={2} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>5. 기대효과</p><P text={b.effects} />
      </S>
      <S no="III." title="프로젝트 수행">
        <p style={{ fontWeight: 700, fontSize: 12, margin: "4px 0" }}>1. 업무분장</p><P text={b.roles} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>2. 수행일정</p><P text={b.schedule} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>3. 프로젝트 도전 및 해결</p><P text={b.challenges} />
      </S>
      <S no="IV." title="배운 점과 피드백">
        <p style={{ fontWeight: 700, fontSize: 12, margin: "4px 0" }}>1. 배우거나 느낀 점</p><P text={b.lessons} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>2. 참여기업 피드백</p><P text={b.companyFeedback} />
        <p style={{ fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>3. 멘토 피드백</p><P text={b.mentorFeedback} />
      </S>
      <S no="V." title="첨부">
        <p style={{ margin: 0, fontSize: 12 }}>1. (서식 113) 프로젝트 실행비 지출 결과서&nbsp;&nbsp;2. 기타 프로젝트 수행 결과 증빙</p>
      </S>
    </>
  );
}

/* ── 멘토 활동 결과 (서식 114-2 회차 기록) ── */
function FormMentoring({ doc, b, meta }) {
  return (
    <>
      <Title>멘토 활동 결과 보고서</Title>
      <table style={tbl}>
        <tbody>
          <tr><th style={{ ...th, width: "24%" }}>프로젝트명</th><td style={td}>{meta.projectName}</td></tr>
          <tr><th style={th}>팀명 및 팀원</th><td style={td}>{meta.teamName} — 팀장 {meta.leaderName}{meta.memberNames?.length ? `, ${meta.memberNames.join(", ")}` : ""}</td></tr>
          <tr>
            <th style={th}>회차 / 일시</th>
            <td style={td}>{doc.session ?? "-"}차 / {fmtDate(doc.doc_date)} {b.startTime && `${b.startTime}~${b.endTime}`}</td>
          </tr>
          <tr><th style={th}>구분 / 장소</th><td style={td}>{b.method ?? ""} {b.location}</td></tr>
          <tr><th style={th}>멘토</th><td style={td}>{b.mentor}{b.mentorOrg ? ` (${b.mentorOrg})` : ""}</td></tr>
          <tr>
            <th style={{ ...th, height: 130 }}>활동 결과</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }}>{b.topic ? `○ ${b.topic}\n` : ""}{b.content}</td>
          </tr>
          <tr>
            <th style={{ ...th, height: 70 }}>멘토 피드백</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }}>{b.feedback}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ textAlign: "right", marginTop: 18 }}>작성일자 : {fmtDate(doc.created_at)}</p>
    </>
  );
}
