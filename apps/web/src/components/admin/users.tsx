"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { AdminUserRow, Paginated, Role } from "@/lib/types";
import { Avatar, Badge } from "@/components/ui/misc";
import { BadgeCheck, Ban, Lock } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ErrorState, PageHeader, SearchBox, errText, useAction, useData, useDebounced } from "@/components/panel/common";
import { DataTable, FilterBar, FilterSelect, type Column } from "./ui";

const PAGE_SIZE = 20;
const ROLES: { value: Role; label: string }[] = [{ value: "USER", label: "Usuario" }, { value: "OWNER", label: "Propietario" }, { value: "AGENT", label: "Agente" }, { value: "ADMIN", label: "Administrador" }];
const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r;

type Change =
  | { kind: "role"; user: AdminUserRow; role: Role }
  | { kind: "status"; user: AdminUserRow; status: "ACTIVE" | "BLOCKED" }
  | { kind: "verified"; user: AdminUserRow; verified: boolean };

export function AdminUsers() {
  const sp = useSearchParams();
  const { user: me } = useSession();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q, 350);
  const [change, setChange] = useState<Change | null>(null);
  const { busy, run } = useAction();

  const paramQ = sp.get("q");
  useEffect(() => { setQ(paramQ ?? ""); setPage(1); }, [paramQ]);
  useEffect(() => setPage(1), [dq, role]);

  const key = `/admin/users${qs({ q: dq.trim(), role, page, pageSize: PAGE_SIZE })}`;
  const { data, error, isLoading, isValidating, mutate } = useData<Paginated<AdminUserRow>>(key);

  const apply = (c: Change) => {
    const body = c.kind === "role" ? { role: c.role } : c.kind === "status" ? { status: c.status } : { verified: c.verified };
    const patch = (cur?: Paginated<AdminUserRow>) => (cur ? { ...cur, items: cur.items.map((r) => (r.id === c.user.id ? { ...r, ...body } : r)) } : cur);
    const msg = c.kind === "role" ? `${c.user.name} ahora es ${roleLabel(c.role).toLowerCase()}` : c.kind === "status" ? (c.status === "BLOCKED" ? `${c.user.name} fue bloqueado` : `${c.user.name} fue desbloqueado`) : c.verified ? `${c.user.name} quedó verificado` : `Se quitó la verificación de ${c.user.name}`;
    return run(async () => {
      try {
        await mutate(async (cur) => { await api(`/admin/users/${c.user.id}`, { method: "PATCH", body }); return patch(cur); }, { optimisticData: (cur) => patch(cur) as Paginated<AdminUserRow>, rollbackOnError: true, populateCache: true, revalidate: true });
        toast.success(msg);
        setChange(null);
      } catch (e) { toast.error(errText(e)); setChange(null); }
    });
  };

  const isMe = (u: AdminUserRow) => u.id === me?.id;
  const why = "No puedes modificar tu propia cuenta: así evitamos que pierdas el acceso al panel.";

  const roleSelect = (u: AdminUserRow) => (
    <>
      <label className="sr-only" htmlFor={`role-${u.id}`}>Rol de {u.name}</label>
      <select id={`role-${u.id}`} value={u.role} disabled={isMe(u) || busy} title={isMe(u) ? why : undefined}
        onChange={(e) => setChange({ kind: "role", user: u, role: e.target.value as Role })}
        className="h-9 rounded-full border border-line-strong bg-white px-3 text-sm font-semibold hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-3">
        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </>
  );
  const verifySwitch = (u: AdminUserRow) => (
    <button type="button" role="switch" aria-checked={u.verified} aria-label={`Verificado: ${u.name}`} disabled={isMe(u) || busy} title={isMe(u) ? why : u.verified ? "Quitar verificación" : "Verificar"}
      onClick={() => setChange({ kind: "verified", user: u, verified: !u.verified })}
      className={cn("inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", u.verified ? "border-brand-600/40 bg-brand-50 text-brand-700" : "border-line-strong text-ink-2 hover:border-ink")}>
      <BadgeCheck className="h-4 w-4" />{u.verified ? "Verificado" : "Verificar"}
    </button>
  );
  const blockBtn = (u: AdminUserRow) => (
    <Button size="sm" variant="outline" disabled={isMe(u) || busy} title={isMe(u) ? why : undefined} onClick={() => setChange({ kind: "status", user: u, status: u.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" })}
      className={cn("whitespace-nowrap", u.status !== "BLOCKED" && "hover:!border-danger hover:!text-danger")}>{u.status === "BLOCKED" ? "Desbloquear" : <><Ban className="h-4 w-4" />Bloquear</>}</Button>
  );
  const controls = (u: AdminUserRow) => (
    <div className="flex flex-wrap items-center gap-2.5">{roleSelect(u)}{verifySwitch(u)}{blockBtn(u)}</div>
  );

  const identity = (u: AdminUserRow) => (
    <div className="flex min-w-[210px] items-center gap-3">
      <Avatar name={u.name} size={38} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-semibold">{u.name}{isMe(u) && <Badge tone="brand" className="!px-2 !py-0.5">Tú</Badge>}</p>
        <p className="truncate text-xs text-ink-3">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
        {isMe(u) && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3"><Lock className="h-3 w-3" />Tu cuenta no se puede modificar desde aquí</p>}
      </div>
    </div>
  );

  const columns: Column<AdminUserRow>[] = [
    { key: "user", header: "Usuario", cell: identity },
    { key: "role", header: "Rol", cell: roleSelect },
    { key: "verified", header: "Verificación", cell: verifySwitch },
    { key: "status", header: "Estado", cell: (u) => u.status === "BLOCKED" ? <Badge tone="danger"><Ban className="h-3 w-3" />Bloqueado</Badge> : <Badge tone="success">Activo</Badge> },
    { key: "listings", header: "Avisos", from: "wide", align: "right", cell: (u) => <span className="tabular">{formatNumber(u.listings)}</span> },
    { key: "last", header: "Último acceso", from: "2xl", cell: (u) => <span className="whitespace-nowrap text-ink-2">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Nunca"}</span> },
    { key: "actions", header: "Acciones", srHeader: true, align: "right", cell: blockBtn },
  ];

  const c = change;
  const confirmCopy = !c ? null : c.kind === "role"
    ? { title: `¿Cambiar el rol de ${c.user.name}?`, body: <>Pasará de <strong>{roleLabel(c.user.role)}</strong> a <strong>{roleLabel(c.role)}</strong>.{c.role === "ADMIN" ? " Tendrá acceso total a esta consola de administración." : c.user.role === "ADMIN" ? " Perderá el acceso a esta consola." : ""}</>, label: "Cambiar rol", danger: c.role === "ADMIN" || c.user.role === "ADMIN" }
    : c.kind === "status"
      ? c.status === "BLOCKED"
        ? { title: `¿Bloquear a ${c.user.name}?`, body: <>No podrá iniciar sesión, publicar ni contactar anunciantes. Puedes desbloquearlo cuando quieras.</>, label: "Bloquear usuario", danger: true }
        : { title: `¿Desbloquear a ${c.user.name}?`, body: <>Recuperará el acceso a su cuenta.</>, label: "Desbloquear", danger: false }
      : c.verified
        ? { title: `¿Verificar a ${c.user.name}?`, body: <>Sus avisos se publicarán sin revisión previa y mostrarán la insignia de verificado. Confirma que revisaste su identidad.</>, label: "Verificar", danger: false }
        : { title: `¿Quitar la verificación a ${c.user.name}?`, body: <>Sus próximos avisos volverán a pasar por moderación.</>, label: "Quitar verificación", danger: true };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Administración" title="Usuarios" description="Gestiona roles, verificación y acceso de las personas registradas." />
      <FilterBar>
        <SearchBox className="w-full sm:w-80" value={q} onChange={setQ} placeholder="Nombre, correo o teléfono" label="Buscar usuarios" />
        <FilterSelect label="Filtrar por rol" value={role} onChange={setRole} className="w-full sm:w-52">
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </FilterSelect>
        {data && <p className="text-sm text-ink-3 sm:ml-auto"><strong className="text-ink tabular">{formatNumber(data.total)}</strong> {data.total === 1 ? "usuario" : "usuarios"}</p>}
      </FilterBar>

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : (
        <DataTable<AdminUserRow> caption="Usuarios registrados" columns={columns} rows={data?.items} rowKey={(u) => u.id} loading={isLoading} fetching={isValidating}
          emptyTitle="No encontramos usuarios" emptyText="Prueba con otro nombre, correo o rol."
          rowClassName={(u) => (u.status === "BLOCKED" ? "bg-danger-soft/30" : undefined)}
          pagination={data ? { page: data.page, totalPages: data.totalPages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
          mobileCard={(u) => (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <div className="flex items-start justify-between gap-2">{identity(u)}{u.status === "BLOCKED" ? <Badge tone="danger">Bloqueado</Badge> : <Badge tone="success">Activo</Badge>}</div>
              {controls(u)}
              <p className="text-xs text-ink-3">{formatNumber(u.listings)} avisos · registro {formatDate(u.createdAt)} · {u.lastLoginAt ? `acceso ${timeAgo(u.lastLoginAt)}` : "nunca ingresó"}</p>
            </div>
          )} />
      )}

      <ConfirmDialog open={!!c && !!confirmCopy} onClose={() => setChange(null)} title={confirmCopy?.title ?? ""} description={confirmCopy?.body} confirmLabel={confirmCopy?.label} tone={confirmCopy?.danger ? "danger" : "primary"} loading={busy} onConfirm={() => void apply(c!)} />
    </div>
  );
}
