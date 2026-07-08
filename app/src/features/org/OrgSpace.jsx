import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { signOut, useAuth } from "../auth/AuthProvider.jsx";
import { Badge, Button, Logo, Select, Spinner } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const OrgCtx = createContext(null);
export const useOrg = () => useContext(OrgCtx);

const NAV = [
  { to: "/org", label: "홈", end: true },
  { to: "/org/approvals", label: "승인" },
  { to: "/org/activity", label: "활동" },
  { to: "/org/comm", label: "소통" },
  { to: "/org/teams", label: "팀" },
  { to: "/org/reports", label: "보고" },
  { to: "/org/programs", label: "사업" },
];

export default function OrgSpace() {
  const { roles } = useAuth();
  const membership = roles?.orgs?.[0]; // v1: 사용자당 1개 기관 가정
  // 운영사 열람 모드 — 콘솔에서 선택한 기관을 슈퍼관리자가 들여다봄
  const consoleOrgId = roles?.superAdmin && !membership ? localStorage.getItem("ilum-console-org") : null;

  const { data: consoleOrg, isLoading: consoleOrgLoading } = useQuery({
    queryKey: ["console-view-org", consoleOrgId],
    enabled: Boolean(consoleOrgId),
    queryFn: async () => {
      const { data, error } = await supabase.from("orgs").select("*").eq("id", consoleOrgId).single();
      if (error) throw error;
      return data;
    },
  });

  const org = membership
    ? { id: membership.org_id, role: membership.role, ...membership.orgs }
    : consoleOrg
      ? { ...consoleOrg, role: "admin", consoleView: true }
      : null;

  const { data: programs, isLoading } = useQuery({
    queryKey: ["org-programs", org?.id],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 선택된 사업 (localStorage 기억)
  const [programId, setProgramId] = useState(() => localStorage.getItem("ilum-program") || "");
  useEffect(() => {
    if (programs?.length && !programs.some((p) => p.id === programId)) {
      setProgramId(programs[0].id);
    }
  }, [programs, programId]);
  useEffect(() => {
    if (programId) localStorage.setItem("ilum-program", programId);
  }, [programId]);

  const program = useMemo(
    () => programs?.find((p) => p.id === programId) ?? null,
    [programs, programId]
  );

  if (!org) {
    if (consoleOrgLoading) {
      return (
        <div className="min-h-dvh grid place-items-center"><Spinner className="size-8" /></div>
      );
    }
    return <Navigate to={roles?.superAdmin ? "/console" : "/go"} replace />;
  }

  // 이용 정지된 기관 — 운영사 열람은 허용
  if (org.status === "suspended" && !org.consoleView) {
    return (
      <div className="min-h-dvh grid place-items-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-3">⏸️</div>
          <p className="font-bold text-ink-900">기관 이용이 일시 정지됐어요</p>
          <p className="mt-1 text-sm text-ink-500">운영사에 문의해 주세요.</p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={signOut}>로그아웃</Button>
        </div>
      </div>
    );
  }

  return (
    <OrgCtx.Provider value={{ org, programs: programs ?? [], program, setProgramId }}>
      <div className="min-h-dvh flex flex-col">
        <header className="border-b border-ink-100 bg-white">
          <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-4">
            {org.consoleView ? (
              <Link to="/console" className="text-sm font-semibold text-brand-700 shrink-0">← 콘솔</Link>
            ) : (
              <Logo size="sm" />
            )}
            <span className="text-sm font-semibold text-ink-700 truncate">{org.name}</span>
            {org.consoleView && <Badge tone="info">운영사 열람</Badge>}
            {programs?.length > 0 && (
              <Select
                className="!w-auto !h-8 !text-[13px] !rounded-lg max-w-52"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
              로그아웃
            </Button>
          </div>
          <nav className="max-w-5xl mx-auto px-5 flex gap-1">
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
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
          {isLoading ? (
            <div className="py-16 grid place-items-center">
              <Spinner />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </OrgCtx.Provider>
  );
}
