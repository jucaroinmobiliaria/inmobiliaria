import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageSkeleton } from "@/components/panel/common";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración · Jucaro" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/admin", ["ADMIN"]);
  return (
    <AdminShell user={user}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AdminShell>
  );
}
