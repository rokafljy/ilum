import { Link } from "react-router-dom";
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
          청년 참가자라면 기관·팀장에게 받은 코드로 시작하세요.
          <br />
          기관 담당자는 초대 링크를 통해 합류할 수 있어요.
        </p>
        <Link to="/join" className="block mt-6">
          <Button className="w-full">코드로 활동 시작하기</Button>
        </Link>
        <Button variant="secondary" className="mt-2 w-full" onClick={signOut}>
          로그아웃
        </Button>
      </Card>
    </div>
  );
}
