import Image from "next/image";
import Link from "next/link";
import { ALL_STYLES } from "@/lib/service-style";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80&auto=format&fit=crop";

const TRUST_POINTS = [
  { icon: "⚡", title: "Instant", text: "Estimate in minutes, not days." },
  { icon: "🆓", title: "Free", text: "No obligation, no spam." },
  { icon: "🛠️", title: "Tailored", text: "We only ask about what you need." },
];

const STEPS = [
  {
    n: "1",
    title: "Pick your services",
    text: "Browse our catalog and add anything you're curious about.",
  },
  {
    n: "2",
    title: "Answer a few questions",
    text: "Quick questions tailored to each service you picked.",
  },
  {
    n: "3",
    title: "Get your estimate",
    text: "A price range right away — confirm details and we're off to the races.",
  },
];

export default function HomePage() {
  const previewServices = Object.entries(ALL_STYLES).slice(0, 6);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-indigo-900/70" />
        </div>

        <div className="mx-auto flex min-h-[560px] max-w-6xl flex-col justify-center px-6 py-20 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
            Instant Quote
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            A better home,{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
              priced instantly.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-7 text-slate-200">
            Solar, roofing, generators, HVAC and more — answer a few questions
            and get an upfront estimate. No phone tag. No high-pressure sales.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
            >
              Get my quote
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-white/30 bg-white/5 px-6 py-3.5 text-base font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              How it works
            </Link>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-200">
            {TRUST_POINTS.map((p) => (
              <li key={p.title} className="flex items-center gap-2">
                <span aria-hidden="true">{p.icon}</span>
                <span className="font-medium text-white">{p.title}</span>
                <span className="text-slate-300">— {p.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y border-slate-200 bg-white py-20"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Three steps to a real number.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-base font-semibold text-white">
                  {step.n}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service teasers */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                What we quote
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Everything for the modern home.
              </h2>
              <p className="mt-3 text-base text-slate-600">
                A peek at what&apos;s inside. Pick any combination and
                we&apos;ll only ask what we need to know.
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {previewServices.map(([key, style]) => (
              <div
                key={key}
                className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient}`}
              >
                <Image
                  src={style.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 pb-3">
                  <span aria-hidden="true">{style.icon}</span>
                  <p className="text-sm font-semibold capitalize text-white">
                    {key.replace(/-/g, " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Start my quote
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
