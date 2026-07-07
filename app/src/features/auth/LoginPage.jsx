import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseReady } from "../../lib/supabase.js";
import { Button, Card, Field, Input, Logo } from "../../components/ui/index.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabaseReady) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>

      <Card className="w-full max-w-sm p-8">
        <h1 className="text-lg font-bold text-ink-900">로그인</h1>
        <p className="mt-1 text-sm text-ink-500">기관 담당자·청년 팀 공용 로그인입니다.</p>

        {!supabaseReady && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800">
            개발 준비 중 — 데이터베이스 연결 대기 상태입니다.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="이메일">
            <Input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="비밀번호">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={busy || !supabaseReady}>
            {busy ? "확인 중…" : "로그인"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-400">
          팀원이신가요? 팀장에게 받은 초대코드로 가입할 수 있어요. (준비 중)
        </p>
      </Card>
    </div>
  );
}
