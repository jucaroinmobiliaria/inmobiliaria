"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "@/components/ui/form";
import { Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { CatalogCityHit, CatalogNeighborhood } from "@/lib/types";
import { Callout, SectionTitle } from "./fields";
import { PlaceField, type PlaceOption } from "./place-field";
import type { StepProps } from "./types";
import { Info } from "@/components/ui/icon";

const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => <div className="skeleton h-[300px] w-full rounded-[24px] sm:h-[340px]" aria-label="Cargando mapa" />,
});

const COLOMBIA = { lat: 4.65, lng: -74.1, zoom: 5 };

function toCityOpt(c: { id: string; name: string; department: string }): PlaceOption {
  return { id: c.id, label: c.name, sublabel: c.department };
}

export function StepLocation({ draft, catalog, update, errors, city: catalogCity }: StepProps) {
  const [cities, setCities] = useState<CatalogCityHit[]>(() =>
    catalog.cities.map((c) => ({ id: c.id, slug: c.slug, name: c.name, department: c.department, lat: c.lat, lng: c.lng })),
  );
  const [hoods, setHoods] = useState<CatalogNeighborhood[]>(catalogCity?.neighborhoods ?? []);
  const [cityQuery, setCityQuery] = useState("");
  const [hoodQuery, setHoodQuery] = useState("");
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [hoodsLoading, setHoodsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const touched = useRef(draft.lat != null && draft.lng != null);

  const city = useMemo(
    () => cities.find((c) => c.id === draft.cityId) ?? (catalogCity ? { id: catalogCity.id, slug: catalogCity.slug, name: catalogCity.name, department: catalogCity.department, lat: catalogCity.lat, lng: catalogCity.lng } : undefined),
    [cities, draft.cityId, catalogCity],
  );
  const hood = hoods.find((n) => n.id === draft.neighborhoodId) ?? catalogCity?.neighborhoods.find((n) => n.id === draft.neighborhoodId);

  useEffect(() => {
    let alive = true;
    setCitiesLoading(true);
    api<CatalogCityHit[]>("/catalog/cities")
      .then((rows) => {
        if (!alive || !Array.isArray(rows)) return;
        setCities((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          for (const c of rows) map.set(c.id, c);
          return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
        });
      })
      .catch(() => { /* el catálogo del asistente sigue siendo el respaldo */ })
      .finally(() => { if (alive) setCitiesLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!draft.cityId) { setHoods([]); return; }
    let alive = true;
    setHoodsLoading(true);
    const fromCatalog = catalog.cities.find((c) => c.id === draft.cityId)?.neighborhoods ?? [];
    if (fromCatalog.length) setHoods(fromCatalog);
    api<CatalogNeighborhood[]>("/catalog/neighborhoods", { query: { cityId: draft.cityId } })
      .then((rows) => { if (alive && Array.isArray(rows)) setHoods(rows); })
      .catch(() => {})
      .finally(() => { if (alive) setHoodsLoading(false); });
    return () => { alive = false; };
  }, [draft.cityId, catalog.cities]);

  const center = useMemo(() => {
    if (hood) return { lat: hood.lat, lng: hood.lng, zoom: 14.5 };
    if (city) return { lat: city.lat, lng: city.lng, zoom: 12 };
    return COLOMBIA;
  }, [city, hood]);
  const flyKey = `${city?.id ?? "-"}:${hood?.id ?? "-"}`;

  const pickCity = (opt: PlaceOption) => {
    setCityQuery("");
    if (opt.id === draft.cityId) return;
    touched.current = false;
    setHoodQuery("");
    update({ cityId: opt.id, neighborhoodId: null, lat: null, lng: null });
  };
  const applyHood = (n: CatalogNeighborhood) => {
    setHoodQuery("");
    const patch: Parameters<StepProps["update"]>[0] = { neighborhoodId: n.id };
    if (!touched.current) { patch.lat = n.lat; patch.lng = n.lng; }
    update(patch);
  };
  const pickHood = (opt: PlaceOption) => {
    if (opt.id === "__create__") { void createHood(opt.label); return; }
    const n = hoods.find((h) => h.id === opt.id);
    if (n) applyHood(n);
  };
  const createHood = async (name: string) => {
    if (!draft.cityId || creating) return;
    setCreating(true);
    try {
      const n = await api<CatalogNeighborhood>("/catalog/neighborhoods", { method: "POST", body: { cityId: draft.cityId, name } });
      setHoods((prev) => prev.some((h) => h.id === n.id) ? prev : [...prev, n].sort((a, b) => a.name.localeCompare(b.name, "es")));
      applyHood(n);
    } catch {
      toast.error("No pudimos guardar el barrio. Inténtalo de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const pin = draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : null;
  const cityValue = city ? toCityOpt(city) : null;
  const hoodValue = hood ? { id: hood.id, label: hood.name } : null;
  const cityOptions = cities.map(toCityOpt);
  const hoodOptions = hoods.map((n) => ({ id: n.id, label: n.name }));

  return (
    <div className="grid gap-8">
      <div className="grid gap-5">
        <PlaceField
          label="Ciudad"
          error={errors.cityId}
          value={cityValue}
          placeholder="Escribe una ciudad o municipio"
          options={cityOptions}
          loading={citiesLoading}
          query={cityQuery}
          onQuery={setCityQuery}
          onPick={pickCity}
          onClear={() => { setCityQuery(""); }}
          hint={cities.length > 8 ? `Busca entre ${cities.length.toLocaleString("es-CO")} municipios de Colombia.` : undefined}
          empty={cityQuery.trim() ? `Sin coincidencias para “${cityQuery.trim()}”. Prueba con otro nombre o el departamento.` : citiesLoading ? "Cargando ciudades…" : `Escribe para buscar. Hay ${cities.length.toLocaleString("es-CO")} municipios.`}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <PlaceField
            label="Barrio o sector"
            hint={city ? "Opcional. Si no aparece, escríbelo y elígelo para agregarlo." : "Primero elige la ciudad."}
            error={errors.neighborhoodId}
            value={hoodValue}
            placeholder={city ? "Escribe el barrio o sector" : "Elige la ciudad primero"}
            disabled={!city || creating}
            options={hoodOptions}
            loading={hoodsLoading || creating}
            query={hoodQuery}
            onQuery={setHoodQuery}
            onPick={pickHood}
            onClear={() => { setHoodQuery(""); update({ neighborhoodId: null }); }}
            empty={hoodQuery.trim() ? `No hay un barrio con ese nombre. Elige “Usar «${hoodQuery.trim()}»” para agregarlo.` : "Aún no hay barrios en esta ciudad. Escribe el tuyo para agregarlo."}
            allowCreate
            createHint="Agregar este barrio"
          />
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
