import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { Button, Card, CodeChip, CopyButton, EmptyState } from "../../components/ui/index.jsx";

export default function OrgHome() {
  const { org, program, programs } = useOrg();

  const { data: stats } = useQuery({
    queryKey: ["org-home-stats", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const [teams, pending] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }).eq("program_id", program.id).eq("status", "active"),
        supabase.from("teams").select("id", { count: "exact", head: true }).eq("program_id", program.id).eq("status", "pending"),
      ]);
      return { active: teams.count ?? 0, pending: pending.count ?? 0 };
    },
  });

  if (programs.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="🚀"
          title={`${org.name}, 시작해 볼까요?`}
          description="첫 사업을 만들면 팀 모집 참여코드가 발급되고, 운영 준비가 끝납니다."
          action={
            <Link to="/org/programs">
              <Button>+ 첫 사업 만들기</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">{program?.name}</h1>
      <p className="mt-0.5 text-sm text-ink-500">사업 운영 현황</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-5">
          <div className="text-[13px] text-ink-500">활동중인 팀</div>
          <div className="mt-1 text-2xl font-extrabold text-ink-900">{stats?.active ?? "-"}</div>
        </Card>
        <Link to="/org/teams">
          <Card className="p-5 hover:border-brand-300 transition-colors">
            <div className="text-[13px] text-ink-500">승인 대기</div>
            <div className="mt-1 text-2xl font-extrabold text-amber-600">{stats?.pending ?? "-"}</div>
          </Card>
        </Link>
        <Card className="p-5">
          <div className="text-[13px] text-ink-500">팀 모집 참여코드</div>
          <div className="mt-1.5 flex items-center gap-2">
            <CodeChip code={program?.join_code ?? "-"} />
            {program && <CopyButton text={program.join_code} />}
          </div>
        </Card>
      </div>

      <p className="mt-8 text-sm text-ink-400">
        승인·활동관리·정산 대시보드는 다음 단계(M3~M4)에서 채워집니다.
      </p>
    </div>
  );
}
