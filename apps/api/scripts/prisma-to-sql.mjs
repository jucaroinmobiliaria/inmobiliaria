// Genera el DDL de PostgreSQL a partir de prisma/schema.prisma siguiendo las
// convenciones de nombres de Prisma Migrate (tablas, índices y FKs), para que
// `prisma migrate deploy` y el SQL manual (Supabase/Neon) produzcan lo mismo.
//   node scripts/prisma-to-sql.mjs            -> escribe database/schema.sql y la migración inicial
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

const enums = {};
const models = {};
let cur = null;
let curKind = null;
for (const raw of src.split("\n")) {
  const line = raw.replace(/\/\/.*$/, "").trim();
  if (!line) continue;
  let m;
  if ((m = line.match(/^enum (\w+) \{$/))) { cur = enums[m[1]] = []; curKind = "enum"; continue; }
  if ((m = line.match(/^model (\w+) \{$/))) { cur = models[m[1]] = { name: m[1], fields: [], idx: [], uniq: [], pk: null }; curKind = "model"; continue; }
  if (line.startsWith("generator") || line.startsWith("datasource")) { cur = null; curKind = "skip"; continue; }
  if (line === "}") { cur = null; curKind = null; continue; }
  if (curKind === "enum") { cur.push(line); continue; }
  if (curKind !== "model") continue;
  if (line.startsWith("@@index")) { cur.idx.push(line.match(/\[(.*?)\]/)[1].split(",").map((s) => s.trim())); continue; }
  if (line.startsWith("@@unique")) { cur.uniq.push(line.match(/\[(.*?)\]/)[1].split(",").map((s) => s.trim())); continue; }
  if (line.startsWith("@@id")) { cur.pk = line.match(/\[(.*?)\]/)[1].split(",").map((s) => s.trim()); continue; }
  const f = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
  if (!f) continue;
  cur.fields.push({ name: f[1], type: f[2], list: !!f[3], optional: !!f[4], attrs: f[5] || "" });
}

const scalar = { String: "TEXT", Int: "INTEGER", BigInt: "BIGINT", Float: "DOUBLE PRECISION", Boolean: "BOOLEAN", DateTime: "TIMESTAMP(3)", Json: "JSONB" };
const q = (s) => `"${s}"`;
const out = [];

for (const [name, vals] of Object.entries(enums)) {
  out.push(`-- CreateEnum\nCREATE TYPE ${q(name)} AS ENUM (${vals.map((v) => `'${v}'`).join(", ")});\n`);
}

const indexes = [];
const fks = [];

for (const model of Object.values(models)) {
  const cols = [];
  const pkCols = model.pk ? [...model.pk] : [];
  for (const f of model.fields) {
    if (models[f.type]) {
      // relación: genera FK si define fields
      const rel = f.attrs.match(/@relation\(([^)]*)\)/);
      if (rel && /fields:/.test(rel[1])) {
        const from = rel[1].match(/fields:\s*\[(.*?)\]/)[1].split(",").map((s) => s.trim());
        const to = rel[1].match(/references:\s*\[(.*?)\]/)[1].split(",").map((s) => s.trim());
        const od = rel[1].match(/onDelete:\s*(\w+)/)?.[1];
        const onDelete = od === "Cascade" ? "CASCADE" : od === "SetNull" ? "SET NULL" : od === "Restrict" ? "RESTRICT" : f.optional ? "SET NULL" : "RESTRICT";
        fks.push(`-- AddForeignKey\nALTER TABLE ${q(model.name)} ADD CONSTRAINT ${q(`${model.name}_${from.join("_")}_fkey`)} FOREIGN KEY (${from.map(q).join(", ")}) REFERENCES ${q(f.type)}(${to.map(q).join(", ")}) ON DELETE ${onDelete} ON UPDATE CASCADE;\n`);
      }
      continue;
    }
    let type = enums[f.type] ? q(f.type) : scalar[f.type];
    if (f.attrs.includes("@db.Date")) type = "DATE";
    let def = "";
    const dm = f.attrs.match(/@default\((.*?)\)(?=\s|$|@)/);
    let serial = false;
    if (dm) {
      const v = dm[1];
      if (v === "autoincrement()") serial = true;
      else if (v === "now()") def = " DEFAULT CURRENT_TIMESTAMP";
      else if (v === "cuid()" || v === "uuid()") def = "";
      else if (/^"/.test(v)) def = ` DEFAULT '${v.slice(1, -1)}'`;
      else if (/^(true|false|\d+)$/.test(v)) def = ` DEFAULT ${v}`;
      else if (enums[f.type]) def = ` DEFAULT '${v}'`;
    }
    cols.push(`    ${q(f.name)} ${serial ? "SERIAL" : type}${f.optional ? "" : " NOT NULL"}${def}`);
    if (/@id\b/.test(f.attrs) && !/@@id/.test(f.attrs)) pkCols.push(f.name);
    if (/@unique\b/.test(f.attrs)) indexes.push(`-- CreateIndex\nCREATE UNIQUE INDEX ${q(`${model.name}_${f.name}_key`)} ON ${q(model.name)}(${q(f.name)});\n`);
  }
  if (pkCols.length) cols.push(`    CONSTRAINT ${q(`${model.name}_pkey`)} PRIMARY KEY (${pkCols.map(q).join(", ")})`);
  out.push(`-- CreateTable\nCREATE TABLE ${q(model.name)} (\n${cols.join(",\n")}\n);\n`);
  for (const u of model.uniq) indexes.push(`-- CreateIndex\nCREATE UNIQUE INDEX ${q(`${model.name}_${u.join("_")}_key`)} ON ${q(model.name)}(${u.map(q).join(", ")});\n`);
  for (const i of model.idx) indexes.push(`-- CreateIndex\nCREATE INDEX ${q(`${model.name}_${i.join("_")}_idx`)} ON ${q(model.name)}(${i.map(q).join(", ")});\n`);
}

const sql = [...out, ...indexes, ...fks].join("\n");
const header = `-- Nido · esquema PostgreSQL (generado desde apps/api/prisma/schema.prisma)\n-- Ejecútalo UNA vez en una base vacía (Supabase SQL Editor, Neon, psql…).\n-- Si prefieres Prisma:  cd apps/api && npx prisma migrate deploy\n\n`;

mkdirSync(resolve(root, "../../database"), { recursive: true });
writeFileSync(resolve(root, "../../database/schema.sql"), header + sql);
const mdir = resolve(root, "prisma/migrations/20261005000000_init");
mkdirSync(mdir, { recursive: true });
writeFileSync(resolve(mdir, "migration.sql"), sql);
writeFileSync(resolve(root, "prisma/migrations/migration_lock.toml"), '# Please do not edit this file manually\n# It should be added in your version-control system (e.g., Git)\nprovider = "postgresql"\n');
console.log(`OK: ${Object.keys(models).length} tablas, ${Object.keys(enums).length} enums, ${indexes.length} índices, ${fks.length} claves foráneas`);
