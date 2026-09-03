"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "../../lib/api";
import { login } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-sm text-azure underline underline-offset-4">
        &larr; Back home
      </Link>
      <h1 className="font-display text-3xl font-semibold text-charcoal">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-charcoal/10 bg-panel p-8 shadow-sm">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-azure py-3 font-display text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal/60">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-azure underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      {children}
    </label>
  );
}
