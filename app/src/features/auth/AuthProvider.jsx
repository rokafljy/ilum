import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseReady } from "../../lib/supabase.js";

/**
 * 인증 컨텍스트
 * roles: { superAdmin: boolean,
 *          orgs:  [{ org_id, role, orgs:{name,status} }],
 *          teams: [{ team_id, role, teams:{name,status,org_id,program_id} }] }
 */
const AuthCtx = createContext({ session: null, roles: null, booting: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [roles, setRoles] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!supabaseReady) {
      setBooting(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadRoles() {
      if (!session) {
        if (alive) {
          setRoles(null);
          setBooting(false);
        }
        return;
      }
      const uid = session.user.id;
      const [sa, om, tm] = await Promise.all([
        supabase.from("super_admins").select("user_id").eq("user_id", uid).maybeSingle(),
        supabase.from("org_members").select("org_id, role, orgs(name, status)").eq("user_id", uid),
        supabase
          .from("team_members")
          .select("team_id, role, teams(name, status, org_id, program_id)")
          .eq("user_id", uid),
      ]);
      if (!alive) return;
      setRoles({
        superAdmin: Boolean(sa.data),
        orgs: om.data ?? [],
        teams: tm.data ?? [],
      });
      setBooting(false);
    }
    setBooting(true);
    loadRoles();
    return () => {
      alive = false;
    };
  }, [session]);

  return <AuthCtx.Provider value={{ session, roles, booting }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

/** 역할 기반 홈 경로 — 우선순위: 운영사 > 기관 > 팀 > 무소속 */
export function resolveHome(roles) {
  if (!roles) return "/login";
  if (roles.superAdmin) return "/console";
  if (roles.orgs.length > 0) return "/org";
  if (roles.teams.length > 0) return "/team";
  return "/welcome";
}

export async function signOut() {
  await supabase?.auth.signOut();
}
