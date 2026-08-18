import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the authenticated BlueCrew shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>BlueCrew Ops · Airblue Crew Operations<\/title>/i);
  assert.match(html, /Preparing crew workspace/);
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
