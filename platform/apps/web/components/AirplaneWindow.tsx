import Link from "next/link";

const WINDOW_RADIUS = "3.5rem";

const CLOUDS = [
  { top: "14%", left: "6%", width: 130, height: 42, opacity: 0.85 },
  { top: "28%", left: "48%", width: 170, height: 52, opacity: 0.9 },
  { top: "8%", left: "58%", width: 100, height: 32, opacity: 0.7 },
  { top: "40%", left: "18%", width: 120, height: 38, opacity: 0.6 },
];

const STARS = [
  { top: "6%", left: "18%", size: 2 },
  { top: "12%", left: "60%", size: 3 },
  { top: "18%", left: "38%", size: 2 },
  { top: "9%", left: "80%", size: 2 },
  { top: "22%", left: "10%", size: 2 },
  { top: "5%", left: "46%", size: 2 },
  { top: "16%", left: "88%", size: 3 },
];

interface AirplaneWindowProps {
  variant: "day" | "night";
  eyebrow: string;
  title: string;
  lines: string[];
  href: string;
  cta: string;
}

export function AirplaneWindow({ variant, eyebrow, title, lines, href, cta }: AirplaneWindowProps) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-10 -z-10 rounded-full blur-3xl"
        style={{ background: variant === "day" ? "rgba(111,168,214,0.35)" : "rgba(169,131,74,0.25)" }}
      />
      <div
        className="relative aspect-[4/5] w-full overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{ borderRadius: WINDOW_RADIUS }}
      >
        {variant === "day" ? <DayScene /> : <NightScene />}

        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/20" />

        <div className="relative flex h-full flex-col items-start px-8 pt-10 sm:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-cream/30 bg-black/25 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cream backdrop-blur-sm">
            <PlaneIcon variant={variant} />
            {eyebrow}
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold text-cream drop-shadow-sm sm:text-4xl">{title}</h2>
          <div className="mt-3 space-y-1 text-sm text-cream/85">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <Link
            href={href}
            className="mt-8 inline-block rounded-lg border border-cream/70 px-6 py-3 text-sm font-medium text-cream backdrop-blur-sm transition hover:bg-cream hover:text-burgundy"
          >
            {cta}
          </Link>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" style={{ borderRadius: WINDOW_RADIUS }} />
      </div>
    </div>
  );
}

function PlaneIcon({ variant }: { variant: "day" | "night" }) {
  return variant === "day" ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 16.5v-2l-8.5-5V4a1.5 1.5 0 0 0-3 0v5.5L2 14.5v2l8.5-2.6V19l-2.5 1.8V22l3.5-1 3.5 1v-1.2L12.5 19v-5.1z" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 15v-2l-7-4.5V4a2 2 0 0 0-4 0v4.5L3 13v2l7-2.2V18l-2 1.5V21l3-.8 3 .8v-1.5l-2-1.5v-5.2z" />
    </svg>
  );
}

function DayScene() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #4d84b8 0%, #8dc0e2 50%, #cfe6f2 100%)" }}>
      <div
        className="absolute -right-8 -top-8 h-36 w-36 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,247,214,0.85) 0%, rgba(255,247,214,0) 70%)" }}
      />
      {CLOUDS.map((cloud, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white blur-md"
          style={{ top: cloud.top, left: cloud.left, width: cloud.width, height: cloud.height, opacity: cloud.opacity }}
        />
      ))}
      <svg viewBox="0 0 300 90" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none">
        <path d="M0 90 L0 55 Q 100 30 180 46 L300 30 L300 90 Z" fill="#2f3540" opacity="0.92" />
      </svg>
    </div>
  );
}

function NightScene() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0b0407 0%, #2a0f16 55%, #5c1526 100%)" }}>
      {STARS.map((star, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size, opacity: 0.8 }}
        />
      ))}
      <div
        className="absolute bottom-0 left-0 h-28 w-full"
        style={{ background: "linear-gradient(180deg, rgba(169,131,74,0) 0%, rgba(169,131,74,0.4) 100%)" }}
      />
      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-1 w-1 rounded-full bg-gold" style={{ opacity: 1 - index * 0.1 }} />
        ))}
      </div>
      <svg viewBox="0 0 200 60" className="absolute bottom-16 left-1/2 w-4/5 -translate-x-1/2 opacity-90">
        <path d="M10 42 L70 40 L95 18 L104 18 L100 40 L150 40 L165 34 L172 36 L162 44 L20 46 Z" fill="#0b0407" />
      </svg>
    </div>
  );
}
