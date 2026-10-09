import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)?.[1];
if (!key) {
  console.log("FAIL sin service role");
  process.exit(1);
}

const email = "judtobon3006@gmail.com";
const url = `https://svrlvnkcxnuizyzxocaa.supabase.co/rest/v1/User?email=eq.${encodeURIComponent(email)}&select=id,email,name,role,status,verified`;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const list = await fetch("https://svrlvnkcxnuizyzxocaa.supabase.co/rest/v1/User?select=email,name,role&order=createdAt.desc&limit=20", { headers });
const people = await list.json();
console.log("COUNT", Array.isArray(people) ? people.length : "err");
if (Array.isArray(people)) {
  for (const p of people) console.log(`${p.email} | ${p.role} | ${p.name}`);
} else {
  console.log(JSON.stringify(people).slice(0, 300));
}
