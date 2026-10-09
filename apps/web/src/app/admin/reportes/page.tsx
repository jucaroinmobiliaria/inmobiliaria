import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/reports";

export const metadata: Metadata = { title: "Reportes" };

export default function Page() {
  return <AdminReports />;
}
