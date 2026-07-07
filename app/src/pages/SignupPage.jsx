import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase, supabaseReady } from "../lib/supabase.js";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { Button, Card, Field, Input, Logo } from "../components/ui/index.jsx";

export default function SignupPage() {
  const { session, booting } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next") || "/go";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needConfirm, setNeedConfirm] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!booting && session) return <Navigate to={next} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("already registered")
          ? "이미 가입된 이메일이에요. 로그인해 주세요."
          : "가입에 실패했어요. 입력 내용을 확인해 주세요."
      );
      return;
    }
    if (!data.session) setNeedConfirm(true); // 이메일 인증이 켜져 있는 경우
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <Card className="w-full max-w-sm p-8">
        {needConfirm ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📮</div>
            <h1 className="font-bold text-ink-900">인증 메일을 보냈어요</h1>
            <p className="mt-2 text-sm text-ink-500 leading-relaxed">
              {form.email} 으로 보낸 메일의 링크를 눌러 가입을 완료해 주세요.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-ink-900">회원가입</h1>
            <p className="mt-1 text-sm text-ink-500">청년 팀원·팀장용 계정을 만듭니다.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field label="이름" hint="실명을 입력해 주세요 — 서류·증빙에 사용됩니다">
                <Input value={form.name} onChange={set("name")} required autoFocus />
              </Field>
              <Field label="이메일">
                <Input type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
              </Field>
              <Field label="비밀번호" hint="8자 이상">
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={set("password")}
                  required
                />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy || !supabaseReady}>
                {busy ? "가입 중…" : "가입하기"}
              </Button>
            </form>
            <p className="mt-6 text-center text-[13px] text-ink-400">
              이미 계정이 있나요?{" "}
              <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-brand-700 font-semibold">
                로그인
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
