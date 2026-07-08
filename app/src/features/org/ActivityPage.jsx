import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { DOC_TYPES, DOC_STATUS, listDocs } from "../../lib/docs.js";
import { fmtDate } from "../../lib/format.js";
import { DocDetail } from "../../components/DocDetail.jsx";
import { Badge, Button, Card, EmptyState, Modal, Select, Spinner } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

/** PDF 메타 — 서식 서명란·잔액 계산에 필요한 전체 정보 */
export async function buildMeta(teamId, org, program) {
  const [{ data: team }, { data: expenseDocs }, { data: planDoc }] = await Promise.all([
    supabase
      .from("teams")
      .select("name, team_members(role, profiles(name))")
      .eq("id", teamId)
      .single(),
    supabase
      .from("documents")
      .select("body")
      .eq("team_id", teamId)
      .eq("doc_type", "expense_report")
      .eq("status", "approved"),
    supabase
      .from("documents")
      .select("body")
      .eq("team_id", teamId)
      .eq("doc_type", "plan")
      .limit(1)
      .maybeSingle(),
  ]);
  const leader = team?.team_members?.find((m) => m.role === "leader");
  const members = (team?.team_members ?? [])
    .filter((m) => m.role !== "leader")
    .map((m) => m.profiles?.name)
    .filter(Boolean);
  const spent = (expenseDocs ?? []).reduce(
    (s, d) => s + (d.body?.items ?? []).reduce((a, it) => a + (Number(it.amount) || 0), 0),
    0
  );
  return {
    orgName: org.name,
    programName: program.name,
    projectName: planDoc?.body?.projectName || program.name,
    teamName: team?.name ?? "",
    leaderName: leader?.profiles?.name ?? "",
    memberNames: members,
    mentorName: planDoc?.body?.mentorName || "",
    checkerName: org.checker_name || org.name,
    budget: program.settings?.teamBudget ?? 1_800_000,
    spent,
  };
}

const TABS = [
  { key: "plan", label: "수행계획" },
  { key: "request", label: "품의서" },
  { key: "meeting", label: "회의록" },
  { key: "expense_report", label: "지출" },
  { key: "mentoring", label: "멘토링" },
  { key: "final_report", label: "결과보고" },
];

/** 활동 관리 — 사업 전체 문서 조회 (팀·유형 필터) */
export default function ActivityPage() {
  const { org, program } = useOrg();
  const [tab, setTab] = useState("meeting");
  const [teamFilter, setTeamFilter] = useState("");
  const [viewing, setViewing] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);

  async function downloadPdf(doc) {
    setPdfBusy(true);
    try {
      const { saveDocPdf } = await import("../../lib/pdf.js"); // PDF 스택은 필요할 때만 로드
      const meta = await buildMeta(doc.team_id, org, program);
      await saveDocPdf(doc, meta);
    } catch {
      alert("PDF 생성에 실패했어요.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function downloadTeamZip() {
    setZipProgress("준비 중…");
    try {
      const all = await listDocs({ teamId: teamFilter });
      // 멘토링 일지는 승인 절차가 없어 draft 상태 그대로 포함
      const targets = all.filter((d) => d.doc_type === "mentoring" || d.status !== "draft");
      if (!targets.length) return alert("다운로드할 문서가 없어요.");
      const { saveTeamZip } = await import("../../lib/pdf.js");
      const meta = await buildMeta(teamFilter, org, program);
      await saveTeamZip(targets, meta, (i, n) => setZipProgress(`${i}/${n} 생성 중…`));
    } catch {
      alert("일괄 PDF 생성에 실패했어요.");
    } finally {
      setZipProgress(null);
    }
  }

  const { data: teams } = useQuery({
    queryKey: ["org-team-options", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams").select("id, name").eq("program_id", program.id).eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["org-activity", program?.id, tab, teamFilter],
    enabled: Boolean(program),
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("*, teams(name)")
        .eq("program_id", program.id)
        .eq("doc_type", tab)
        .neq("status", "draft")
        .order("doc_date", { ascending: false });
      if (tab === "mentoring") q = supabase
        .from("documents")
        .select("*, teams(name)")
        .eq("program_id", program.id)
        .eq("doc_type", tab)
        .order("doc_date", { ascending: false });
      if (teamFilter) q = q.eq("team_id", teamFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  if (!program) {
    return <Card><EmptyState title="사업이 없어요" description="사업을 먼저 만들어 주세요." /></Card>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">활동 관리</h1>
      <p className="mt-0.5 text-sm text-ink-500">{program.name} — 팀 활동 기록을 조회합니다.</p>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "h-8 px-3 rounded-lg text-[13px] font-semibold transition-colors",
                tab === t.key ? "bg-white shadow-sm text-ink-900" : "text-ink-500"
              )}>
              {t.label}
            </button>
          ))}
        </div>
        <Select className="!w-auto !h-9 !text-[13px]" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="">전체 팀</option>
          {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        {teamFilter && (
          <Button variant="secondary" size="sm" disabled={Boolean(zipProgress)} onClick={downloadTeamZip}>
            {zipProgress ?? "📦 팀 서류 일괄 PDF"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState icon="🗂️" title="기록이 없어요" description="팀이 활동을 기록하면 여기에 쌓입니다." />
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {docs.map((d) => {
            const st = DOC_STATUS[d.status];
            return (
              <Card key={d.id} className="p-4 flex items-center gap-3 cursor-pointer hover:border-brand-300 transition-colors"
                onClick={() => setViewing(d)}>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] text-ink-900 truncate">{d.title}</div>
                  <p className="text-[13px] text-ink-500">{d.teams?.name} · {fmtDate(d.doc_date)}</p>
                </div>
                {tab !== "mentoring" && <Badge tone={st.tone}>{st.label}</Badge>}
              </Card>
            );
          })}
        </div>
      )}

      {viewing && (
        <Modal
          open onClose={() => setViewing(null)}
          title={`${viewing.teams?.name} — ${viewing.title}`}
          footer={
            <Button variant="secondary" disabled={pdfBusy} onClick={() => downloadPdf(viewing)}>
              {pdfBusy ? "생성 중…" : "📄 PDF 저장"}
            </Button>
          }
        >
          <DocDetail doc={viewing} />
        </Modal>
      )}
    </div>
  );
}
