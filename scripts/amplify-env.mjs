import { writeFileSync } from "node:fs";
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];
for (const key of required)
  if (!process.env[key]) throw new Error("Missing deployment variable: " + key);
writeFileSync(
  ".env.production",
  required
    .map((key) => key + "=" + JSON.stringify(process.env[key]))
    .join("\n") + "\n",
  { mode: 0o600 },
);
