import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Welcome from "./pages/Welcome.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";
import JoinPage from "./pages/JoinPage.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import ConsolePage from "./features/console/ConsolePage.jsx";
import OrgSpace from "./features/org/OrgSpace.jsx";
import OrgHome from "./features/org/OrgHome.jsx";
import ProgramsPage from "./features/org/ProgramsPage.jsx";
import TeamsPage from "./features/org/TeamsPage.jsx";
import ApprovalsPage from "./features/org/ApprovalsPage.jsx";
import ActivityPage from "./features/org/ActivityPage.jsx";
import CommPage from "./features/org/CommPage.jsx";
import QnaPage from "./features/team/QnaPage.jsx";
import SchedulePage from "./features/team/SchedulePage.jsx";
import TeamSpace from "./features/team/TeamSpace.jsx";
import TeamHome from "./features/team/TeamHome.jsx";
import RequestsPage from "./features/team/RequestsPage.jsx";
import MeetingsPage from "./features/team/MeetingsPage.jsx";
import MentoringPage from "./features/team/MentoringPage.jsx";
import ExpenseReportsPage from "./features/team/ExpenseReportsPage.jsx";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";
import { RequireAuth, RequireSpace, RoleRedirect } from "./features/auth/guards.jsx";
import { EmptyState } from "./components/ui/index.jsx";

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
