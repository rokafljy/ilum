/**
 * 운영기관 → 통합지원센터 보고 서식 렌더러 (PDF 캡처용)
 * 서식 126 「프로젝트형 일경험 실시보고」 · 서식 128 「프로젝트형 일경험 실적보고」 + 별첨 참여자 현황
 * data: { orgName, address, dept, phone, manager, extraManager, projectName(프로그램명),
 *         period, place, planText/resultText, evalText, teams: [{teamName, mentor, members:[{name, role}]}] }
 */
const line = "1px solid #111";
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = { border: line, background: "#f1f3f5", padding: "7px 9px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" };
const td = { border: line, padding: "7px 9px", verticalAlign: "top" };
const tdC = { ...td, textAlign: "center" };
const page = {
  width: 794, padding: "52px 56px", background: "#fff", color: "#111",
  fontFamily: "'Pretendard Variable', Pretendard, sans-serif", fontSize: 13, lineHeight: 1.5,
};

function Title({ children }) {
  return <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, letterSpacing: 5, margin: "0 0 24px" }}>{children}</h1>;
}

function OrgInfoTable({ d }) {
  return (
    <table style={tbl}>
      <tbody>
        <tr><th style={{ ...th, width: "22%" }}>운영기관명</th><td style={td} colSpan={3}>{d.orgName}</td></tr>
        <tr><th style={th}>소재지</th><td style={td} colSpan={3}>{d.address}</td></tr>
        <tr>
          <th style={th}>담당부서</th><td style={td}>{d.dept}</td>
          <th style={{ ...th, width: "20%" }}>전화번호</th><td style={td}>{d.phone}</td>
        </tr>
        <tr>
          <th style={th}>운영기관 담당관</th><td style={td}>{d.manager}</td>
          <th style={th}>추가 담당관</th><td style={td}>{d.extraManager}</td>
        </tr>
      </tbody>
    </table>
  );
}

function DateAndFooter({ orgName }) {
  const now = new Date();
  return (
    <>
      <p style={{ textAlign: "center", marginTop: 30, fontSize: 14 }}>
        {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
      </p>
      <p style={{ textAlign: "center", marginTop: 8, fontWeight: 700 }}>{orgName}</p>
      <p style={{ textAlign: "left", marginTop: 26, fontSize: 15, fontWeight: 700 }}>일경험 통합지원센터장 귀하</p>
    </>
  );
}

/** 서식 126 실시보고 */
export function Report126({ d }) {
  return (
    <div style={page}>
      <Title>프로젝트형 일경험 실시보고</Title>
      <OrgInfoTable d={d} />
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        * 담당관은 1인당 청년 참여인원 50명 이하로 제한(2회 이상 면담 실시)
      </p>
      <table style={{ ...tbl, marginTop: 14 }}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>프로그램명</th><td style={td}>{d.projectName}</td></tr>
          <tr>
            <th style={th}>프로젝트 운영계획</th>
            <td style={{ ...td, whiteSpace: "pre-wrap", minHeight: 140 }}>{d.planText}</td>
          </tr>
          <tr><th style={th}>프로젝트 기간</th><td style={td}>{d.period}</td></tr>
          <tr><th style={th}>프로젝트 장소</th><td style={td}>{d.place}</td></tr>
          <tr>
            <th style={th}>평가 계획</th>
            <td style={{ ...td, whiteSpace: "pre-wrap" }}>{d.evalText}</td>
          </tr>
          <tr>
            <th style={th}>첨부</th>
            <td style={td}>1. [별첨] 프로젝트 참여자 현황{"\n"}2. [서식 111] 프로젝트 제안서 각 1부</td>
          </tr>
        </tbody>
      </table>
      <p style={{ textAlign: "center", marginTop: 26 }}>
        위와 같이 『청년 일경험 지원사업(프로젝트형 일경험)』의 실시현황을 통보합니다.
      </p>
      <DateAndFooter orgName={d.orgName} />
      <ParticipantsAppendix teams={d.teams} />
    </div>
  );
}

/** 서식 128 실적보고 */
export function Report128({ d }) {
  return (
    <div style={page}>
      <Title>프로젝트형 일경험 실적보고</Title>
      <OrgInfoTable d={d} />
      <table style={{ ...tbl, marginTop: 14 }}>
        <tbody>
          <tr><th style={{ ...th, width: "22%" }}>프로젝트명</th><td style={td}>{d.projectName}</td></tr>
          <tr>
            <th style={th}>프로젝트 운영결과</th>
            <td style={{ ...td, whiteSpace: "pre-wrap", minHeight: 180 }}>{d.resultText}</td>
          </tr>
          <tr><th style={th}>프로젝트 기간</th><td style={td}>{d.period}</td></tr>
          <tr><th style={th}>프로젝트 장소</th><td style={td}>{d.place}</td></tr>
        </tbody>
      </table>
      <p style={{ textAlign: "center", marginTop: 26 }}>
        위와 같이 『청년 일경험 지원사업(프로젝트형 일경험)』의 실적을 통보합니다.
      </p>
      <DateAndFooter orgName={d.orgName} />
      <ParticipantsAppendix teams={d.teams} />
    </div>
  );
}

/** [별첨] 프로젝트 참여자 현황 */
function ParticipantsAppendix({ teams = [] }) {
  const rows = [];
  teams.forEach((t) => {
    t.members.forEach((m, i) => {
      rows.push({ team: i === 0 ? t.teamName : "", mentor: i === 0 ? t.mentor : "", name: m.name, role: m.role });
    });
  });
  return (
    <div style={{ marginTop: 40, pageBreakBefore: "always" }}>
      <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>[별첨] 프로젝트 참여자 현황</p>
      <table style={tbl}>
        <thead>
          <tr>
            <th style={{ ...th, width: "9%" }}>순번</th>
            <th style={th}>팀명</th>
            <th style={th}>선임 멘토</th>
            <th style={th}>이름</th>
            <th style={{ ...th, width: "14%" }}>구분</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={tdC}>{i + 1}</td>
              <td style={tdC}>{r.team}</td>
              <td style={tdC}>{r.mentor}</td>
              <td style={tdC}>{r.name}</td>
              <td style={tdC}>{r.role === "leader" ? "팀장" : "팀원"}</td>
            </tr>
          ))}
          <tr>
            <th style={th} colSpan={4}>합계</th>
            <td style={tdC}>{rows.length}명</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
