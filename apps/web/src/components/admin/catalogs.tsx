"use client";

import { useEffect, useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { AmenityCategory, Catalog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { ICONS, Icon, Pencil, Plus, Search, Trash2 } from "@/components/ui/icon";
import { Badge, Tabs } from "@/components/ui/misc";
import { ConfirmDialog, ErrorState, Modal, PageHeader, SearchBox, errText, fieldErrors, useAction, useData } from "@/components/panel/common";
import { DataTable, FilterBar, FilterSelect, type Column } from "./ui";

type Kind = "types" | "amenities" | "cities" | "neighborhoods";
const KIND_LABEL: Record<Kind, { tab: string; one: string; plural: string; f?: boolean }> = {
  types: { tab: "Tipos", one: "tipo de inmueble", plural: "tipos de inmueble" },
  amenities: { tab: "Comodidades", one: "comodidad", plural: "comodidades", f: true },
  cities: { tab: "Ciudades", one: "ciudad", plural: "ciudades", f: true },
  neighborhoods: { tab: "Barrios", one: "barrio", plural: "barrios" },
};
const GROUP_LABEL: Record<string, string> = { residential: "Residencial", commercial: "Comercial", rural: "Rural", land: "Terrenos" };
const groupLabel = (g: unknown) => GROUP_LABEL[String(g)] ?? String(g);
const CATEGORY: Record<AmenityCategory, string> = { INTERIOR: "Interior", BUILDING: "Edificio", EXTERIOR: "Exterior", SURROUNDINGS: "Alrededores" };

type Item = { id: string; name: string; slug: string; [k: string]: unknown };
type Form = Record<string, string>;
type Editing = { kind: Kind; item: Item | null } | null;

export function AdminCatalogs() {
  const [kind, setKind] = useState<Kind>("types");
  const [ver, setVer] = useState(0);
  const { data, error, isLoading, mutate } = useData<Catalog>(`/catalog?v=${ver}`);
  const [editing, setEditing] = useState<Editing>(null);
  const [del, setDel] = useState<{ kind: Kind; item: Item } | null>(null);
  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState("");
  const { busy, run } = useAction();

  useEffect(() => setQ(""), [kind]);
  useEffect(() => { if (!cityId && data?.cities[0]) setCityId(data.cities[0].id); }, [data, cityId]);

  const refresh = async () => { setVer((v) => v + 1); void globalMutate((k) => typeof k === "string" && k.startsWith("/catalog")); };

  const rows: Item[] = useMemo(() => {
    if (!data) return [];
    const base = kind === "types" ? data.types : kind === "amenities" ? data.amenities : kind === "cities" ? data.cities : (data.cities.find((c) => c.id === cityId)?.neighborhoods ?? []);
    const t = q.trim().toLowerCase();
    return (base as unknown as Item[]).filter((r) => !t || r.name.toLowerCase().includes(t) || r.slug.toLowerCase().includes(t));
  }, [data, kind, q, cityId]);

  const remove = () => run(async () => {
    if (!del) return;
    try {
      await api(`/admin/catalog/${del.kind}/${del.item.id}`, { method: "DELETE" });
      toast.success(`Eliminado: ${del.item.name}`);
      setDel(null);
      await refresh();
    } catch (e) { toast.error(errText(e, "No se pudo eliminar. Es posible que esté en uso por alguna publicación.")); setDel(null); }
  });

  const actions: Column<Item> = {
    key: "actions", header: "Acciones", srHeader: true, align: "right", className: "w-28",
    cell: (r) => (
      <div className="flex justify-end gap-1.5">
        <Button size="icon-sm" variant="outline" aria-label={`Editar ${r.name}`} onClick={() => setEditing({ kind, item: r })}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon-sm" variant="outline" aria-label={`Eliminar ${r.name}`} onClick={() => setDel({ kind, item: r })} className="hover:!border-danger hover:!text-danger"><Trash2 className="h-4 w-4" /></Button>
      </div>
    ),
  };
  const nameCol = (withIcon: boolean): Column<Item> => ({ key: "name", header: "Nombre", cell: (r) => (
    <div className="flex items-center gap-3">{withIcon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon name={String(r.icon ?? "check")} size={18} /></span>}<div className="min-w-0"><p className="font-semibold">{r.name}</p><p className="font-mono text-xs text-ink-3">{r.slug}</p></div></div>
  ) });
  const coord: Column<Item> = { key: "coord", header: "Coordenadas", from: "md", cell: (r) => <span className="whitespace-nowrap font-mono text-xs text-ink-2">{Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}</span> };

  const columns: Column<Item>[] = kind === "types"
    ? [nameCol(true), { key: "plural", header: "Plural", from: "sm", cell: (r) => String(r.pluralName) }, { key: "group", header: "Grupo", from: "md", cell: (r) => <Badge tone="neutral">{groupLabel(r.group)}</Badge> }, actions]
    : kind === "amenities"
      ? [nameCol(true), { key: "cat", header: "Categoría", cell: (r) => <Badge tone="brand">{CATEGORY[r.category as AmenityCategory] ?? String(r.category)}</Badge> }, actions]
      : kind === "cities"
        ? [nameCol(false), { key: "dep", header: "Departamento", from: "sm", cell: (r) => String(r.department) }, coord, { key: "n", header: "Barrios", from: "md", align: "right", cell: (r) => <span className="tabular">{(r.neighborhoods as unknown[] | undefined)?.length ?? 0}</span> }, { key: "count", header: "Publicadas", from: "lg", align: "right", cell: (r) => <span className="tabular">{String(r.count ?? 0)}</span> }, actions]
        : [nameCol(false), coord, actions];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Administración" title="Catálogos" description="Tipos de inmueble, comodidades, ciudades y barrios que aparecen en filtros y formularios."
        actions={<Button onClick={() => setEditing({ kind, item: null })} disabled={kind === "neighborhoods" && !data?.cities.length}><Plus className="h-[18px] w-[18px]" />{KIND_LABEL[kind].f ? "Nueva" : "Nuevo"} {KIND_LABEL[kind].one}</Button>} />

      <Tabs value={kind} onChange={setKind} items={(Object.keys(KIND_LABEL) as Kind[]).map((k) => ({ value: k, label: KIND_LABEL[k].tab, count: data ? (k === "neighborhoods" ? data.cities.reduce((a, c) => a + c.neighborhoods.length, 0) : data[k].length) : undefined }))} />

      <FilterBar>
        {kind === "neighborhoods" && data && (
          <FilterSelect label="Ciudad" value={cityId} onChange={setCityId} className="w-full sm:w-60">
            {data.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
        )}
        <SearchBox className="w-full sm:w-72" value={q} onChange={setQ} placeholder={`Buscar ${KIND_LABEL[kind].plural}`} label={`Buscar ${KIND_LABEL[kind].plural}`} />
        {data && <p className="text-sm text-ink-3 sm:ml-auto"><strong className="text-ink tabular">{rows.length}</strong> {rows.length === 1 ? KIND_LABEL[kind].one : KIND_LABEL[kind].plural}</p>}
      </FilterBar>

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : (
        <DataTable<Item> caption={`Catálogo de ${KIND_LABEL[kind].plural}`} columns={columns} rows={data ? rows : undefined} rowKey={(r) => r.id} loading={isLoading} maxHeight="calc(100dvh - 19rem)"
          emptyTitle={`No hay ${KIND_LABEL[kind].plural}`} emptyText={q ? "Ningún resultado coincide con la búsqueda." : `Crea el primer ${KIND_LABEL[kind].one} con el botón de arriba.`} />
      )}

      {editing && data && <CatalogDialog editing={editing} catalog={data} defaultCityId={cityId} onClose={() => setEditing(null)} onSaved={async (saved) => { if (saved?.cityId) setCityId(saved.cityId); setEditing(null); await refresh(); }} />}

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`¿Eliminar ${del ? KIND_LABEL[del.kind].one : ""}?`} confirmLabel="Eliminar" loading={busy} onConfirm={() => void remove()}
        description={<>Se eliminará <strong>{del?.item.name}</strong> del catálogo. {del?.kind === "cities" ? "También se eliminarán sus barrios. " : ""}Si alguna publicación lo usa, la operación se rechazará.</>} />
    </div>
  );
}

