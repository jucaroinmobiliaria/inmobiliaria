import type { Metadata } from "next";
import { Account } from "@/components/panel/account";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function Page() {
  return <Account />;
}
