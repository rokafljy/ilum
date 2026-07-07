import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "./TeamSpace.jsx";
import { listDocs } from "../../lib/docs.js";
import { fmtMoney, sumItems } from "../../lib/format.js";
import { Badge, Card, CodeChip, CopyButton } from "../../components/ui/index.jsx";

/** 팀 홈 — 공지·예산 현황·멘토링 진도·바로가기 */
export default function TeamHome() {
  const { team, settings } = useTeam();
  const budget = settings.teamBudget ?? 0;
  const mentoringTotal = settings.mentoringTotal ?? 8;

  const { data: docs } = useQuery({
    queryKey: ["team-home-docs", team.id],
    queryFn: () => listDocs({ teamId: team.id }),
  });

  const { data: notices } = useQuery({
    queryKey: ["team-notices", team.program_id],
    queryFn: async () => {
      const { supabase } = await import("../../lib/supabase.js");
      const { data, error } = await supabase
        .from("notices").select("*").eq("program_id", team.program_id).eq("active", true)
        .order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
  });

  const approvedExpense = (docs ?? [])
    .filter((d) => d.doc_type === "expense_report" && d.status === "approved")
    .reduce((s, d) => s + sumItems(d.body?.items), 0);
  const mentoringDone = (docs ?? []).filter((d) => d.doc_type === "mentoring").length;
  const pendingCount = (docs ?? []).filter((d) => d.status === "submitted").length;
  const rejected = (docs ?? []).filter((d) => d.status === "rejected");
  const usedRate = budget ? Math.min(100, Math.round((approvedExpense / budget) * 100)) : 0;

  return (
    <div className="space-y-4">
      {notices?.map((n) => (
        <Card key={n.id} className={n.priority === "important" ? "p-4 bg-red-50 border-red-200" : "p-4 bg-brand-50 border-brand-200"}>
          <p className="text-[13px] leading-relaxed text-ink-900">
            <span className="font-bold">{n.priority === "important" ? "📢 중요 공지" : "📢 공지"}</span>{" "}
            {n.content}
          </p>
        </Card>
      ))}
      {rejected.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-[13px] font-semibold text-red-700">
            반려된 문서가 {rejected.length}건 있어요 — 사유를 확인하고 수정해 주세요.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink-700">팀 활동비</h2>
          <span className="text-[13px] text-ink-400">승인 완료 기준</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-ink-900">{fmtMoney(budget - approvedExpense)}원</span>
          <span className="text-[13px] text-ink-400">남음 / {fmtMoney(budget)}원</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-ink-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${usedRate}%` }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-400">집행률 {usedRate}%</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/team/mentoring">
          <Card className="p-4 h-full hover:border-brand-300 transition-colors">
            <div className="text-[13px] text-ink-500">멘토링</div>
            <div className="mt-1 text-xl font-extrabold text-ink-900">
              {mentoringDone}
              <span className="text-sm font-semibold text-ink-400"> / {mentoringTotal}회</span>
            </div>
          </Card>
        </Link>
        <Card className="p-4">
          <div className="text-[13px] text-ink-500">승인 대기</div>
          <div className="mt-1 text-xl font-extrabold text-amber-600">{pendingCount}건</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/team/qna">
          <Card className="p-4 hover:border-brand-300 transition-colors flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="text-sm font-bold text-ink-900">Q&A</span>
          </Card>
        </Link>
        <Link to="/team/schedule">
          <Card className="p-4 hover:border-brand-300 transition-colors flex items-center gap-2">
            <span className="text-xl">📅</span>
            <span className="text-sm font-bold text-ink-900">일정</span>
          </Card>
        </Link>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold text-ink-700">팀원 초대</h2>
        <div className="mt-2 flex items-center gap-2">
          <CodeChip code={team.invite_code} />
          <CopyButton text={team.invite_code} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {team.team_members?.map((m, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 text-[13px] text-ink-700">
              <span className="size-6 rounded-full bg-ink-100 grid place-items-center text-[11px] font-bold text-ink-500">
                {(m.profiles?.name || "?").slice(0, 1)}
              </span>
              {m.profiles?.name || "이름 미입력"}
              {m.role === "leader" && <Badge tone="brand">팀장</Badge>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