/* ------------------------------------------------------------ Formulario */

function initialForm(kind: Kind, item: Item | null, defaultCityId: string): Form {
  const s = (v: unknown) => (v == null ? "" : String(v));
  if (kind === "types") return { name: s(item?.name), pluralName: s(item?.pluralName), icon: s(item?.icon) || "home", group: s(item?.group) || "residential" };
  if (kind === "amenities") return { name: s(item?.name), icon: s(item?.icon) || "check", category: s(item?.category) || "INTERIOR" };
  if (kind === "cities") return { name: s(item?.name), department: s(item?.department), lat: s(item?.lat), lng: s(item?.lng), coverUrl: s(item?.coverUrl) };
  return { cityId: defaultCityId, name: s(item?.name), lat: s(item?.lat), lng: s(item?.lng) };
}

function CatalogDialog({ editing, catalog, defaultCityId, onClose, onSaved }: { editing: NonNullable<Editing>; catalog: Catalog; defaultCityId: string; onClose: () => void; onSaved: (saved?: { cityId?: string }) => Promise<void> }) {
  const { kind, item } = editing;
  const [f, setF] = useState<Form>(() => initialForm(kind, item, defaultCityId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  const set = (k: string, v: string) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };
  const groups = [...new Set(catalog.types.map((t) => t.group))];
  const label = KIND_LABEL[kind].one;

  const validate = () => {
    const e: Record<string, string> = {};
    const req = (k: string, msg: string) => { if (!f[k]?.trim()) e[k] = msg; };
    req("name", "Escribe un nombre.");
    if (kind === "types") { req("pluralName", "Escribe el plural (ej. Apartamentos)."); req("group", "Elige o escribe un grupo."); }
    if (kind === "cities") req("department", "Escribe el departamento.");
    if (kind === "neighborhoods") req("cityId", "Elige una ciudad.");
    if (kind === "cities" || kind === "neighborhoods") {
      for (const [k, min, max, nm] of [["lat", -90, 90, "Latitud"], ["lng", -180, 180, "Longitud"]] as const) {
        const raw = f[k]?.trim().replace(",", ".");
        if (!raw) e[k] = `${nm} es obligatoria.`;
        else if (!Number.isFinite(Number(raw)) || Number(raw) < min || Number(raw) > max) e[k] = `${nm} debe estar entre ${min} y ${max}.`;
      }
      if (!e.lat && !e.lng && (Number(f.lat.replace(",", ".")) < -5 || Number(f.lat.replace(",", ".")) > 14 || Number(f.lng.replace(",", ".")) < -82 || Number(f.lng.replace(",", ".")) > -66)) e.lng = "Estas coordenadas quedan fuera de Colombia. Verifica latitud y longitud.";
    }
    if (kind === "cities" && f.coverUrl.trim() && !/^https?:\/\/\S+/.test(f.coverUrl.trim())) e.coverUrl = "Pega un enlace que empiece por https://";
    return e;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const num = (k: string) => Number(f[k]!.trim().replace(",", "."));
    const body: Record<string, unknown> =
      kind === "types" ? { name: f.name.trim(), pluralName: f.pluralName.trim(), icon: f.icon, group: f.group.trim() }
      : kind === "amenities" ? { name: f.name.trim(), icon: f.icon, category: f.category }
      : kind === "cities" ? { name: f.name.trim(), department: f.department.trim(), lat: num("lat"), lng: num("lng"), coverUrl: f.coverUrl.trim() || null }
      : { ...(item ? {} : { cityId: f.cityId }), name: f.name.trim(), lat: num("lat"), lng: num("lng") };
    void run(async () => {
      try {
        if (item) await api(`/admin/catalog/${kind}/${item.id}`, { method: "PATCH", body });
        else await api(`/admin/catalog/${kind}`, { method: "POST", body });
        toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} ${item ? "actualizad" : "cread"}${KIND_LABEL[kind].f ? "a" : "o"}`);
        await onSaved(kind === "neighborhoods" ? { cityId: f.cityId } : undefined);
      } catch (err) {
        const fe = fieldErrors(err);
        setErrors(fe);
        toast.error(Object.keys(fe).length ? "Revisa los campos marcados." : errText(err));
      }
    });
  };

  return (
    <Modal open onClose={busy ? () => undefined : onClose} title={`${item ? "Editar" : KIND_LABEL[kind].f ? "Nueva" : "Nuevo"} ${label}`} size="md" sheet>
      <form onSubmit={submit} noValidate className="grid gap-4 p-6">
        {kind === "neighborhoods" && (
          <Select label="Ciudad" required value={f.cityId} onChange={(e) => set("cityId", e.target.value)} disabled={!!item} error={errors.cityId} hint={item ? "Un barrio no puede cambiar de ciudad." : undefined}>
            {catalog.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <Input label="Nombre" required data-autofocus="" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={80} />
        {kind === "types" && (
          <>
            <Input label="Nombre en plural" required value={f.pluralName} onChange={(e) => set("pluralName", e.target.value)} error={errors.pluralName} maxLength={80} />
            <Select label="Grupo" value={f.group} onChange={(e) => set("group", e.target.value)} error={errors.group} hint="Agrupa los tipos en los filtros del buscador.">
              {[...new Set([...Object.keys(GROUP_LABEL), ...groups])].map((g) => <option key={g} value={g}>{groupLabel(g)}</option>)}
            </Select>
          </>
        )}
        {kind === "amenities" && (
          <Select label="Categoría" value={f.category} onChange={(e) => set("category", e.target.value)} error={errors.category}>
            {(Object.keys(CATEGORY) as AmenityCategory[]).map((c) => <option key={c} value={c}>{CATEGORY[c]}</option>)}
          </Select>
        )}
        {(kind === "types" || kind === "amenities") && <IconPicker value={f.icon} onChange={(v) => set("icon", v)} />}
        {kind === "cities" && <Input label="Departamento" required value={f.department} onChange={(e) => set("department", e.target.value)} error={errors.department} maxLength={80} />}
        {(kind === "cities" || kind === "neighborhoods") && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Input label="Latitud" required inputMode="decimal" value={f.lat} onChange={(e) => set("lat", e.target.value)} error={errors.lat} placeholder="6.2442" />
            <Input label="Longitud" required inputMode="decimal" value={f.lng} onChange={(e) => set("lng", e.target.value)} error={errors.lng} placeholder="-75.5812" />
          </div>
        )}
        {kind === "cities" && <Input label="Foto de portada (enlace)" type="url" inputMode="url" value={f.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} error={errors.coverUrl} placeholder="https://…" hint="Opcional. Se muestra en la portada y en destinos." />}
        {item && <p className="text-xs text-ink-3">Identificador (slug): <span className="font-mono">{item.slug}</span> · se genera automáticamente y no cambia.</p>}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}>{item ? "Guardar cambios" : `Crear ${label}`}</Button>
        </div>
      </form>
    </Modal>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const names = useMemo(() => Object.keys(ICONS).filter((n) => n.includes(q.trim().toLowerCase())), [q]);
  return (
    <div className="grid gap-1.5">
      <span id="icon-label" className="text-sm font-semibold">Icono</span>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-labelledby="icon-label" className="flex h-12 items-center gap-3 rounded-[12px] border border-field/60 bg-white px-4 text-left text-[15px] hover:border-ink">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon name={value} size={18} /></span>
        <span className="flex-1 font-medium">{value}</span><span className="text-sm text-ink-3">{open ? "Cerrar" : "Cambiar"}</span>
      </button>
      {open && (
        <div className="rounded-2xl border border-line p-3">
          <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar icono" placeholder="Buscar icono…" className="h-10 w-full rounded-full border border-line-strong pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" /></div>
          <ul className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-7" role="listbox" aria-label="Iconos disponibles">
            {names.map((n) => (
              <li key={n} role="option" aria-selected={n === value}>
                <button type="button" onClick={() => { onChange(n); setOpen(false); }} title={n} aria-label={n}
                  className={cn("grid h-11 w-full place-items-center rounded-xl border transition", n === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-transparent text-ink-2 hover:bg-surface")}><Icon name={n} size={20} /></button>
              </li>
            ))}
            {names.length === 0 && <li className="col-span-full py-4 text-center text-sm text-ink-3">Ningún icono coincide.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
