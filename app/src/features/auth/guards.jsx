import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "../../components/ui/index.jsx";
import { resolveHome, useAuth } from "./AuthProvider.jsx";

function FullScreenLoading() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

/** 로그인 필수 */
export function RequireAuth({ children }) {
  const { session, booting } = useAuth();
  const location = useLocation();
  if (booting) return <FullScreenLoading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** 공간별 접근 제어 — 권한 없으면 자기 홈으로 */
export function RequireSpace({ space, children }) {
  const { roles, booting } = useAuth();
  if (booting) return <FullScreenLoading />;
  const allowed =
    space === "console"
      ? roles?.superAdmin
      : space === "org"
        ? roles?.superAdmin || roles?.orgs.length > 0
        : space === "team"
          ? roles?.teams.length > 0
          : false;
  if (!allowed) return <Navigate to={resolveHome(roles)} replace />;
  return children;
}

/** 로그인 직후·루트 진입 시 역할에 맞는 홈으로 보내는 라우트 */
export function RoleRedirect() {
  const { session, roles, booting } = useAuth();
  if (booting) return <FullScreenLoading />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={resolveHome(roles)} replace />;
}
