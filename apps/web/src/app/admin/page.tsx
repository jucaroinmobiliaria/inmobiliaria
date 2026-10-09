import type { Metadata } from "next";
import { AdminOverviewPage } from "@/components/admin/overview";

export const metadata: Metadata = { title: "Resumen" };

export default function Page() {
  return <AdminOverviewPage />;
}
