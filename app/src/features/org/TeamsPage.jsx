import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrg } from "./OrgSpace.jsx";
import {
  Badge, Button, Card, CodeChip, EmptyState, Modal, Spinner,
} from "../../components/ui/index.jsx";

const STATUS = {
  pending: { label: "승인 대기", tone: "warning" },
  active: { label: "활동중", tone: "brand" },
  rejected: { label: "반려", tone: "danger" },
  removed: { label: "제외", tone: "neutral" },
};

export default function TeamsPage() {
  const { session } = useAuth();
  const { org, program } = useOrg();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["org-teams", program?.id],
    enabled: Boolean(program),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, companies(name), team_members(user_id, role, profiles(name))")
        .eq("program_id", program.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ teamId, status }) => {
      const { error } = await supabase.from("teams").update({ status }).eq("id", teamId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        org_id: org.id,
        actor_id: session.user.id,
        action: `team.${status === "active" ? "approve" : "reject"}`,
        target_type: "team",
        target_id: teamId,
      });
    },
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["org-teams", program?.id] });
    },
  });

  if (!program) {
    return (
      <Card>
        <EmptyState
          title="사업이 없어요"
          description="사업 탭에서 먼저 사업을 만들어 주세요. 팀은 사업 단위로 모집됩니다."
        />
      </Card>
    );
  }

  const pending = teams?.filter((t) => t.status === "pending") ?? [];
  const rest = teams?.filter((t) => t.status !== "pending") ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">팀 관리</h1>
      <p className="mt-0.5 text-sm text-ink-500">
        {program.name} — 참여코드 <CodeChip code={program.join_code} /> 로 등록한 팀을 승인하세요.
      </p>

      {isLoading && (
        <div className="py-16 grid place-items-center">
          <Spinner />
        </div>
      )}

      {teams?.length === 0 && (
        <Card className="mt-6">
          <EmptyState
            title="아직 등록된 팀이 없어요"
            description={`팀장에게 참여코드 [${program.join_code}]를 공유하면, 팀 등록 신청이 여기에 표시됩니다.`}
          />
        </Card>
      )}

      {pending.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-amber-700">승인 대기 {pending.length}팀</h2>
          <div className="mt-2 space-y-3">
            {pending.map((t) => (
              <TeamCard key={t.id} team={t}>
                <Button
                  size="sm"
                  disabled={busyId === t.id}
                  onClick={() => {
                    setBusyId(t.id);
                    setStatus.mutate({ teamId: t.id, status: "active" });
                  }}
                >
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busyId === t.id}
                  onClick={() => {
                    setBusyId(t.id);
                    setStatus.mutate({ teamId: t.id, status: "rejected" });
                  }}
                >
                  반려
                </Button>
              </TeamCard>
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-ink-500">전체 팀</h2>
          <div className="mt-2 space-y-3">
            {rest.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TeamCard({ team, children }) {
  const st = STATUS[team.status] ?? { label: team.status, tone: "neutral" };
  const leader = team.team_members?.find((m) => m.role === "leader");
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-ink-900">{team.name}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
          {team.companies?.name && <Badge tone="info">{team.companies.name}</Badge>}
        </div>
        <p className="mt-0.5 text-[13px] text-ink-500">
          팀장 {leader?.profiles?.name || "이름 미입력"} · 팀원 {team.team_members?.length ?? 0}명 ·
          초대코드 <span className="font-mono font-bold">{team.invite_code}</span>
        </p>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </Card>
  );
}
