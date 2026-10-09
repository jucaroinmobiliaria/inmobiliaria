import type { Metadata } from "next";
import { Listings } from "@/components/panel/listings";

export const metadata: Metadata = { title: "Mis publicaciones" };

export default function Page() {
  return <Listings />;
}
