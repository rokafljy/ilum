import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { fmtMoney } from "../../lib/format.js";
import { Button, Field, Input, Modal } from "../../components/ui/index.jsx";

/** 사업 규칙 설정 편집 — 예산·멘토링·회차·유형별 한도·자동승인 */
export function ProgramSettingsModal({ program, orgId, onClose }) {
  const qc = useQueryClient();
  const [s, setS] = useState(() => structuredClone(program.settings ?? {}));
  const set = (k) => (e) => setS((prev) => ({ ...prev, [k]: Number(e.target.value) || 0 }));

  const rules = s.expRules ?? {};
  const setRule = (type, key, value) =>
    setS((prev) => ({
      ...prev,
      expRules: { ...prev.expRules, [type]: { ...prev.expRules?.[type], [key]: Number(value) || 0 } },
    }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("programs").update({ settings: s }).eq("id", program.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-programs", orgId] });
      onClose();
    },
    onError: () => alert("저장에 실패했어요."),
  });

  const RULE_FIELDS = {
    perPerson: "1인당 한도",
    maxPeople: "최대 인원",
    perTeamPerDay: "1팀 1일 한도",
    perHour: "시간당 한도",
    maxHours: "최대 시간",
  };

  return (
    <Modal
      open onClose={onClose}
      title={`사업 설정 — ${program.name}`}
      footer={
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "저장 중…" : "저장"}
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <Field label="팀당 활동비 (원)">
            <Input type="number" step={10000} value={s.teamBudget ?? 0} onChange={set("teamBudget")} />
          </Field>
          <Field label="필수 멘토링 (회)">
            <Input type="number" value={s.mentoringTotal ?? 0} onChange={set("mentoringTotal")} />
          </Field>
          <Field label="활동 회차 수">
            <Input type="number" value={s.sessionMax ?? 0} onChange={set("sessionMax")} />
          </Field>
        </section>

        <section>
          <h3 className="text-sm font-bold text-ink-700">유형별 집행 한도</h3>
          <p className="text-[12px] text-ink-400 mb-2">청년 팀이 회의록·지출 작성 시 자동 검증됩니다.</p>
          <div className="space-y-3">
            {Object.entries(rules).map(([type, rule]) => (
              <div key={type} className="rounded-xl border border-ink-200 p-3">
                <div className="text-[13px] font-bold text-ink-900">{type}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(rule)
                    .filter(([k]) => RULE_FIELDS[k])
                    .map(([k, v]) => (
                      <label key={k} className="block">
                        <span className="text-[11px] text-ink-400">{RULE_FIELDS[k]}</span>
                        <Input className="!h-8 text-[13px]" type="number" value={v}
                          onChange={(e) => setRule(type, k, e.target.value)} />
                      </label>
                    ))}
                </div>
                {rule.note && <p className="mt-1.5 text-[11px] text-ink-400">{rule.note}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-ink-50 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <input type="checkbox" className="size-4 accent-brand-600"
              checked={s.autoApprove?.enabled ?? false}
              onChange={(e) => setS((prev) => ({ ...prev, autoApprove: { ...prev.autoApprove, enabled: e.target.checked } }))} />
            품의서 자동 승인
          </label>
          {s.autoApprove?.enabled && (
            <label className="mt-2 block">
              <span className="text-[11px] text-ink-400">자동 승인 한도 (원, 초과 시 수동 검토)</span>
              <Input className="!h-9 text-sm" type="number" step={10000} value={s.autoApprove?.limit ?? 0}
                onChange={(e) => setS((prev) => ({ ...prev, autoApprove: { ...prev.autoApprove, limit: Number(e.target.value) || 0 } }))} />
            </label>
          )}
          <p className="mt-1.5 text-[11px] text-ink-400">
            현재 팀당 예산 {fmtMoney(s.teamBudget)}원 · 멘토링 {s.mentoringTotal}회
          </p>
        </section>
      </div>
    </Modal>
  );
}
