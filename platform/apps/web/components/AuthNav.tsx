"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, getCurrentUser, logout } from "../lib/auth";

/** Client-island for the nav's auth area so the rest of the homepage can stay a server component. */
export function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white/80">{user.firstName}</span>
        <button
          type="button"
          onClick={() => {
            logout();
            router.refresh();
            setUser(null);
          }}
          className="rounded-lg border border-white/70 px-5 py-2 font-medium text-white transition hover:bg-white hover:text-charcoal"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/login" className="text-white/70 transition hover:text-white">
        Log in
      </Link>
      <Link href="/signup" className="rounded-lg border border-white/70 px-5 py-2 font-medium text-white transition hover:bg-white hover:text-charcoal">
        Sign up
      </Link>
    </div>
  );
}
