import { Button, Card, Logo } from "../components/ui/index.jsx";
import { signOut, useAuth } from "../features/auth/AuthProvider.jsx";

/** 로그인은 했지만 아직 소속(기관/팀)이 없는 사용자 */
export default function Welcome() {
  const { session } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <Logo size="lg" className="mb-8" />
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-3">🌱</div>
        <h1 className="font-bold text-ink-900">아직 소속된 곳이 없어요</h1>
        <p className="mt-2 text-sm text-ink-500 leading-relaxed">
          {session?.user?.email}
          <br />
          팀 초대코드로 참여하거나, 기관 관리자의 초대를 기다려 주세요.
          <br />
          <span className="text-ink-400">(초대코드 가입은 준비 중입니다)</span>
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={signOut}>
          로그아웃
        </Button>
      </Card>
    </div>
  );
}
