"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import { Select } from "@/components/ui/form";
import { Switch } from "@/components/ui/form";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { Callout, FieldBlock, SectionTitle } from "./fields";
import type { StepProps } from "./types";
import { Info, MapPin } from "@/components/ui/icon";

const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => <div className="skeleton h-[300px] w-full rounded-[24px] sm:h-[340px]" aria-label="Cargando mapa" />,
});

const COLOMBIA = { lat: 4.65, lng: -74.1, zoom: 5 };

export function StepLocation({ draft, catalog, update, errors, city }: StepProps) {
  const hood = city?.neighborhoods.find((n) => n.id === draft.neighborhoodId);
  const touched = useRef(draft.lat != null && draft.lng != null);

  const center = useMemo(() => {
    if (hood) return { lat: hood.lat, lng: hood.lng, zoom: 14.5 };
    if (city) return { lat: city.lat, lng: city.lng, zoom: 12 };
    return COLOMBIA;
  }, [city, hood]);
  const flyKey = `${city?.id ?? "-"}:${hood?.id ?? "-"}`;

  const pickCity = (id: string) => {
    if (id === draft.cityId) return;
    // Otra ciudad = el pin anterior ya no sirve: se reinicia y el mapa vuela a la nueva ciudad.
    touched.current = false;
    update({ cityId: id, neighborhoodId: null, lat: null, lng: null });
  };
  const pickHood = (id: string) => {
    const nid = id || null;
    const h = city?.neighborhoods.find((n) => n.id === nid);
    const patch: Parameters<StepProps["update"]>[0] = { neighborhoodId: nid };
    if (h && !touched.current) { patch.lat = h.lat; patch.lng = h.lng; }
    update(patch);
  };

  const pin = draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : null;

  return (
    <div className="grid gap-8">
      <div className="grid gap-5">
        <FieldBlock label="Ciudad" error={errors.cityId}>
          {catalog.cities.length <= 8 ? (
            <div role="radiogroup" aria-label="Ciudad" className="flex flex-wrap gap-2">
              {catalog.cities.map((c) => {
                const on = draft.cityId === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => pickCity(c.id)}
                    className={cn("inline-flex h-12 items-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-all active:scale-95", on ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink")}>
                    <MapPin className="h-4 w-4 opacity-70" />{c.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <Select value={draft.cityId ?? ""} onChange={(e) => pickCity(e.target.value)} aria-label="Ciudad">
              <option value="" disabled>Selecciona una ciudad</option>
              {catalog.cities.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.department}</option>)}
            </Select>
          )}
        </FieldBlock>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Barrio o sector" value={draft.neighborhoodId ?? ""} onChange={(e) => pickHood(e.target.value)} disabled={!city}
            hint={city ? "Opcional, pero ayuda mucho en las búsquedas." : "Primero elige la ciudad."}
          >
            <option value="">{city ? "Selecciona un barrio" : "—"}</option>
            {city?.neighborhoods.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </Select>
          <Input
            label="Dirección" placeholder="Ej: Carrera 43A # 1 Sur - 50" value={draft.address ?? ""} maxLength={160} autoComplete="street-address"
            onChange={(e) => update({ address: e.target.value || null })} hint="Opcional."
          />
        </div>

        <div className="rounded-[20px] border border-line bg-white p-4 sm:p-5">
          <Switch
            checked={draft.hideAddress} onChange={(v) => update({ hideAddress: v })}
            label="Ocultar mi dirección exacta"
            description="Mostraremos solo una zona aproximada en el mapa y no publicaremos la dirección."
          />
        </div>
      </div>

      <div>
        <SectionTitle hint="Toca el mapa o arrastra el pin para ubicar tu inmueble.">Ubicación en el mapa</SectionTitle>
        <MapPicker
          center={center} flyKey={flyKey} value={pin} approximate={draft.hideAddress}
          onChange={(lat, lng) => { touched.current = true; update({ lat, lng }); }}
        />
        {draft.hideAddress ? (
          <Callout className="mt-3" icon={<Info className="h-[18px] w-[18px]" />}>
            <b className="font-semibold">Zona aproximada:</b> los interesados verán un círculo alrededor de tu inmueble, no el punto exacto.
          </Callout>
        ) : (
          <Callout tone="warn" className="mt-3">Con la dirección visible, los interesados verán el punto exacto del pin en el mapa.</Callout>
        )}
      </div>
    </div>
  );
}
