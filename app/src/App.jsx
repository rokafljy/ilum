import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import { EmptyState, Logo } from "./components/ui/index.jsx";

/* 공간별 셸 — M1 진행 중 임시 골격. 인증 연결 후 역할 기반 라우팅으로 교체 */
function SpaceStub({ space, description }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-14 border-b border-ink-100 bg-white flex items-center px-5 gap-3">
        <Logo size="sm" />
        <span className="text-sm font-semibold text-ink-500">{space}</span>
      </header>
      <main className="flex-1 grid place-items-center">
        <EmptyState title={`${space} — 개발 진행 중`} description={description} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/console/*"
        element={<SpaceStub space="운영사 콘솔" description="기관 온보딩과 전체 현황을 관리하는 공간입니다." />}
      />
      <Route
        path="/org/*"
        element={<SpaceStub space="기관 포털" description="사업 운영·승인·정산을 관리하는 공간입니다." />}
      />
      <Route
        path="/team/*"
        element={<SpaceStub space="청년 포털" description="팀 활동과 증빙을 기록하는 공간입니다." />}
      />
      <Route
        path="*"
        element={<SpaceStub space="404" description="페이지를 찾을 수 없습니다." />}
      />
    </Routes>
  );
}
