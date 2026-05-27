export function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  // Whole dollars → no decimals. Anything else → 2 decimals so sub-dollar
  // pricing (e.g. solar panels priced per watt at $0.38) survives.
  if (Number.isInteger(n)) return `$${n.toLocaleString("en-US")}`;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  unit,
}: {
  min: number | null | undefined;
  max: number | null | undefined;
  size?: Size;
  layout?: "block" | "inline";
  /**
   * Optional pricing unit from the sheet's column C (e.g. "watt" for solar
   * panels priced per watt). Rendered as a small "/unit" suffix next to each
   * price. Pass null/undefined for products priced as a flat amount per item.
   */
  unit?: string | null;
}) {
  const hasMin = min != null && Number.isFinite(min) && min > 0;
  const hasMax = max != null && Number.isFinite(max) && max > 0;
  if (!hasMin && !hasMax) {
    return <p className="text-xs text-slate-400">Price on request</p>;
  }

  const savings = hasMin && hasMax && max! > min! ? max! - min! : 0;
  const styles = SIZE[size];
  const cleanUnit = unit?.trim() || null;
  const suffix = cleanUnit ? (
    <span className="ml-0.5 text-[0.6em] font-medium opacity-70">
      /{cleanUnit}
    </span>
  ) : null;

  return (
    <div className={layout === "inline" ? "flex items-center gap-3" : ""}>
      <div>
        <p className={styles.label}>From</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
          {hasMin && (
            <span className={styles.min}>
              {formatPrice(min)}
              {suffix}
            </span>
          )}
          {hasMax && (
            <span className={styles.max}>
              {formatPrice(max)}
              {suffix}
            </span>
          )}
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
          {cleanUnit && (
            <span className="ml-0.5 opacity-70">/{cleanUnit}</span>
          )}
        </span>
      )}
    </div>
  );
}
