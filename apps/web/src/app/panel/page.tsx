import type { Metadata } from "next";
import { Overview } from "@/components/panel/overview";

export const metadata: Metadata = { title: "Resumen" };

export default async function PanelHome({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  return <Overview notice={aviso} />;
}
