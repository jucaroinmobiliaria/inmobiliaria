import type { Metadata } from "next";
import { Visits } from "@/components/panel/visits";

export const metadata: Metadata = { title: "Visitas" };

export default function Page() {
  return <Visits />;
}
