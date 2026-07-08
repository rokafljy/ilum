import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";
import { RequireAuth, RequireSpace, RoleRedirect } from "./features/auth/guards.jsx";
import { EmptyState, Spinner } from "./components/ui/index.jsx";

/* 공간별 코드 분할 — 첫 로드는 랜딩·로그인만 */
const Welcome = lazy(() => import("./pages/Welcome.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const InvitePage = lazy(() => import("./pages/InvitePage.jsx"));
const JoinPage = lazy(() => import("./pages/JoinPage.jsx"));
const ConsolePage = lazy(() => import("./features/console/ConsolePage.jsx"));
const OrgSpace = lazy(() => import("./features/org/OrgSpace.jsx"));
const OrgHome = lazy(() => import("./features/org/OrgHome.jsx"));
const ProgramsPage = lazy(() => import("./features/org/ProgramsPage.jsx"));
const TeamsPage = lazy(() => import("./features/org/TeamsPage.jsx"));
const ApprovalsPage = lazy(() => import("./features/org/ApprovalsPage.jsx"));
const ActivityPage = lazy(() => import("./features/org/ActivityPage.jsx"));
const CommPage = lazy(() => import("./features/org/CommPage.jsx"));
const GovReportsPage = lazy(() => import("./features/org/GovReportsPage.jsx"));
const TeamSpace = lazy(() => import("./features/team/TeamSpace.jsx"));
const TeamHome = lazy(() => import("./features/team/TeamHome.jsx"));
const RequestsPage = lazy(() => import("./features/team/RequestsPage.jsx"));
const MeetingsPage = lazy(() => import("./features/team/MeetingsPage.jsx"));
const MentoringPage = lazy(() => import("./features/team/MentoringPage.jsx"));
const ExpenseReportsPage = lazy(() => import("./features/team/ExpenseReportsPage.jsx"));
const QnaPage = lazy(() => import("./features/team/QnaPage.jsx"));
const SchedulePage = lazy(() => import("./features/team/SchedulePage.jsx"));
const ProjectDocsPage = lazy(() => import("./features/team/ProjectDocsPage.jsx"));

function PageLoading() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/go" element={<RoleRedirect />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route
          path="/welcome"
          element={
            <RequireAuth>
              <Welcome />
            </RequireAuth>
          }
        />
        <Route
          path="/join"
          element={
            <RequireAuth>
              <JoinPage />
            </RequireAuth>
          }
        />

        <Route
          path="/console/*"
          element={
            <RequireAuth>
              <RequireSpace space="console">
                <ConsolePage />
              </RequireSpace>
            </RequireAuth>
          }
        />

        <Route
          path="/org"
          element={
            <RequireAuth>
              <RequireSpace space="org">
                <OrgSpace />
              </RequireSpace>
            </RequireAuth>
          }
        >
          <Route index element={<OrgHome />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="comm" element={<CommPage />} />
          <Route path="reports" element={<GovReportsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="programs" element={<ProgramsPage />} />
        </Route>

        <Route
          path="/team"
          element={
            <RequireAuth>
              <RequireSpace space="team">
                <TeamSpace />
              </RequireSpace>
            </RequireAuth>
          }
        >
          <Route index element={<TeamHome />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="expenses" element={<ExpenseReportsPage />} />
          <Route path="mentoring" element={<MentoringPage />} />
          <Route path="qna" element={<QnaPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="project" element={<ProjectDocsPage />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="min-h-dvh grid place-items-center">
              <EmptyState icon="🧭" title="404" description="페이지를 찾을 수 없습니다." />
            </div>
          }
        />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}
