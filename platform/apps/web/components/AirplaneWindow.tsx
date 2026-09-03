import Link from "next/link";

/**
 * A "capsule" (stadium) shape — border-radius: 9999px on a box taller
 * than it is wide caps out at half the width per corner, giving fully
 * rounded top/bottom caps with straight vertical sides in between. That
 * straight middle band is where the overlay text lives; a true ellipse
 * (radius varying continuously) was tried first and clipped text near
 * every edge, not just top/bottom — see git history.
 */
const CLOUDS = [
  { top: "34%", left: "8%", width: 150, height: 46, opacity: 0.9 },
  { top: "42%", left: "52%", width: 190, height: 56, opacity: 0.85 },
  { top: "30%", left: "62%", width: 110, height: 34, opacity: 0.75 },
  { top: "48%", left: "22%", width: 130, height: 40, opacity: 0.7 },
  { top: "55%", left: "68%", width: 100, height: 30, opacity: 0.6 },
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
  cta: string;
  /** Navigates directly. Mutually exclusive with onSelect (e.g. TravelModeFlow's in-page slide). */
  href?: string;
  onSelect?: () => void;
}

export function AirplaneWindow({ variant, eyebrow, title, lines, href, cta, onSelect }: AirplaneWindowProps) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-10 -z-10 rounded-full blur-3xl"
        style={{ background: variant === "day" ? "rgba(141,192,226,0.35)" : "rgba(20,26,36,0.5)" }}
      />
      <div
        className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-full shadow-2xl"
        style={{ aspectRatio: "10 / 16" }}
      >
        {/* Metallic porthole rim: bright outer ring, dark inner groove, then the scene */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 0 10px rgba(255,255,255,0.9), inset 0 0 0 14px rgba(15,20,28,0.5)" }} />
        <div className="absolute inset-[14px] overflow-hidden rounded-full">
          {variant === "day" ? <DayScene /> : <NightScene />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/30" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center px-9 pt-[19%] text-center sm:px-11">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/30 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            <PlaneIcon variant={variant} />
            {eyebrow}
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold text-white drop-shadow-sm sm:text-3xl">{title}</h2>
          <div className="mt-2 space-y-0.5 text-xs text-white/85 sm:text-sm">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className="mt-5 inline-block rounded-lg border border-white/70 px-5 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white hover:text-charcoal sm:text-sm"
            >
              {cta}
            </button>
          ) : (
            <Link
              href={href ?? "#"}
              className="mt-5 inline-block rounded-lg border border-white/70 px-5 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white hover:text-charcoal sm:text-sm"
            >
              {cta}
            </Link>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-transparent" />
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

/** A wing seen from a window seat: one swept silhouette with a darker underside band and a bright leading-edge line. */
function Wing({ tone }: { tone: "day" | "night" }) {
  const body = tone === "day" ? "#dde4ea" : "#334154";
  const shade = tone === "day" ? "#aab6c2" : "#1c2632";
  const highlight = tone === "day" ? "#ffffff" : "#66788d";
  return (
    <svg viewBox="0 0 300 140" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: "38%" }}>
      <path d="M-10 140 L-10 100 L 320 48 L 320 66 L -10 140 Z" fill={body} />
      <path d="M-10 140 L-10 118 L 320 66 L 320 78 L -10 140 Z" fill={shade} />
      <path d="M-10 101 L 320 49 L 320 53 L -10 105 Z" fill={highlight} />
    </svg>
  );
}

function DayScene() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #3f7bb0 0%, #6fa9d4 38%, #a9d1e8 68%, #dcedf5 100%)" }}>
      <div
        className="absolute -right-6 -top-6 h-32 w-32 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,250,222,0.9) 0%, rgba(255,250,222,0) 70%)" }}
      />
      {CLOUDS.map((cloud, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white blur-md"
          style={{ top: cloud.top, left: cloud.left, width: cloud.width, height: cloud.height, opacity: cloud.opacity }}
        />
      ))}
      <Wing tone="day" />
    </div>
  );
}

function NightScene() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #060a12 0%, #131c29 45%, #263447 75%, #3a4d63 100%)" }}>
      {STARS.map((star, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size, opacity: 0.8 }}
        />
      ))}
      <div
        className="absolute bottom-[38%] left-0 h-24 w-full"
        style={{ background: "linear-gradient(180deg, rgba(234,243,250,0) 0%, rgba(180,205,225,0.25) 100%)" }}
      />
      <Wing tone="night" />
    </div>
  );
}
