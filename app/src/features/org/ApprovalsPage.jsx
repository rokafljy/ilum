import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { DOC_TYPES, DOC_STATUS, DECISION_FOR, decideDoc } from "../../lib/docs.js";
import { fmtDate } from "../../lib/format.js";
import { DocDetail } from "../../components/DocDetail.jsx";
import {
  Badge, Button, Card, EmptyState, Field, Modal, Spinner, Textarea,
} from "../../components/ui/index.jsx";

async function fetchSubmitted(programId) {
  const { data, error } = await supabase
    .from("documents")
    .select("*, teams(name)")
    .eq("program_id", programId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** 승인 관리 — 제출된 문서를 검토·승인·반려 */
export default function ApprovalsPage() {
  const { program } = useOrg();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["org-approvals", program?.id],
    enabled: Boolean(program),
    queryFn: () => fetchSubmitted(program.id),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, note }) => decideDoc(id, decision, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-approvals", program?.id] });
      setViewing(null);
      setRejecting(false);
      setNote("");
    },
    onError: () => alert("처리에 실패했어요."),
  });

  if (!program) {
    return (
      <Card><EmptyState title="사업이 없어요" description="사업을 먼저 만들어 주세요." /></Card>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">승인 관리</h1>
      <p className="mt-0.5 text-sm text-ink-500">{program.name} — 제출 순서대로 검토하세요.</p>

      {isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : docs?.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon="✅" title="검토할 문서가 없어요" description="팀이 문서를 제출하면 여기에 표시됩니다." />
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {docs.map((d) => (
            <Card key={d.id} className="p-4 flex items-center gap-3 cursor-pointer hover:border-brand-300 transition-colors"
              onClick={() => setViewing(d)}>
              <Badge tone="info">{DOC_TYPES[d.doc_type]}</Badge>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px] text-ink-900 truncate">{d.title}</div>
                <p className="text-[13px] text-ink-500">
                  {d.teams?.name} · 제출 {fmtDate(d.submitted_at)}
                </p>
              </div>
              <Badge tone="warning">{DOC_STATUS[d.status].label}</Badge>
            </Card>
          ))}
        </div>
      )}

      {viewing && (
        <Modal
          open onClose={() => { setViewing(null); setRejecting(false); }}
          title={`${viewing.teams?.name} — ${viewing.title}`}
          footer={
            rejecting ? (
              <>
                <Button variant="secondary" onClick={() => setRejecting(false)}>뒤로</Button>
                <Button variant="danger" disabled={!note.trim() || decide.isPending}
                  onClick={() => decide.mutate({ id: viewing.id, decision: "rejected", note: note.trim() })}>
                  반려 확정
                </Button>
              </>
            ) : (
              <>
                <Button variant="danger" disabled={decide.isPending} onClick={() => setRejecting(true)}>
                  반려
                </Button>
                <Button disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: viewing.id, decision: DECISION_FOR(viewing.doc_type) })}>
                  {decide.isPending ? "처리 중…" : viewing.doc_type === "meeting" ? "확인 완료" : "승인"}
                </Button>
              </>
            )
          }
        >
          {rejecting ? (
            <Field label="반려 사유 (팀에게 전달됩니다)">
              <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          ) : (
            <DocDetail doc={viewing} />
          )}
        </Modal>
      )}
    </div>
  );
}
