import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { DOC_TYPES, DOC_STATUS } from "../../lib/docs.js";
import { fmtDate } from "../../lib/format.js";
import { DocDetail } from "../../components/DocDetail.jsx";
import { Badge, Card, EmptyState, Modal, Select, Spinner } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const TABS = [
  { key: "meeting", label: "회의록" },
  { key: "mentoring", label: "멘토링" },
  { key: "expense_report", label: "지출" },
  { key: "request", label: "품의서" },
];

/** 활동 관리 — 사업 전체 문서 조회 (팀·유형 필터) */
export default function ActivityPage() {
  const { program } = useOrg();
  const [tab, setTab] = useState("meeting");
  const [teamFilter, setTeamFilter] = useState("");
  const [viewing, setViewing] = useState(null);

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
        <Modal open onClose={() => setViewing(null)} title={`${viewing.teams?.name} — ${viewing.title}`}>
          <DocDetail doc={viewing} />
        </Modal>
      )}
    </div>
  );
}
