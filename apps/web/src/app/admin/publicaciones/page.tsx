import type { Metadata } from "next";
import { AdminPublications } from "@/components/admin/publications";

export const metadata: Metadata = { title: "Publicaciones" };

export default function Page() {
  return <AdminPublications />;
}
