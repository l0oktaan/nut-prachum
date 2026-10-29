"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { copyText } from "@/lib/client";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function CopyButton({
  text,
  label = "คัดลอก",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cx("btn", className ?? "btn-secondary")}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Check className="size-4 text-lime-600" /> : <Copy className="size-4" />}
      {done ? "คัดลอกแล้ว" : label}
    </button>
  );
}

export function CopyField({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="input min-w-0 flex-1 font-mono text-[13px] text-stone-600"
        aria-label={label}
      />
      <CopyButton text={value} className="btn-primary" />
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-full bg-white p-1 shadow-sm", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
            value === o.value
              ? "bg-neon text-ink"
              : "text-stone-500 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-3", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-ink" : "bg-stone-200",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
      <span className="text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        {description && <span className="block text-xs text-stone-500">{description}</span>}
      </span>
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-4 animate-spin", className)} />;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      {message}
    </p>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  // Stable muted tint per name.
  const tints = [
    "bg-neon text-ink",
    "bg-lilac-soft text-violet-800",
    "bg-ink text-neon",
    "bg-lilac text-white",
    "bg-stone-200 text-ink",
    "bg-ink-soft text-lilac-soft",
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cx(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
        tints[h % tints.length],
        className,
      )}
      aria-hidden
    >
      {/* Skip Thai leading vowels (เ แ โ ใ ไ) so "เอก" shows "อ". */}
      {[...name.trim().replace(/^[เแโใไ]/, "")][0]?.toUpperCase() ?? "?"}
    </span>
  );
}
