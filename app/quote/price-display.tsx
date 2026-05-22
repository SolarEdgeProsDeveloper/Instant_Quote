export function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

type Size = "card" | "bar" | "hero";

const SIZE = {
  card: {
    label: "text-[10px] font-semibold uppercase tracking-widest text-slate-400",
    min: "text-2xl font-bold text-rose-600",
    max: "text-sm text-slate-400 line-through",
    pill: "mt-1.5 text-[11px]",
    sparkle: "text-emerald-500",
  },
  bar: {
    label: "text-[10px] font-semibold uppercase tracking-widest text-slate-400",
    min: "text-xl font-bold text-rose-600",
    max: "text-sm text-slate-400 line-through",
    pill: "ml-2 text-[11px]",
    sparkle: "text-emerald-500",
  },
  hero: {
    label: "text-xs font-semibold uppercase tracking-widest text-slate-400",
    min: "text-4xl font-bold text-rose-600",
    max: "text-lg text-slate-400 line-through",
    pill: "mt-2 text-xs",
    sparkle: "text-emerald-500",
  },
} satisfies Record<Size, Record<string, string>>;

export function PriceRange({
  min,
  max,
  size = "card",
  layout = "block",
}: {
  min: number | null | undefined;
  max: number | null | undefined;
  size?: Size;
  layout?: "block" | "inline";
}) {
  const hasMin = min != null && Number.isFinite(min) && min > 0;
  const hasMax = max != null && Number.isFinite(max) && max > 0;
  if (!hasMin && !hasMax) {
    return <p className="text-xs text-slate-400">Price on request</p>;
  }

  const savings = hasMin && hasMax && max! > min! ? max! - min! : 0;
  const styles = SIZE[size];

  return (
    <div className={layout === "inline" ? "flex items-center gap-3" : ""}>
      <div>
        <p className={styles.label}>From</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
          {hasMin && <span className={styles.min}>{formatPrice(min)}</span>}
          {hasMax && <span className={styles.max}>{formatPrice(max)}</span>}
        </div>
      </div>
      {savings > 0 && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ${styles.pill}`}
        >
          <span aria-hidden="true" className={styles.sparkle}>
            ✦
          </span>
          Save up to {formatPrice(savings)}
        </span>
      )}
    </div>
  );
}
