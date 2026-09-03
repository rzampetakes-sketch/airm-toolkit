"use client";

import Script from "next/script";
import { useState } from "react";

/**
 * Persistent bottom-right chat, on every page (mounted once in
 * app/layout.tsx), via a third-party widget (Crisp) rather than a
 * custom-built one — see ARCHITECTURE.md's "Live chat" section for why.
 * With no NEXT_PUBLIC_CRISP_WEBSITE_ID configured (the case for local
 * dev), falls back to a static, on-brand placeholder bubble instead of
 * rendering nothing, so the real app still shows what this becomes.
 */
export function LiveChatWidget() {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

  if (websiteId) {
    return (
      <Script id="crisp-chat" strategy="afterInteractive">
        {`
          window.$crisp = [];
          window.CRISP_WEBSITE_ID = "${websiteId}";
          (function () {
            var d = document, s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = 1;
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
        `}
      </Script>
    );
  }

  return <ChatWidgetPlaceholder />;
}

function ChatWidgetPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-72 rounded-xl border border-gold/30 bg-panel p-5 shadow-xl">
          <p className="font-display text-lg text-cream">We&apos;re here to help</p>
          <p className="mt-2 text-sm text-cream/70">
            Live chat connects here once a Crisp account is configured (
            <code className="text-gold">NEXT_PUBLIC_CRISP_WEBSITE_ID</code>).
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open live chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-burgundy text-cream shadow-lg ring-1 ring-gold/40 transition hover:bg-burgundy-dark"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </div>
  );
}
