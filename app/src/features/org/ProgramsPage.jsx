import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useOrg } from "./OrgSpace.jsx";
import { DEFAULT_PROGRAM_SETTINGS, PROGRAM_TYPES } from "../../lib/programDefaults.js";
import {
  Badge, Button, Card, CodeChip, CopyButton, EmptyState, Field, Input, Modal, Select,
} from "../../components/ui/index.jsx";

const STATUS_LABEL = { draft: "준비중", active: "진행중", archived: "종료" };

export default function ProgramsPage() {
  const { org, programs, setProgramId } = useOrg();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    type: PROGRAM_TYPES[0],
    start_date: "",
    end_date: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const createProgram = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .insert({
          org_id: org.id,
          name: form.name.trim(),
          year: Number(form.year) || null,
          type: form.type,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          settings: DEFAULT_PROGRAM_SETTINGS,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["org-programs", org.id] });
      setOpen(false);
      setForm((f) => ({ ...f, name: "" }));
      setProgramId(p.id);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">사업 관리</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            연도·유형별 사업을 만들고, 참여코드로 청년 팀을 모집하세요.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ 사업 만들기</Button>
      </div>

      <div className="mt-6 space-y-3">
        {programs.length === 0 && (
          <Card>
            <EmptyState
              title="첫 사업을 만들어 보세요"
              description="사업을 만들면 예산·한도 규칙이 표준 템플릿으로 설정되고, 팀 모집용 참여코드가 발급됩니다."
              action={<Button onClick={() => setOpen(true)}>+ 사업 만들기</Button>}
            />
          </Card>
        )}
        {programs.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-ink-900">{p.name}</span>
              <Badge tone={p.status === "active" ? "brand" : "neutral"}>
                {STATUS_LABEL[p.status] ?? p.status}
              </Badge>
              <span className="text-[13px] text-ink-500">
                {p.year ?? "-"}년 · {p.type}
                {p.start_date && ` · ${p.start_date} 시작`}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-700">
              <span className="text-[13px] font-semibold text-ink-500">팀 모집 참여코드</span>
              <CodeChip code={p.join_code} />
              <CopyButton text={p.join_code} />
              <span className="text-xs text-ink-400">
                — 팀장이 회원가입 후 이 코드로 팀을 등록합니다
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-ink-400">팀당 예산</div>
                <div className="font-bold text-ink-900">
                  {(p.settings?.teamBudget ?? 0).toLocaleString()}원
                </div>
              </div>
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-ink-400">필수 멘토링</div>
                <div className="font-bold text-ink-900">{p.settings?.mentoringTotal ?? "-"}회</div>
              </div>
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-ink-400">활동 회차</div>
                <div className="font-bold text-ink-900">{p.settings?.sessionMax ?? "-"}회</div>
              </div>
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-ink-400">자동 승인</div>
                <div className="font-bold text-ink-900">
                  {p.settings?.autoApprove?.enabled ? "켜짐" : "꺼짐"}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="사업 만들기"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
            <Button
              disabled={!form.name.trim() || createProgram.isPending}
              onClick={() => createProgram.mutate()}
            >
              {createProgram.isPending ? "생성 중…" : "만들기"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="사업명" hint="예: 2026 미래내일 일경험 (프로젝트형)">
            <Input value={form.name} onChange={set("name")} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="연도">
              <Input type="number" value={form.year} onChange={set("year")} />
            </Field>
            <Field label="유형">
              <Select value={form.type} onChange={set("type")}>
                {PROGRAM_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일">
              <Input type="date" value={form.start_date} onChange={set("start_date")} />
            </Field>
            <Field label="종료일">
              <Input type="date" value={form.end_date} onChange={set("end_date")} />
            </Field>
          </div>
          <p className="text-xs text-ink-400 leading-relaxed">
            예산·한도·멘토링 등 사업 규칙은 표준 템플릿(팀당 180만 원, 멘토링 8회)으로 시작됩니다.
            생성 후 사업 설정에서 언제든 수정할 수 있어요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
