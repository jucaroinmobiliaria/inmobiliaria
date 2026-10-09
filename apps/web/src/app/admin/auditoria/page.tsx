import type { Metadata } from "next";
import { AdminAudit } from "@/components/admin/audit";

export const metadata: Metadata = { title: "Auditoría" };

export default function Page() {
  return <AdminAudit />;
}
