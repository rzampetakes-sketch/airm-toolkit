import Link from "next/link";
import { AirplaneWindow } from "../components/AirplaneWindow";

const NAV_LINKS = [
  { label: "Flights", href: "/flights", enabled: true },
  { label: "My Trips", href: "#", enabled: false },
  { label: "Services", href: "#", enabled: false },
  { label: "Corporate", href: "#", enabled: false },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#12070c] text-cream">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(92,21,38,0.55), transparent 70%)" }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <div className="font-display text-2xl font-semibold tracking-wide text-cream">Aeros</div>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {NAV_LINKS.map((link) =>
            link.enabled ? (
              <Link key={link.label} href={link.href} className="border-b border-gold pb-1 text-cream">
                {link.label}
              </Link>
            ) : (
              <span key={link.label} className="cursor-default text-cream/45">
                {link.label}
              </span>
            ),
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="cursor-default text-cream/70">Log in</span>
          <span className="cursor-default rounded-lg border border-cream/40 px-5 py-2 font-medium text-cream opacity-80">
            Sign up
          </span>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-6 pb-10 pt-6 text-center">
        <h1 className="font-display text-5xl font-semibold leading-tight text-cream md:text-6xl">
          Book your next business trip
        </h1>
        <p className="mt-4 text-lg text-cream/70">Choose how you want to travel</p>
        <div className="mx-auto mt-4 h-6 w-px bg-gold" />
      </section>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 pb-24 sm:grid-cols-2">
        <AirplaneWindow
          variant="day"
          eyebrow="Commercial Flights"
          title="Fly Commercial"
          lines={["Global destinations", "Business & First class fares"]}
          href="/flights"
          cta="Search Commercial Flights"
        />
        <AirplaneWindow
          variant="night"
          eyebrow="Business Jets"
          title="Fly Private"
          lines={["Ultimate flexibility", "Empty legs at up to 75% off"]}
          href="/private-jets"
          cta="Search Business Jets"
        />
      </section>
    </main>
  );
}
