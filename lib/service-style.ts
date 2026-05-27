import { getQuestionsForService } from "@/lib/questions";

export type ServiceStyle = {
  icon: string;
  gradient: string; // tailwind gradient class fragment (from-X via-Y to-Z)
  ring: string;
  imageUrl: string; // Unsplash photo — swap freely
  blurb: string;
};

const STYLES: Record<string, ServiceStyle> = {
  solar: {
    icon: "☀️",
    gradient: "from-amber-400 via-orange-400 to-yellow-300",
    ring: "ring-amber-200",
    imageUrl:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80&auto=format&fit=crop",
    blurb: "Cut your power bill with rooftop solar + battery options.",
  },
  water: {
    icon: "💧",
    gradient: "from-cyan-400 via-sky-500 to-blue-500",
    ring: "ring-sky-200",
    imageUrl:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80&auto=format&fit=crop",
    blurb: "Cleaner, softer water for every tap in the house.",
  },
  roofing: {
    icon: "🏠",
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    ring: "ring-slate-200",
    imageUrl:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80&auto=format&fit=crop",
    blurb: "Storm-grade roofing built for Texas weather.",
  },
  generators: {
    icon: "⚡",
    gradient: "from-emerald-400 via-emerald-500 to-teal-500",
    ring: "ring-emerald-200",
    imageUrl:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&q=80&auto=format&fit=crop",
    blurb: "Whole-home backup power, ready before the next outage.",
  },
  hvac: {
    icon: "🌡️",
    gradient: "from-orange-400 via-red-400 to-rose-500",
    ring: "ring-orange-200",
    imageUrl:
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&q=80&auto=format&fit=crop",
    blurb: "Comfort year-round — efficient heating and cooling.",
  },
  electrical: {
    icon: "🔌",
    gradient: "from-violet-500 via-purple-500 to-indigo-500",
    ring: "ring-violet-200",
    imageUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80&auto=format&fit=crop",
    blurb: "Panel upgrades, EV chargers, and modern wiring done right.",
  },
  "always-lit": {
    icon: "💡",
    gradient: "from-fuchsia-400 via-pink-500 to-rose-400",
    ring: "ring-fuchsia-200",
    imageUrl:
      "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=1200&q=80&auto=format&fit=crop",
    blurb: "Permanent eaves lighting — holidays and accents year-round.",
  },
  surge: {
    icon: "🛡️",
    gradient: "from-rose-400 via-red-500 to-orange-500",
    ring: "ring-rose-200",
    imageUrl:
      "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&q=80&auto=format&fit=crop",
    blurb: "Shield your electronics from spikes and lightning.",
  },
  "energy-monitoring": {
    icon: "📊",
    gradient: "from-sky-400 via-cyan-400 to-teal-400",
    ring: "ring-cyan-200",
    imageUrl:
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&q=80&auto=format&fit=crop",
    blurb: "See exactly where your home's power is going, in real time.",
  },
};

export const DEFAULT_STYLE: ServiceStyle = {
  icon: "🔧",
  gradient: "from-slate-400 via-slate-500 to-slate-600",
  ring: "ring-slate-200",
  imageUrl:
    "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&q=80&auto=format&fit=crop",
  blurb: "Tell us what you need — we'll put a quote together.",
};

export function getStyleForKey(key: string | undefined | null): ServiceStyle {
  if (!key) return DEFAULT_STYLE;
  return STYLES[key] ?? DEFAULT_STYLE;
}

export function getStyleForService(serviceName: string): ServiceStyle {
  const set = getQuestionsForService(serviceName);
  return getStyleForKey(set?.key);
}

export const ALL_STYLES = STYLES;
