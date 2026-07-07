import { createContext, useContext } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { signOut, useAuth } from "../auth/AuthProvider.jsx";
import { Button, Card, Logo, Spinner } from "../../components/ui/index.jsx";
import { NotificationsBell } from "./NotificationsBell.jsx";
import { cn } from "../../lib/cn.js";

const TeamCtx = createContext(null);
export const useTeam = () => useContext(TeamCtx);

const NAV = [
  { to: "/team", label: "홈", icon: "🏠", end: true },
  { to: "/team/requests", label: "품의서", icon: "📋" },
  { to: "/team/meetings", label: "회의록", icon: "📝" },
  { to: "/team/expenses", label: "지출", icon: "💳" },
  { to: "/team/mentoring", label: "멘토링", icon: "🤝" },
];

/** 청년 포털 레이아웃 — 하단 탭(모바일) / 상단 탭(데스크톱) */
export default function TeamSpace() {
  const { roles, session } = useAuth();
  const membership = roles?.teams?.[0];
  const teamId = membership?.team_id;

  const { data: team, isLoading, refetch } = useQuery({
    queryKey: ["team-ctx", teamId],
    enabled: Boolean(teamId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, programs(id, name, settings, start_date), companies(name), team_members(role, user_id, profiles(name))")
        .eq("id", teamId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !team) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const program = team.programs;
  const settings = program?.settings ?? {};
  const myRole = membership?.role;
  const isActive = team.status === "active";

  return (
    <TeamCtx.Provider value={{ team, program, settings, myRole, uid: session?.user?.id, refetchTeam: refetch }}>
      <div className="min-h-dvh flex flex-col pb-16 sm:pb-0">
        <header className="border-b border-ink-100 bg-white sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
            <Logo size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink-900 truncate leading-tight">{team.name}</div>
              <div className="text-[11px] text-ink-400 truncate leading-tight">{program?.name}</div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <NotificationsBell team={team} />
              <Button variant="ghost" size="sm" onClick={signOut}>
                로그아웃
              </Button>
            </div>
          </div>
          {/* 데스크톱 탭 */}
          <nav className="max-w-3xl mx-auto px-5 hidden sm:flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                    isActive
                      ? "text-brand-700 border-brand-600"
                      : "text-ink-500 border-transparent hover:text-ink-700"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-6">
          {isActive ? (
            <Outlet />
          ) : (
            <PendingNotice team={team} />
          )}
        </main>

        {/* 모바일 하단 탭 */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink-100 flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-0.5 text-[11px] font-semibold",
                  isActive ? "text-brand-700" : "text-ink-400"
                )
              }
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </TeamCtx.Provider>
  );
}

function PendingNotice({ team }) {
  return (
    <Card className={cn("p-6", team.status === "pending" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200")}>
      {team.status === "pending" ? (
        <p className="text-sm text-amber-800 leading-relaxed">
          ⏳ 팀 등록 신청이 접수됐어요. 운영기관이 승인하면 모든 활동 기능이 열립니다.
          <br />
          <span className="text-amber-700/70">
            팀원 초대코드: <b className="font-mono">{team.invite_code}</b>
          </span>
        </p>
      ) : (
        <p className="text-sm text-red-700">팀 등록이 반려됐어요. 운영기관에 문의해 주세요.</p>
      )}
    </Card>
  );
}
