import { useRef, useState } from "react";
import { uploadEvidence } from "../lib/upload.js";
import { Spinner } from "./ui/index.jsx";
import { cn } from "../lib/cn.js";

/**
 * 증빙 업로드 — 이미지 썸네일 목록 + 추가/삭제
 * value: string[] (URL), onChange(urls)
 */
export function PhotoList({ value = [], onChange, ctx, max = 10, label = "사진 추가" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files.slice(0, max - value.length)) urls.push(await uploadEvidence(f, ctx));
      onChange([...value, ...urls]);
    } catch {
      alert("업로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((url, i) => (
        <div key={url} className="relative size-20 rounded-lg overflow-hidden border border-ink-200 group">
          <img src={url} alt={`첨부 ${i + 1}`} className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(value.filter((u) => u !== url))}
            className="absolute top-0.5 right-0.5 size-5 rounded-full bg-ink-900/60 text-white text-xs leading-none opacity-0 group-hover:opacity-100"
            aria-label="삭제"
          >
            ×
          </button>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "size-20 rounded-lg border-2 border-dashed border-ink-200 grid place-items-center",
            "text-ink-400 hover:border-brand-400 hover:text-brand-600 transition-colors text-xs font-semibold"
          )}
        >
          {busy ? <Spinner className="size-4" /> : `+ ${label}`}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
    </div>
  );
}

/** 단일 영수증 슬롯 — 없으면 업로드 버튼, 있으면 썸네일+교체/삭제 */
export function ReceiptSlot({ value, onChange, ctx }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadEvidence(f, ctx));
    } catch {
      alert("업로드에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <>
          <a href={value} target="_blank" rel="noreferrer" className="block size-12 rounded-lg overflow-hidden border border-ink-200">
            <img src={value} alt="영수증" className="size-full object-cover" />
          </a>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-ink-400 hover:text-red-600">
            삭제
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-9 px-3 rounded-lg border border-dashed border-ink-300 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
        >
          {busy ? "업로드 중…" : "📎 영수증"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={onPick} />
    </div>
  );
}
