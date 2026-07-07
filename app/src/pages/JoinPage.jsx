import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth, signOut } from "../features/auth/AuthProvider.jsx";
import { Button, Card, Field, Input, Logo } from "../components/ui/index.jsx";
import { cn } from "../lib/cn.js";

const REGISTER_ERR = {
  program_not_found: "참여코드가 올바르지 않아요. 기관에서 받은 코드를 확인해 주세요.",
  already_in_program: "이 사업에 이미 소속된 팀이 있어요.",
  invalid_name: "팀 이름을 입력해 주세요.",
};
const JOIN_ERR = {
  team_not_found: "초대코드가 올바르지 않아요. 팀장에게 다시 확인해 주세요.",
};

/** 청년 참여 시작 — 팀 만들기(팀장) / 팀 합류(팀원) */
export default function JoinPage() {
  const { refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("leader"); // leader | member
  const [form, setForm] = useState({ joinCode: "", teamName: "", companyName: "", inviteCode: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const isLeader = mode === "leader";
    const { data, error: err } = isLeader
      ? await supabase.rpc("register_team", {
          p_join_code: form.joinCode,
          p_team_name: form.teamName,
          p_company_name: form.companyName || null,
        })
      : await supabase.rpc("join_team_with_code", { p_code: form.inviteCode });
    setBusy(false);
    if (err || !data?.ok) {
      const table = isLeader ? REGISTER_ERR : JOIN_ERR;
      setError(table[data?.error] ?? "처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    await refreshRoles();
    navigate("/team", { replace: true });
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <Logo size="lg" className="mb-8" />
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-lg font-bold text-ink-900">활동 시작하기</h1>
        <p className="mt-1 text-sm text-ink-500">역할에 맞게 선택해 주세요.</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
          {[
            { key: "leader", label: "팀 만들기 (팀장)" },
            { key: "member", label: "팀 합류 (팀원)" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setMode(t.key);
                setError("");
              }}
              className={cn(
                "h-9 rounded-lg text-[13px] font-semibold transition-colors",
                mode === t.key ? "bg-white shadow-sm text-ink-900" : "text-ink-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "leader" ? (
            <>
              <Field label="사업 참여코드" hint="운영기관에서 받은 8자리 코드">
                <Input
                  value={form.joinCode}
                  onChange={set("joinCode")}
                  placeholder="예: 3F7A2B9C"
                  className="font-mono tracking-widest uppercase"
                  required
                />
              </Field>
              <Field label="팀 이름">
                <Input value={form.teamName} onChange={set("teamName")} placeholder="예: 새싹클럽" required />
              </Field>
              <Field label="참여 기업 (선택)" hint="배정된 기업이 있다면 입력">
                <Input value={form.companyName} onChange={set("companyName")} />
              </Field>
            </>
          ) : (
            <Field label="팀 초대코드" hint="팀장에게 받은 8자리 코드">
              <Input
                value={form.inviteCode}
                onChange={set("inviteCode")}
                placeholder="예: 5D2E8C1A"
                className="font-mono tracking-widest uppercase"
                required
              />
            </Field>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "처리 중…" : mode === "leader" ? "팀 등록 신청" : "팀 합류하기"}
          </Button>
        </form>

        <button onClick={signOut} className="mt-6 w-full text-center text-[13px] text-ink-400 hover:text-ink-700">
          로그아웃
        </button>
      </Card>
    </div>
  );
}
