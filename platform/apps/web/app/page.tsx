export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl md:text-6xl text-white">
        Business Class. First Class. No Economy.
      </h1>
      <p className="mt-4 max-w-2xl text-white/70">
        Search scaffold — wire this page up to{" "}
        <code className="text-orange">GET /api/v1/flights/search</code> and{" "}
        <code className="text-orange">GET /api/v1/empty-legs/search</code> in{" "}
        <code>apps/api</code> to render live results.
      </p>
    </main>
  );
}
