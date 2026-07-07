import { cn } from "../../lib/cn.js";

/* ─── 일움 디자인 시스템 · 기본 컴포넌트 ───
   원칙: 밝고 미니멀, 명확한 위계, 절제된 색. 모든 인터랙션에 focus-visible 링. */

const BTN_VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-500 hover:bg-ink-100 hover:text-ink-700",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const BTN_SIZES = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export function Button({ variant = "primary", size = "md", className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:opacity-50 disabled:pointer-events-none",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("bg-white rounded-card shadow-card border border-ink-100", className)}
      {...props}
    />
  );
}

const BADGE_TONES = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({ tone = "neutral", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        BADGE_TONES[tone],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-white text-[15px] text-ink-900",
        "placeholder:text-ink-400 transition-shadow",
        "focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold text-ink-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cn(
        "inline-block size-5 rounded-full border-2 border-ink-200 border-t-brand-600 animate-spin",
        className
      )}
      aria-label="로딩 중"
    />
  );
}

export function EmptyState({ icon = "🌱", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-bold text-ink-700">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-pop w-full max-w-md p-6 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-bold text-lg text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 text-xl leading-none -mt-0.5"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full h-11 px-3 rounded-xl border border-ink-200 bg-white text-[15px] text-ink-900",
        "focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** 복사 버튼 — 초대링크·코드 공유용 */
export function CopyButton({ text, label = "복사" }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async (e) => {
        await navigator.clipboard.writeText(text);
        const el = e.currentTarget;
        const prev = el.textContent;
        el.textContent = "복사됨 ✓";
        setTimeout(() => (el.textContent = prev), 1500);
      }}
    >
      {label}
    </Button>
  );
}

/** 코드 표시 칩 — 참여코드/초대코드 */
export function CodeChip({ code }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-ink-100 font-mono font-bold text-[13px] tracking-widest text-ink-700">
      {code}
    </span>
  );
}

/** 일움 워드마크 — 새싹 점 하나로 브랜드 표현 */
export function Logo({ className, size = "md" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className={cn("inline-flex items-baseline font-extrabold tracking-tight text-ink-900", text, className)}>
      일움<span className="text-brand-500">.</span>
    </span>
  );
}
