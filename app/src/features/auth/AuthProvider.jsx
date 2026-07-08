import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, supabaseReady } from "../../lib/supabase.js";

/**
 * 인증 컨텍스트
 * roles: { superAdmin: boolean,
 *          orgs:  [{ org_id, role, orgs:{name,status} }],
 *          teams: [{ team_id, role, teams:{name,status,org_id,program_id} }] }
 */
const AuthCtx = createContext({ session: null, roles: null, booting: true, refreshRoles: async () => {} });

async function fetchRoles(session) {
  if (!session) return null;
  const uid = session.user.id;
  const [sa, om, tm] = await Promise.all([
    supabase.from("super_admins").select("user_id").eq("user_id", uid).maybeSingle(),
    supabase.from("org_members").select("org_id, role, orgs(name, status)").eq("user_id", uid),
    supabase
      .from("team_members")
      .select("team_id, role, teams(name, status, org_id, program_id)")
      .eq("user_id", uid),
  ]);
  return {
    superAdmin: Boolean(sa.data),
    orgs: om.data ?? [],
    teams: tm.data ?? [],
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false); // 초기 세션 복원 완료 여부
  const [roles, setRoles] = useState(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady) {
      setSessionReady(true);
      setRolesLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionReady(true); // 복원이 끝나기 전에는 booting 유지 → 새로고침 시 /login 튕김 방지
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    let alive = true;
    (async () => {
      setRolesLoading(true);
      const r = await fetchRoles(session);
      if (alive) {
        setRoles(r);
        setRolesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, sessionReady]);

  const booting = !sessionReady || rolesLoading;

  /** 소속 변경(초대 수락·팀 등록) 직후 호출 — 완료를 기다릴 수 있음 */
  const refreshRoles = useCallback(async () => {
    const r = await fetchRoles(session);
    setRoles(r);
    return r;
  }, [session]);

  return (
    <AuthCtx.Provider value={{ session, roles, booting, refreshRoles }}>{children}</AuthCtx.Provider>
  );
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
