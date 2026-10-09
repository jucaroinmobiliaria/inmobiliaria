import type { Metadata } from "next";
import { AdminCatalogs } from "@/components/admin/catalogs";

export const metadata: Metadata = { title: "Catálogos" };

export default function Page() {
  return <AdminCatalogs />;
}
