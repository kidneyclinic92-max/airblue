import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: server } = await import(workerUrl.href);
  const request = new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } });
  if (typeof server === "function") return server(request, { waitUntil() {}, passThroughOnException() {} });
  return server.fetch(request, { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the authenticated BlueCrew shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>BlueCrew Ops · Airblue Crew Operations<\/title>/i);
  assert.match(html, /Preparing operations workspace/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("includes crew planning, department handovers and ACDL persistence", async () => {
  const [schema, crewApi, handoverApi, defectApi, overview] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/crew-planning/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/department-handovers/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cabin-defects/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OperationsPage.tsx", import.meta.url), "utf8"),
  ]);

  for (const table of ["crew_plans", "crew_assignments", "department_handovers", "cabin_defects"]) assert.match(schema, new RegExp(table));
  assert.match(crewApi, /baseCabinCrew: 5, leadCrew: 1, standardTotal: 6/);
  assert.match(crewApi, /baseCabinCrew: 3, leadCrew: 1, standardTotal: 4/);
  assert.match(crewApi, /doubleCrew \? 2 : 1/);
  assert.match(handoverApi, /Logistics.*Catering/s);
  assert.match(defectApi, /safety hazard cannot be deferred under Minimum MEL/i);
  assert.match(overview, /Good morning, Sana/);
  assert.doesNotMatch(overview, /Good morning, Sara/);
});

test("ships mobile navigation and Azure App Service prerequisites", async () => {
  const [mobileNav, styles, database, bicep, guide] = await Promise.all([
    readFile(new URL("../app/components/MobileNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../azure/app-service.bicep", import.meta.url), "utf8"),
    readFile(new URL("../AZURE_APP_SERVICE.md", import.meta.url), "utf8"),
  ]);
  assert.match(mobileNav, /mobile-bottom-nav/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(database, /SQLITE_PATH/);
  assert.match(bicep, /NODE\|24-lts/);
  assert.match(bicep, /\/home\/data\/airblue\.sqlite/);
  assert.match(guide, /Basic B1/);
});

test("supports separate catering preparation and cabin verification workflows", async () => {
  const [schema, cateringApi, cateringDashboard, auth, operations] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/catering/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CateringDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/operations/route.ts", import.meta.url), "utf8"),
  ]);
  for (const field of ["workflow_status", "prepared_by", "submitted_at", "crew_verified_by", "crew_verified_at"]) assert.match(schema, new RegExp(field));
  assert.match(auth, /catering\.team@airblue\.com/);
  assert.match(auth, /Catering Supervisor/);
  assert.match(cateringApi, /Only catering team accounts/);
  assert.match(cateringApi, /workflow_status = 'submitted'/);
  assert.match(cateringDashboard, /Submit to cabin crew/);
  assert.match(cateringDashboard, /AuthGate team="catering"/);
  assert.match(operations, /Loaded quantities are managed by Catering/);
  assert.match(operations, /Catering must submit this manifest before cabin verification/);
});

test("adds validated RFID signatures to crew handovers", async () => {
  const [schema, rfid, rfidApi, operations, handovers, guide] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/rfid.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rfid/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/operations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OperationsPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../AZURE_APP_SERVICE.md", import.meta.url), "utf8"),
  ]);
  for (const table of ["rfid_credentials", "rfid_challenges", "handover_signatures"]) assert.match(schema, new RegExp(table));
  assert.match(rfid, /SHA-256/);
  assert.match(rfid, /expiresAt = new Date\(Date\.now\(\) \+ 2 \* 60 \* 1000\)/);
  assert.match(rfid, /used_at IS NULL/);
  assert.match(rfidApi, /Only|RFID handover signing/);
  assert.match(operations, /RFID card does not match|validateAndSignHandover/);
  assert.match(operations, /This handover is assigned to/);
  assert.match(handovers, /Sign & acknowledge/);
  assert.match(handovers, /RFID signed/);
  assert.match(guide, /RFID_HASH_PEPPER/);
});
