import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { signOut } from "../auth/AuthProvider.jsx";
import {
  Badge, Button, Card, CopyButton, EmptyState, Field, Input, Logo, Modal, Select, Spinner,
} from "../../components/ui/index.jsx";

async function fetchOrgs() {
  const { data, error } = await supabase
    .from("orgs")
    .select("id, name, status, created_at, org_members(count), programs(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function ConsolePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: orgs, isLoading } = useQuery({ queryKey: ["console-orgs"], queryFn: fetchOrgs });

  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [inviteFor, setInviteFor] = useState(null); // 초대 대상 org
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [inviteLink, setInviteLink] = useState("");

  const createOrg = useMutation({
    mutationFn: async (name) => {
      const { data, error } = await supabase.from("orgs").insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ["console-orgs"] });
      setCreateOpen(false);
      setOrgName("");
      setInviteFor(org); // 생성 직후 바로 관리자 초대로 유도
    },
  });

  const createInvite = useMutation({
    mutationFn: async ({ orgId, email, role }) => {
      const { data, error } = await supabase
        .from("org_invites")
        .insert({ org_id: orgId, email, role })
        .select("token")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => setInviteLink(`${window.location.origin}/invite/${d.token}`),
  });

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-14 border-b border-ink-100 bg-white flex items-center px-5 gap-3">
        <Logo size="sm" />
        <span className="text-sm font-semibold text-ink-500">운영사 콘솔</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
          로그아웃
        </Button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-900">운영기관</h1>
            <p className="mt-0.5 text-sm text-ink-500">일움을 사용하는 기관을 관리합니다.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ 기관 등록</Button>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="py-16 grid place-items-center">
              <Spinner />
            </div>
          )}
          {orgs?.length === 0 && (
            <Card>
              <EmptyState
                title="아직 등록된 기관이 없어요"
                description="첫 운영기관을 등록하고 담당자를 초대해 보세요."
                action={<Button onClick={() => setCreateOpen(true)}>+ 기관 등록</Button>}
              />
            </Card>
          )}
          {orgs?.map((org) => (
            <Card
              key={org.id}
              className="p-5 flex items-center gap-4 cursor-pointer hover:border-brand-300 transition-colors"
              onClick={() => {
                localStorage.setItem("ilum-console-org", org.id);
                navigate("/org");
              }}
            >
              <div className="size-10 rounded-xl bg-brand-100 text-brand-700 grid place-items-center font-bold">
                {org.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900 truncate">{org.name}</span>
                  <Badge tone={org.status === "active" ? "brand" : "danger"}>
                    {org.status === "active" ? "운영중" : "정지"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  구성원 {org.org_members?.[0]?.count ?? 0}명 · 사업 {org.programs?.[0]?.count ?? 0}개 ·
                  클릭해서 현황 보기
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setInviteFor(org);
                }}
              >
                담당자 초대
              </Button>
            </Card>
          ))}
        </div>
      </main>

      {/* 기관 등록 */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="기관 등록"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button
              disabled={!orgName.trim() || createOrg.isPending}
              onClick={() => createOrg.mutate(orgName.trim())}
            >
              {createOrg.isPending ? "등록 중…" : "등록"}
            </Button>
          </>
        }
      >
        <Field label="기관명" hint="예: 건국대학교 한국지속가능경영연구원">
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} autoFocus />
        </Field>
      </Modal>

      {/* 담당자 초대 */}
      <Modal
        open={Boolean(inviteFor)}
        onClose={() => {
          setInviteFor(null);
          setInviteEmail("");
          setInviteLink("");
        }}
        title={`${inviteFor?.name ?? ""} — 담당자 초대`}
        footer={
          inviteLink ? null : (
            <Button
              disabled={!inviteEmail.trim() || createInvite.isPending}
              onClick={() =>
                createInvite.mutate({ orgId: inviteFor.id, email: inviteEmail.trim(), role: inviteRole })
              }
            >
              {createInvite.isPending ? "생성 중…" : "초대 링크 만들기"}
            </Button>
          )
        }
      >
        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-700">
              초대 링크가 만들어졌어요. 담당자에게 전달하세요 (7일간 유효):
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-ink-50 border border-ink-200 p-3">
              <span className="text-[13px] text-ink-700 break-all flex-1">{inviteLink}</span>
              <CopyButton text={inviteLink} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="담당자 이메일">
              <Input
                type="email"
                placeholder="name@org.kr"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="역할">
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="admin">기관 관리자 (구성원 관리 가능)</option>
                <option value="staff">기관 담당자</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
