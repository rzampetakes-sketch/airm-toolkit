import Link from "next/link";
import { AuthNav } from "../components/AuthNav";
import { TravelModeFlow } from "../components/TravelModeFlow";

const NAV_LINKS = [
  { label: "Flights", href: "/flights", enabled: true },
  { label: "My Trips", href: "#", enabled: false },
  { label: "Services", href: "#", enabled: false },
  { label: "Corporate", href: "#", enabled: false },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-charcoal">
      <div className="relative overflow-hidden bg-[#161d27]">
        {/* Blurred cabin-wall backdrop behind the two focused windows, echoing the reference photo's out-of-focus fuselage. */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/2 h-[140%] w-72 -translate-y-1/2 rounded-full bg-[#232c39] opacity-70 blur-3xl" />
          <div className="absolute -right-24 top-1/2 h-[140%] w-72 -translate-y-1/2 rounded-full bg-[#232c39] opacity-70 blur-3xl" />
        </div>

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="font-display text-2xl font-semibold tracking-wide text-white">Aeros</div>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {NAV_LINKS.map((link) =>
              link.enabled ? (
                <Link key={link.label} href={link.href} className="border-b border-white pb-1 text-white">
                  {link.label}
                </Link>
              ) : (
                <span key={link.label} className="cursor-default text-white/40">
                  {link.label}
                </span>
              ),
            )}
          </nav>
          <AuthNav />
        </header>

        <section className="relative mx-auto max-w-3xl px-6 pb-10 pt-6 text-center">
          <h1 className="font-display text-5xl font-semibold leading-tight text-white md:text-6xl">
            Book your next business trip
          </h1>
          <p className="mt-4 text-lg text-white/70">Choose how you want to travel</p>
          <div className="mx-auto mt-4 h-6 w-px bg-white/50" />
        </section>

        <TravelModeFlow />
      </div>
    </main>
  );
}
