import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { signOut, useAuth } from "../auth/AuthProvider.jsx";
import {
  Badge, Button, Card, CodeChip, CopyButton, Logo, Spinner,
} from "../../components/ui/index.jsx";

/** 청년 포털 — M2 시점: 팀 홈(상태·팀원·초대코드). 활동 기능은 M3에서 채움 */
export default function TeamSpace() {
  const { roles } = useAuth();
  const membership = roles?.teams?.[0];
  const teamId = membership?.team_id;

  const { data: team, isLoading } = useQuery({
    queryKey: ["team-home", teamId],
    enabled: Boolean(teamId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, programs(name, settings), companies(name), team_members(role, profiles(name))")
        .eq("id", teamId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-14 border-b border-ink-100 bg-white flex items-center px-5 gap-3">
        <Logo size="sm" />
        <span className="text-sm font-semibold text-ink-500">청년 포털</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
          로그아웃
        </Button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        {isLoading || !team ? (
          <div className="py-16 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-ink-900">{team.name}</h1>
              <Badge tone={team.status === "active" ? "brand" : team.status === "pending" ? "warning" : "danger"}>
                {team.status === "active" ? "활동중" : team.status === "pending" ? "승인 대기" : "반려됨"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-ink-500">
              {team.programs?.name}
              {team.companies?.name && ` · ${team.companies.name}`}
            </p>

            {team.status === "pending" && (
              <Card className="mt-6 p-5 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800 leading-relaxed">
                  ⏳ 팀 등록 신청이 접수됐어요. 운영기관이 승인하면 활동을 시작할 수 있습니다.
                </p>
              </Card>
            )}
            {team.status === "rejected" && (
              <Card className="mt-6 p-5 bg-red-50 border-red-200">
                <p className="text-sm text-red-700 leading-relaxed">
                  팀 등록이 반려됐어요. 운영기관에 문의해 주세요.
                </p>
              </Card>
            )}

            <Card className="mt-6 p-5">
              <h2 className="text-sm font-bold text-ink-700">팀원 초대</h2>
              <p className="mt-1 text-[13px] text-ink-500">
                팀원에게 아래 초대코드를 공유하세요. 회원가입 후 "팀 합류"에서 입력하면 됩니다.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <CodeChip code={team.invite_code} />
                <CopyButton text={team.invite_code} />
              </div>
            </Card>

            <Card className="mt-4 p-5">
              <h2 className="text-sm font-bold text-ink-700">팀원 {team.team_members?.length ?? 0}명</h2>
              <ul className="mt-2 space-y-1.5">
                {team.team_members?.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-ink-900">
                    <span className="size-7 rounded-full bg-ink-100 grid place-items-center text-[12px] font-bold text-ink-500">
                      {(m.profiles?.name || "?").slice(0, 1)}
                    </span>
                    {m.profiles?.name || "이름 미입력"}
                    {m.role === "leader" && <Badge tone="brand">팀장</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            {team.status === "active" && (
              <p className="mt-8 text-sm text-ink-400 text-center">
                활동 기록(회의록·품의서·지출결과서)은 다음 업데이트에서 열립니다.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
