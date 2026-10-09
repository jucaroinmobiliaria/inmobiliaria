import type { Metadata } from "next";
import { Moderation } from "@/components/admin/moderation";

export const metadata: Metadata = { title: "Moderación" };

export default function Page() {
  return <Moderation />;
}
