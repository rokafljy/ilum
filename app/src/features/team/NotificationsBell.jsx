import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { fmtDate } from "../../lib/format.js";
import { EmptyState } from "../../components/ui/index.jsx";
import { cn } from "../../lib/cn.js";

const TYPE_ICON = { success: "✅", error: "🚫", info: "🔔" };

/** 알림 벨 — 미읽음 뱃지 + 드로어 목록, 열면 읽음 처리 */
export function NotificationsBell({ team }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["team-notifications", team.id],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [{ data: items, error }, { data: reads }] = await Promise.all([
        supabase
          .from("notifications").select("*")
          .or(`team_id.eq.${team.id},and(team_id.is.null,program_id.eq.${team.program_id})`)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("notification_reads").select("notification_id").eq("user_id", session.user.id),
      ]);
      if (error) throw error;
      const readSet = new Set((reads ?? []).map((r) => r.notification_id));
      return (items ?? []).map((n) => ({ ...n, read: readSet.has(n.id) }));
    },
  });

  const unread = (data ?? []).filter((n) => !n.read);

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!unread.length) return;
      const { error } = await supabase.from("notification_reads").upsert(
        unread.map((n) => ({ notification_id: n.id, user_id: session.user.id })),
        { onConflict: "notification_id,user_id", ignoreDuplicates: true }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-notifications", team.id] }),
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) markAllRead.mutate();
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative size-9 rounded-full grid place-items-center hover:bg-ink-100" aria-label="알림">
        <span className="text-lg">🔔</span>
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 max-w-[85vw] bg-white rounded-2xl shadow-pop border border-ink-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-100 font-bold text-sm text-ink-900">알림</div>
            <div className="max-h-96 overflow-y-auto">
              {(data ?? []).length === 0 ? (
                <EmptyState icon="🍃" title="알림이 없어요" />
              ) : (
                data.map((n) => (
                  <div key={n.id} className={cn("px-4 py-3 border-b border-ink-50 flex gap-2.5", !n.read && "bg-brand-50/50")}>
                    <span>{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink-900 leading-snug">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{fmtDate(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
