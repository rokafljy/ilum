import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrg } from "./OrgSpace.jsx";
import { fmtDate, todayStr } from "../../lib/format.js";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea,
} from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const TABS = [
  { key: "notice", label: "공지" },
  { key: "qna", label: "Q&A" },
  { key: "schedule", label: "일정" },
];

/** 소통 관리 — 공지·Q&A·일정 */
export default function CommPage() {
  const { program } = useOrg();
  const [tab, setTab] = useState("notice");

  if (!program) {
    return <Card><EmptyState title="사업이 없어요" description="사업을 먼저 만들어 주세요." /></Card>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">소통</h1>
      <p className="mt-0.5 text-sm text-ink-500">{program.name}</p>

      <div className="mt-4 flex gap-1 rounded-xl bg-ink-100 p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "h-8 px-4 rounded-lg text-[13px] font-semibold transition-colors",
              tab === t.key ? "bg-white shadow-sm text-ink-900" : "text-ink-500"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "notice" && <NoticeTab />}
        {tab === "qna" && <QnaTab />}
        {tab === "schedule" && <ScheduleTab />}
      </div>
    </div>
  );
}

/* ─── 공지 ─── */
function NoticeTab() {
  const { org, program } = useOrg();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ content: "", priority: "normal" });

  const { data: notices, isLoading } = useQuery({
    queryKey: ["org-notices", program.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices").select("*").eq("program_id", program.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNotice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notices").insert({
        org_id: org.id, program_id: program.id,
        content: form.content.trim(), priority: form.priority,
        created_by: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-notices", program.id] });
      setOpen(false);
      setForm({ content: "", priority: "normal" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (n) => {
      const { error } = await supabase.from("notices").update({ active: !n.active }).eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-notices", program.id] }),
  });

  return (
    <div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>+ 공지 작성</Button>
      </div>
      {isLoading ? (
        <div className="py-12 grid place-items-center"><Spinner /></div>
      ) : notices?.length === 0 ? (
        <Card className="mt-3"><EmptyState icon="📢" title="공지가 없어요" description="사업 참여 팀 전체에게 전달할 공지를 작성해 보세요." /></Card>
      ) : (
        <div className="mt-3 space-y-2">
          {notices.map((n) => (
            <Card key={n.id} className={cn("p-4", !n.active && "opacity-50")}>
              <div className="flex items-start gap-2">
                {n.priority === "important" && <Badge tone="danger">중요</Badge>}
                <p className="flex-1 text-sm text-ink-900 whitespace-pre-wrap">{n.content}</p>
                <button className="text-[12px] text-ink-400 hover:text-ink-700 shrink-0"
                  onClick={() => toggleActive.mutate(n)}>
                  {n.active ? "숨기기" : "다시 게시"}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-400">{fmtDate(n.created_at)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="공지 작성"
        footer={
          <Button disabled={!form.content.trim() || createNotice.isPending} onClick={() => createNotice.mutate()}>
            게시
          </Button>
        }>
        <div className="space-y-4">
          <Field label="내용">
            <Textarea autoFocus value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </Field>
          <Field label="중요도">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="normal">일반</option>
              <option value="important">중요 (강조 표시)</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Q&A ─── */
function QnaTab() {
  const { program } = useOrg();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [answering, setAnswering] = useState(null);
  const [answer, setAnswer] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["org-qna", program.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qna").select("*, teams(name), profiles:asked_by(name)")
        .eq("program_id", program.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveAnswer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("qna").update({
        answer: answer.trim(), answered_by: session.user.id, answered_at: new Date().toISOString(),
      }).eq("id", answering.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-qna", program.id] });
      setAnswering(null);
      setAnswer("");
    },
  });

  const pending = (items ?? []).filter((q) => !q.answer);
  const done = (items ?? []).filter((q) => q.answer);

  if (isLoading) return <div className="py-12 grid place-items-center"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {items?.length === 0 && (
        <Card><EmptyState icon="💬" title="질문이 없어요" description="팀이 질문을 남기면 여기에 표시됩니다." /></Card>
      )}
      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-amber-700">미답변 {pending.length}건</h3>
          <div className="mt-2 space-y-2">
            {pending.map((q) => (
              <Card key={q.id} className="p-4">
                <p className="text-sm text-ink-900 whitespace-pre-wrap">{q.question}</p>
                <p className="mt-1 text-[12px] text-ink-400">{q.teams?.name} · {q.profiles?.name} · {fmtDate(q.created_at)}</p>
                <Button size="sm" className="mt-2" onClick={() => setAnswering(q)}>답변하기</Button>
              </Card>
            ))}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-ink-500">답변 완료</h3>
          <div className="mt-2 space-y-2">
            {done.map((q) => (
              <Card key={q.id} className="p-4">
                <p className="text-sm text-ink-900 whitespace-pre-wrap">{q.question}</p>
                <p className="mt-1 text-[12px] text-ink-400">{q.teams?.name} · {fmtDate(q.created_at)}</p>
                <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-ink-700 whitespace-pre-wrap">
                  {q.answer}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal open={Boolean(answering)} onClose={() => setAnswering(null)} title="답변 작성"
        footer={
          <Button disabled={!answer.trim() || saveAnswer.isPending} onClick={() => saveAnswer.mutate()}>
            답변 게시
          </Button>
        }>
        {answering && (
          <div className="space-y-3">
            <div className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700 whitespace-pre-wrap">
              {answering.question}
            </div>
            <Field label="답변">
              <Textarea autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─── 일정 ─── */
const SCHED_TYPES = { monitoring: "점검", training: "교육", review: "발표·심사", etc: "일반" };

function ScheduleTab() {
  const { org, program } = useOrg();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "etc", date: todayStr(), start_time: "", location: "", memo: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: items, isLoading } = useQuery({
    queryKey: ["org-schedules", program.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules").select("*, teams(name)").eq("program_id", program.id)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedules").insert({
        org_id: org.id, program_id: program.id,
        title: form.title.trim(), type: form.type, date: form.date,
        start_time: form.start_time || null, location: form.location, memo: form.memo,
        created_by: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-schedules", program.id] });
      setOpen(false);
      setForm({ title: "", type: "etc", date: todayStr(), start_time: "", location: "", memo: "" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-schedules", program.id] }),
  });

  const upcoming = (items ?? []).filter((s) => s.date >= todayStr());
  const past = (items ?? []).filter((s) => s.date < todayStr());

  return (
    <div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>+ 일정 등록</Button>
      </div>
      {isLoading ? (
        <div className="py-12 grid place-items-center"><Spinner /></div>
      ) : items?.length === 0 ? (
        <Card className="mt-3"><EmptyState icon="📅" title="일정이 없어요" description="점검·교육·발표 일정을 등록하면 모든 팀에게 공유돼요." /></Card>
      ) : (
        <div className="mt-3 space-y-2">
          {[...upcoming, ...past].map((s) => (
            <Card key={s.id} className={cn("p-4 flex items-center gap-3", s.date < todayStr() && "opacity-50")}>
              <div className="text-center shrink-0 w-12">
                <div className="text-[11px] text-ink-400">{s.date.slice(5, 7)}월</div>
                <div className="text-lg font-extrabold text-ink-900 leading-tight">{s.date.slice(8)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink-900 truncate">{s.title}</span>
                  <Badge tone="info">{SCHED_TYPES[s.type] ?? s.type}</Badge>
                  {s.teams?.name && <Badge tone="neutral">{s.teams.name}</Badge>}
                </div>
                <p className="text-[13px] text-ink-500">
                  {s.start_time?.slice(0, 5) ?? ""} {s.location}
                </p>
              </div>
              {!s.team_id && (
                <button className="text-[12px] text-ink-400 hover:text-red-600" onClick={() => remove.mutate(s.id)}>
                  삭제
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="일정 등록"
        footer={
          <Button disabled={!form.title.trim() || createSchedule.isPending} onClick={() => createSchedule.mutate()}>
            등록
          </Button>
        }>
        <div className="space-y-4">
          <Field label="제목">
            <Input autoFocus value={form.title} onChange={set("title")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="유형">
              <Select value={form.type} onChange={set("type")}>
                {Object.entries(SCHED_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="날짜">
              <Input type="date" value={form.date} onChange={set("date")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작 시간 (선택)">
              <Input type="time" value={form.start_time} onChange={set("start_time")} />
            </Field>
            <Field label="장소 (선택)">
              <Input value={form.location} onChange={set("location")} />
            </Field>
          </div>
          <Field label="메모 (선택)">
            <Textarea className="min-h-16" value={form.memo} onChange={set("memo")} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
