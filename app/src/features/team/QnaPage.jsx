import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useTeam } from "./TeamSpace.jsx";
import { fmtDate } from "../../lib/format.js";
import { Badge, Button, Card, EmptyState, Field, Modal, Spinner, Textarea } from "../../components/ui/index.jsx";

/** 팀 Q&A — 운영기관에 질문하고 답변 확인 */
export default function QnaPage() {
  const { team } = useTeam();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["team-qna", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qna").select("*").eq("team_id", team.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("qna").insert({
        org_id: team.org_id, program_id: team.program_id, team_id: team.id,
        question: question.trim(), asked_by: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-qna", team.id] });
      setOpen(false);
      setQuestion("");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Q&A</h1>
          <p className="mt-0.5 text-[13px] text-ink-500">운영기관에 궁금한 점을 물어보세요.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ 질문하기</Button>
      </div>

      {isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : items?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState icon="💬" title="아직 질문이 없어요"
            description="예산 사용, 서류 작성 등 궁금한 건 뭐든 물어보세요."
            action={<Button onClick={() => setOpen(true)}>+ 질문하기</Button>} />
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm font-semibold text-ink-900 whitespace-pre-wrap">{q.question}</p>
                <Badge tone={q.answer ? "brand" : "warning"}>{q.answer ? "답변완료" : "대기중"}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-ink-400">{fmtDate(q.created_at)}</p>
              {q.answer && (
                <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-ink-700 whitespace-pre-wrap">
                  {q.answer}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="질문하기"
        footer={
          <Button disabled={!question.trim() || ask.isPending} onClick={() => ask.mutate()}>
            질문 보내기
          </Button>
        }>
        <Field label="질문 내용">
          <Textarea autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="예: 다과비로 음료를 사도 되나요?" />
        </Field>
      </Modal>
    </div>
  );
}
