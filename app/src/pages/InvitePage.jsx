import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { Button, Card, Logo, Spinner } from "../components/ui/index.jsx";

const ERROR_MSG = {
  not_found: "유효하지 않은 초대 링크예요.",
  already_used: "이미 사용된 초대예요.",
  expired: "초대가 만료됐어요. 새 초대를 요청해 주세요.",
};

/** 기관 담당자 초대 수락 — /invite/:token */
export default function InvitePage() {
  const { token } = useParams();
  const { session, booting, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { data: info, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc("get_invite_info", { p_token: token });
      if (err) throw err;
      return data;
    },
  });

  async function accept() {
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("accept_org_invite", { p_token: token });
    setBusy(false);
    if (err || !data?.ok) {
      setError(ERROR_MSG[data?.error] ?? "초대 수락에 실패했어요.");
      return;
    }
    await refreshRoles();
    navigate("/org", { replace: true });
  }

  const here = `/invite/${token}`;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <Card className="w-full max-w-sm p-8 text-center">
        {isLoading || booting ? (
          <div className="py-8 grid place-items-center">
            <Spinner />
          </div>
        ) : !info?.ok ? (
          <>
            <div className="text-4xl mb-3">🙅</div>
            <p className="font-bold text-ink-900">{ERROR_MSG[info?.error] ?? "초대를 확인할 수 없어요."}</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-3">💌</div>
            <h1 className="font-bold text-ink-900">{info.org_name}</h1>
            <p className="mt-2 text-sm text-ink-500 leading-relaxed">
              {info.role === "admin" ? "기관 관리자" : "기관 담당자"}로 초대받았어요.
              {!session && (
                <>
                  <br />
                  수락하려면 먼저 로그인하거나 계정을 만들어 주세요.
                </>
              )}
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 space-y-2">
              {session ? (
                <Button size="lg" className="w-full" disabled={busy} onClick={accept}>
                  {busy ? "수락 중…" : "초대 수락하기"}
                </Button>
              ) : (
                <>
                  <Link to={`/login?next=${encodeURIComponent(here)}`} className="block">
                    <Button size="lg" className="w-full">로그인하고 수락</Button>
                  </Link>
                  <Link to={`/signup?next=${encodeURIComponent(here)}`} className="block">
                    <Button size="lg" variant="secondary" className="w-full">계정 만들고 수락</Button>
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
