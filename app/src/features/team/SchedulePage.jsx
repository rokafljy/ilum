import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useTeam } from "./TeamSpace.jsx";
import { todayStr } from "../../lib/format.js";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const SCHED_TYPES = { monitoring: "점검", training: "교육", review: "발표·심사", etc: "일반", team: "팀 일정" };

/** 팀 일정 — 기관 공지 일정 + 팀 자체 일정 */
export default function SchedulePage() {
  const { team } = useTeam();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: todayStr(), start_time: "", location: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: items, isLoading } = useQuery({
    queryKey: ["team-schedules", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules").select("*")
        .eq("program_id", team.program_id)
        .or(`team_id.is.null,team_id.eq.${team.id}`)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedules").insert({
        org_id: team.org_id, program_id: team.program_id, team_id: team.id,
        title: form.title.trim(), type: "team", date: form.date,
        start_time: form.start_time || null, location: form.location,
        created_by: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-schedules", team.id] });
      setOpen(false);
      setForm({ title: "", date: todayStr(), start_time: "", location: "" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-schedules", team.id] }),
  });

  const upcoming = (items ?? []).filter((s) => s.date >= todayStr());
  const past = (items ?? []).filter((s) => s.date < todayStr());

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">일정</h1>
          <p className="mt-0.5 text-[13px] text-ink-500">기관 일정과 팀 일정을 한눈에.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ 팀 일정</Button>
      </div>

      {isLoading ? (
        <div className="py-16 grid place-items-center"><Spinner /></div>
      ) : items?.length === 0 ? (
        <Card className="mt-4">
          <EmptyState icon="📅" title="일정이 없어요" description="기관이 등록한 일정과 팀 자체 일정이 여기에 표시돼요." />
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {[...upcoming, ...past].map((s) => (
            <Card key={s.id} className={cn("p-4 flex items-center gap-3", s.date < todayStr() && "opacity-50")}>
              <div className="text-center shrink-0 w-12">
                <div className="text-[11px] text-ink-400">{s.date.slice(5, 7)}월</div>
                <div className="text-lg font-extrabold text-ink-900 leading-tight">{s.date.slice(8)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink-900 truncate">{s.title}</span>
                  <Badge tone={s.team_id ? "brand" : "info"}>{s.team_id ? "팀" : SCHED_TYPES[s.type] ?? "기관"}</Badge>
                </div>
                <p className="text-[13px] text-ink-500">{s.start_time?.slice(0, 5) ?? ""} {s.location}</p>
              </div>
              {s.team_id === team.id && (
                <button className="text-[12px] text-ink-400 hover:text-red-600" onClick={() => remove.mutate(s.id)}>
                  삭제
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="팀 일정 등록"
        footer={
          <Button disabled={!form.title.trim() || createSchedule.isPending} onClick={() => createSchedule.mutate()}>
            등록
          </Button>
        }>
        <div className="space-y-4">
          <Field label="제목">
            <Input autoFocus value={form.title} onChange={set("title")} placeholder="예: 팀 정기회의" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <Input type="date" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="시간 (선택)">
              <Input type="time" value={form.start_time} onChange={set("start_time")} />
            </Field>
          </div>
          <Field label="장소 (선택)">
            <Input value={form.location} onChange={set("location")} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
