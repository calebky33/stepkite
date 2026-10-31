#!/usr/bin/env node
// Smoke check for a freshly uploaded version, before it takes more traffic.
// Usage: node scripts/smoke.mjs https://<version-preview-url-or-site>
// Passing writes the smoke marker in .claude with the Worker version id from /api/health.
// guard.mjs requires that id in the command that promotes to 100%.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const base = process.argv[2];

function usage(reason) {
  console.error(`${reason}\nUsage: node scripts/smoke.mjs https://host (https only, no path)`);
  process.exit(1);
}

let origin = "";
try {
  const url = new URL(base ?? "");
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") usage("Only https is accepted.");
  if (url.username || url.password || (base ?? "").includes("@")) usage("No userinfo in the URL.");
  if (host === "localhost" || host.endsWith(".localhost")) usage("localhost is not a deploy.");
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("["))
    usage("IP addresses are not accepted.");
  if (url.pathname !== "/" || url.search || url.hash) usage("Give the host only, no path.");
  origin = url.origin;
} catch {
  usage("That is not a valid URL.");
}

// Pages that must answer 200 with a body, and headers that must be present.
const pages = [
  "/",
  "/uk/salary-calculator",
  "/us/salary-calculator",
  "/in/salary-calculator",
  "/uk/cv",
  "/api/health",
];
const failures = [];
let version = null;

for (const path of pages) {
  const started = Date.now();
  try {
    const res = await fetch(origin + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.text();
    const ms = Date.now() - started;
    if (res.status !== 200) failures.push(`${path} answered ${res.status}`);
    else if (body.length < 200 && path !== "/api/health")
      failures.push(`${path} body is almost empty`);
    else if (ms > 3000) failures.push(`${path} took ${ms} ms`);
    if (res.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff")
      failures.push(`${path} lacks x-content-type-options nosniff`);
    if (path === "/api/health") {
      try {
        const id = JSON.parse(body)?.version;
        if (typeof id === "string" && /^[0-9a-f-]{8,64}$/i.test(id)) version = id;
      } catch {
        failures.push("/api/health did not return JSON");
      }
    } else {
      if (!res.headers.get("strict-transport-security"))
        failures.push(`${path} lacks strict-transport-security`);
      const csp = res.headers.get("content-security-policy") ?? "";
      const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
      if (isHtml && !csp.includes("nonce-")) failures.push(`${path} lacks a nonce in its CSP`);
    }
    console.log(`${res.status} ${ms}ms ${path}`);
  } catch (error) {
    failures.push(`${path} failed: ${error instanceof Error ? error.name : "error"}`);
  }
}

if (!version && failures.length === 0) failures.push("/api/health returned no version id");
if (failures.length) {
  console.error(
    `smoke failed:\n- ${failures.join("\n- ")}\nDo not promote this version. Roll back with: wrangler rollback`,
  );
  process.exit(1);
}
const root = resolve(process.cwd());
mkdirSync(join(root, ".claude"), { recursive: true });
writeFileSync(
  join(root, ".claude", ".smoke-ok"),
  JSON.stringify({ at: new Date().toISOString(), origin, version }),
);
console.log(`smoke passed for version ${version}. Valid for 30 minutes.`);
console.log(`Promote with: wrangler versions deploy ${version}@10 <current>@90`);
