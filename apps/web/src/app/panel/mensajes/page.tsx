import type { Metadata } from "next";
import { Inbox } from "@/components/panel/inbox";

export const metadata: Metadata = { title: "Mensajes" };

export default function Page() {
  return <Inbox />;
}
