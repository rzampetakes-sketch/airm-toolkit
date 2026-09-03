"use client";

import dynamic from "next/dynamic";

const RouteMapInner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-azure-light" />,
});

export function RouteMap({ originCode, destinationCode }: { originCode: string; destinationCode: string }) {
  return <RouteMapInner originCode={originCode} destinationCode={destinationCode} />;
}
