import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { signOut, useAuth } from "../auth/AuthProvider.jsx";
import { Button, Logo, Select, Spinner } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const OrgCtx = createContext(null);
export const useOrg = () => useContext(OrgCtx);

const NAV = [
  { to: "/org", label: "홈", end: true },
  { to: "/org/teams", label: "팀" },
  { to: "/org/programs", label: "사업" },
];

export default function OrgSpace() {
  const { roles } = useAuth();
  const membership = roles?.orgs?.[0]; // v1: 사용자당 1개 기관 가정
  const org = membership ? { id: membership.org_id, role: membership.role, ...membership.orgs } : null;

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

  if (!org) return null;

  return (
    <OrgCtx.Provider value={{ org, programs: programs ?? [], program, setProgramId }}>
      <div className="min-h-dvh flex flex-col">
        <header className="border-b border-ink-100 bg-white">
          <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-4">
            <Logo size="sm" />
            <span className="text-sm font-semibold text-ink-700 truncate">{org.name}</span>
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
