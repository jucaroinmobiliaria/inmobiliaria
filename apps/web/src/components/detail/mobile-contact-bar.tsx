"use client";

import { useState } from "react";
import { formatPrice, whatsappLink } from "@/lib/format";
import { SITE, absoluteUrl } from "@/lib/site";
import type { PublicationDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/misc";
import { WhatsAppIcon } from "@/components/ui/icon";
import { ContactCard } from "./contact-card";

export function MobileContactBar({ pub }: { pub: PublicationDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden">
        <div className="container-x flex items-center justify-between gap-3 pt-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[1.7rem] leading-none tabular">{formatPrice(pub.price, pub.currency)}{pub.operation === "RENT" && <span className="ml-1 font-sans text-xs font-medium text-ink-3">/ mes</span>}</p>
            <p className="mt-1 truncate text-[12px] text-ink-3">Código #{pub.code}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={whatsappLink(pub.contact.whatsapp || SITE.whatsapp, `Hola, vi “${pub.title}” (código #${pub.code}) en Jucaro: ${absoluteUrl(pub.path)}`)} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp"
              className="grid h-12 w-12 place-items-center rounded-full border border-[#25D366]/60 text-[#1ebe5b] transition active:scale-95"><WhatsAppIcon size={22} /></a>
            <Button size="lg" className="h-12 px-6" onClick={() => setOpen(true)}>Contactar</Button>
          </div>
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Contactar al anunciante" sheet size="md">
        <div className="p-5"><ContactCard pub={pub} variant="sheet" /></div>
      </Dialog>
    </>
  );
}
