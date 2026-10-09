import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/server";
import { PanelShell } from "@/components/panel/panel-shell";
import { PageSkeleton } from "@/components/panel/common";

export const metadata: Metadata = { title: "Mi panel", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/panel");
  return (
    <PanelShell user={user}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </PanelShell>
  );
}
