import { useEffect, useState } from "react";
import { createElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { fmtDate } from "../../lib/format.js";
import {
  Badge, Button, Card, EmptyState, Field, Input, Spinner, Textarea,
} from "../../components/ui/index.jsx";

/* 정부 보고 — 통합지원센터 제출 서식 자동 생성
   서식 126 실시보고(개시 후 5일 이내) · 서식 128 실적보고(실행 종료 후 10일 이내)
   참여자 현황 별첨은 승인된 팀·팀원 데이터로 자동 구성 */

export default function ReportsPage() {
  const { org, program } = useOrg();
  const [busy, setBusy] = useState(null); // '126' | '128'

  // 기관 상용 정보 — 기관별 localStorage 기억 (추후 org 설정으로 이동 가능)
  const storeKey = `ilum-report-info-${org.id}`;
  const [info, setInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey)) ?? {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(info));
  }, [info, storeKey]);
  const set = (k) => (e) => setInfo((f) => ({ ...f, [k]: e.target.value }));

  const { data: teams, isLoading } = useQuery({
    queryKey: ["report-teams", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, status, team_members(role, profiles(name))")
        .eq("program_id", program.id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // 팀별 멘토명 — 수행계획서(서식 20)의 멘토 계획에서 가져오지 않고 멘토 활동 기록에서 최근 멘토 사용
  const { data: mentorDocs } = useQuery({
    queryKey: ["report-mentors", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("team_id, body")
        .eq("program_id", program.id)
        .eq("doc_type", "mentoring")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!program) {
    return <Card><EmptyState title="사업이 없어요" description="사업을 먼저 만들어 주세요." /></Card>;
  }

  const mentorByTeam = {};
  (mentorDocs ?? []).forEach((d) => {
    if (!mentorByTeam[d.team_id] && d.body?.mentor) mentorByTeam[d.team_id] = d.body.mentor;
  });

  function buildData(extra) {
    return {
      orgName: org.name,
      address: info.address ?? "",
      dept: info.dept ?? "",
      phone: info.phone ?? "",
      manager: info.manager ?? "",
      extraManager: info.extraManager ?? "",
      projectName: program.name,
      period:
        program.start_date && program.end_date
          ? `${fmtDate(program.start_date)} ~ ${fmtDate(program.end_date)}`
          : info.period ?? "",
      place: info.place ?? "",
      teams: (teams ?? []).map((t) => ({
        teamName: t.name,
        mentor: mentorByTeam[t.id] ?? "",
        members: [...(t.team_members ?? [])]
          .sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : 0))
          .map((m) => ({ name: m.profiles?.name ?? "", role: m.role })),
      })),
      ...extra,
    };
  }

  async function generate(which) {
    setBusy(which);
    try {
      const [{ elementToPdfBlob, triggerDownload }, { Report126, Report128 }] = await Promise.all([
        import("../../lib/pdf.js"),
        import("../../components/pdf/OrgReports.jsx"),
      ]);
      const data =
        which === "126"
          ? buildData({ planText: info.planText ?? "", evalText: info.evalText ?? "" })
          : buildData({ resultText: info.resultText ?? "" });
      const el = createElement(which === "126" ? Report126 : Report128, { d: data });
      const blob = await elementToPdfBlob(el);
      triggerDownload(blob, `${which === "126" ? "실시보고(서식126)" : "실적보고(서식128)"}_${program.name}.pdf`);
    } catch {
      alert("보고서 생성에 실패했어요.");
    } finally {
      setBusy(null);
    }
  }

  const participantCount = (teams ?? []).reduce((s, t) => s + (t.team_members?.length ?? 0), 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">정부 보고</h1>
      <p className="mt-0.5 text-sm text-ink-500">
        {program.name} — 통합지원센터 제출 서식을 사업 데이터로 자동 생성합니다.
      </p>

      {isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : (
        <>
          <Card className="mt-5 p-5">
            <h2 className="text-sm font-bold text-ink-700">기관·프로그램 정보</h2>
            <p className="mt-0.5 text-[12px] text-ink-400">한 번 입력하면 기억돼요. 보고서 머리말에 들어갑니다.</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <Field label="소재지">
                <Input value={info.address ?? ""} onChange={set("address")} />
              </Field>
              <Field label="담당부서">
                <Input value={info.dept ?? ""} onChange={set("dept")} />
              </Field>
              <Field label="전화번호">
                <Input value={info.phone ?? ""} onChange={set("phone")} />
              </Field>
              <Field label="운영기관 담당관" hint="담당관 1인당 청년 50명 이하 (지침)">
                <Input value={info.manager ?? ""} onChange={set("manager")} />
              </Field>
              <Field label="추가 담당관 (선택)">
                <Input value={info.extraManager ?? ""} onChange={set("extraManager")} />
              </Field>
              <Field label="프로젝트 장소">
                <Input value={info.place ?? ""} onChange={set("place")} />
              </Field>
            </div>
            <p className="mt-3 text-[13px] text-ink-500">
              참여자 현황 별첨: 활동중 {teams?.length ?? 0}팀 · {participantCount}명 자동 포함
              {(info.manager && participantCount > 50) && (
                <Badge tone="warning" className="ml-2">⚠ 담당관 1인당 50명 초과 — 추가 담당관 필요</Badge>
              )}
            </p>
          </Card>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <Card className="p-5 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-900">실시보고</span>
                <Badge tone="neutral">서식 126</Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-500">프로젝트 개시 후 <b>5일 이내</b> 제출 (지침 1-3)</p>
              <Field label="프로젝트 운영계획">
                <Textarea className="min-h-24 mt-2" value={info.planText ?? ""} onChange={set("planText")}
                  placeholder="프로젝트별 운영 계획을 작성하세요" />
              </Field>
              <Field label="평가 계획">
                <Textarea className="min-h-16 mt-2" value={info.evalText ?? ""} onChange={set("evalText")}
                  placeholder="중간점검·결과 평가 계획" />
              </Field>
              <Button className="mt-4" disabled={Boolean(busy)} onClick={() => generate("126")}>
                {busy === "126" ? "생성 중…" : "📄 실시보고 PDF 생성"}
              </Button>
            </Card>

            <Card className="p-5 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-900">실적보고</span>
                <Badge tone="neutral">서식 128</Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-500">실행 종료 후 <b>10일 이내</b> 결과보고와 함께 제출</p>
              <Field label="프로젝트 운영결과">
                <Textarea className="min-h-44 mt-2" value={info.resultText ?? ""} onChange={set("resultText")}
                  placeholder="수료 현황, 운영 실적, 성과 요약 등" />
              </Field>
              <Button className="mt-4" disabled={Boolean(busy)} onClick={() => generate("128")}>
                {busy === "128" ? "생성 중…" : "📄 실적보고 PDF 생성"}
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
