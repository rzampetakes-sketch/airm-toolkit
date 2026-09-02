"use client";

import Script from "next/script";

/**
 * Persistent bottom-right chat, on every page, via a third-party widget
 * (Crisp) rather than a custom-built one — see ARCHITECTURE.md's "Live
 * chat" section for why. Renders nothing if
 * NEXT_PUBLIC_CRISP_WEBSITE_ID isn't set, so local dev without a Crisp
 * account doesn't break.
 */
export function LiveChatWidget() {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  if (!websiteId) return null;

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
