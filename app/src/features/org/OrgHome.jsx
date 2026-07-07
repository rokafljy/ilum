import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { DOC_TYPES } from "../../lib/docs.js";
import { fmtDate, fmtMoney, sumItems } from "../../lib/format.js";
import { Badge, Button, Card, CodeChip, CopyButton, EmptyState, Spinner } from "../../components/ui/index.jsx";

const TYPE_ICON = {
  request: "📋", meeting: "📝", mentoring: "🤝", expense_report: "💳",
  inspection: "🔍", business_trip: "🚄", lecture_report: "🎓",
};

/** 기관 홈 대시보드 — KPI·조치필요·팀별 현황·최근 활동 */
export default function OrgHome() {
  const { org, program, programs } = useOrg();
  const settings = program?.settings ?? {};

  const { data, isLoading } = useQuery({
    queryKey: ["org-dash", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const [teamsQ, docsQ, qnaQ] = await Promise.all([
        supabase.from("teams").select("id, name, status").eq("program_id", program.id),
        supabase
          .from("documents")
          .select("id, doc_type, status, title, team_id, body, doc_date, submitted_at, created_at")
          .eq("program_id", program.id)
          .order("created_at", { ascending: false }),
        supabase.from("qna").select("id").eq("program_id", program.id).is("answer", null),
      ]);
      if (teamsQ.error) throw teamsQ.error;
      if (docsQ.error) throw docsQ.error;
      return { teams: teamsQ.data, docs: docsQ.data, unansweredQna: qnaQ.data?.length ?? 0 };
    },
  });

  if (programs.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="🚀"
          title={`${org.name}, 시작해 볼까요?`}
          description="첫 사업을 만들면 팀 모집 참여코드가 발급되고, 운영 준비가 끝납니다."
          action={<Link to="/org/programs"><Button>+ 첫 사업 만들기</Button></Link>}
        />
      </Card>
    );
  }

  if (isLoading || !data) {
    return <div className="py-16 grid place-items-center"><Spinner /></div>;
  }

  const activeTeams = data.teams.filter((t) => t.status === "active");
  const pendingTeams = data.teams.filter((t) => t.status === "pending");
  const submittedDocs = data.docs.filter((d) => d.status === "submitted");
  const budget = settings.teamBudget ?? 0;
  const mentoringTotal = settings.mentoringTotal ?? 8;

  // 팀별 집행·멘토링 집계
  const perTeam = activeTeams.map((t) => {
    const teamDocs = data.docs.filter((d) => d.team_id === t.id);
    const spent = teamDocs
      .filter((d) => d.doc_type === "expense_report" && d.status === "approved")
      .reduce((s, d) => s + sumItems(d.body?.items), 0);
    const mentoring = teamDocs.filter((d) => d.doc_type === "mentoring").length;
    return { ...t, spent, mentoring, rate: budget ? Math.round((spent / budget) * 100) : 0 };
  });
  const totalSpent = perTeam.reduce((s, t) => s + t.spent, 0);
  const totalBudget = budget * activeTeams.length;
  const execRate = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const needsAction = submittedDocs.length + pendingTeams.length + data.unansweredQna;
  const recentDocs = data.docs.slice(0, 8);
  const teamName = (id) => data.teams.find((t) => t.id === id)?.name ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900">{program.name}</h1>
          <p className="mt-0.5 text-sm text-ink-500">사업 운영 현황</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-ink-500">
          참여코드 <CodeChip code={program.join_code} /> <CopyButton text={program.join_code} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[13px] text-ink-500">활동 팀</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">{activeTeams.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[13px] text-ink-500">예산 집행률</div>
          <div className="mt-1 text-2xl font-extrabold text-brand-700">{execRate}%</div>
          <div className="mt-1 text-[11px] text-ink-400">{fmtMoney(totalSpent)} / {fmtMoney(totalBudget)}원</div>
        </Card>
        <Link to="/org/approvals">
          <Card className="p-4 h-full hover:border-brand-300 transition-colors">
            <div className="text-[13px] text-ink-500">승인 대기</div>
            <div className="mt-1 text-2xl font-extrabold text-amber-600">{submittedDocs.length}</div>
          </Card>
        </Link>
        <Link to="/org/comm">
          <Card className="p-4 h-full hover:border-brand-300 transition-colors">
            <div className="text-[13px] text-ink-500">미답변 질문</div>
            <div className="mt-1 text-2xl font-extrabold text-ink-900">{data.unansweredQna}</div>
          </Card>
        </Link>
      </div>

      {/* 조치 필요 */}
      {needsAction > 0 && (
        <Card className="p-5 bg-amber-50 border-amber-200">
          <h2 className="text-sm font-bold text-amber-800">⚡ 조치가 필요해요</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
            {pendingTeams.length > 0 && (
              <li><Link to="/org/teams" className="underline underline-offset-2">팀 등록 승인 대기 {pendingTeams.length}건</Link></li>
            )}
            {submittedDocs.length > 0 && (
              <li><Link to="/org/approvals" className="underline underline-offset-2">문서 검토 대기 {submittedDocs.length}건</Link>
                <span className="text-amber-700/70"> — {submittedDocs.slice(0, 3).map((d) => d.title).join(", ")}{submittedDocs.length > 3 ? " 외" : ""}</span>
              </li>
            )}
            {data.unansweredQna > 0 && (
              <li><Link to="/org/comm" className="underline underline-offset-2">미답변 질문 {data.unansweredQna}건</Link></li>
            )}
          </ul>
        </Card>
      )}

      {/* 팀별 현황 */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-ink-700">팀별 현황</h2>
        {perTeam.length === 0 ? (
          <p className="mt-2 text-sm text-ink-400">활동 중인 팀이 아직 없어요.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {perTeam.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-semibold text-ink-900 truncate">{t.name}</span>
                <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, t.rate)}%` }} />
                </div>
                <span className="w-12 text-right text-[12px] font-bold text-ink-700">{t.rate}%</span>
                <Badge tone={t.mentoring >= mentoringTotal ? "brand" : "neutral"}>
                  🤝 {t.mentoring}/{mentoringTotal}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 최근 활동 */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-ink-700">최근 활동</h2>
        {recentDocs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-400">아직 활동 기록이 없어요.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-50">
            {recentDocs.map((d) => (
              <li key={d.id} className="py-2 flex items-center gap-2.5 text-sm">
                <span>{TYPE_ICON[d.doc_type]}</span>
                <span className="min-w-0 flex-1 truncate text-ink-900">{d.title}</span>
                <span className="text-[12px] text-ink-400 shrink-0">{teamName(d.team_id)} · {fmtDate(d.doc_date ?? d.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
