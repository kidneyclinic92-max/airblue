import { getDatabase } from "../../../db";
import { forbidden, getCrewUser, isCateringRole, unauthorized } from "../../../db/auth";

const seedItems = [
  ["Catering", "Hot meal trays", "FWD galley", 126, 126, "trays", 1], ["Catering", "Water bottles", "FWD + AFT", 192, 184, "bottles", 0],
  ["Cabin comfort", "Blankets", "Bins 1–4", 48, 48, "pieces", 1], ["Cabin comfort", "Pillows", "Bins 1–4", 36, 36, "pieces", 1],
  ["Cabin service", "Tea & coffee kits", "FWD galley", 8, 8, "kits", 1], ["Cabin service", "Waste bags", "AFT galley", 20, 20, "pieces", 0],
  ["Special requests", "Infant meal", "FWD chiller", 2, 2, "meals", 1], ["Special requests", "Wheelchair tags", "Door 1L kit", 3, 3, "tags", 1],
] as const;

const seedFlights = [
  ["PA201", "2026-08-16", "ISB", "KHI", "11:20", "Airbus A321", "AP-BMS", "04", 181, "turnaround", 75, "Sana Khan"],
  ["PA207", "2026-08-16", "KHI", "DXB", "13:55", "Airbus A320", "AP-EDA", "12", 142, "briefing", 38, "Ayesha Malik"],
  ["PA205", "2026-08-16", "ISB", "KHI", "14:30", "Airbus A321", "AP-BMN", "06", 176, "scheduled", 12, "Hina Raza"],
  ["PA411", "2026-08-16", "LHE", "JED", "16:10", "Airbus A321", "AP-BMO", "21", 188, "scheduled", 0, "Mariam Ali"],
  ["PA217", "2026-08-16", "ISB", "DXB", "18:45", "Airbus A320", "AP-EDB", "08", 136, "scheduled", 0, "Usman Tariq"],
  ["PA401", "2026-08-16", "LHE", "KHI", "20:05", "Airbus A320", "AP-EDC", "17", 149, "delayed", 4, "Noor Fatima"],
] as const;

export async function ensureDatabase() {
  const d1 = getDatabase();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, flight_id TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, location TEXT NOT NULL, required_count INTEGER NOT NULL, loaded_count INTEGER NOT NULL, unit TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0, workflow_status TEXT NOT NULL DEFAULT 'draft', prepared_by TEXT NOT NULL DEFAULT '', submitted_at TEXT, crew_verified_by TEXT NOT NULL DEFAULT '', crew_verified_at TEXT, catering_notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS handovers (id INTEGER PRIMARY KEY AUTOINCREMENT, from_flight_id TEXT NOT NULL, to_flight_no TEXT NOT NULL, to_route TEXT NOT NULL, to_crew TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS flights (flight_no TEXT PRIMARY KEY NOT NULL, flight_date TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL, departure TEXT NOT NULL, aircraft TEXT NOT NULL, registration TEXT NOT NULL, gate TEXT NOT NULL, passengers INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'scheduled', readiness INTEGER NOT NULL DEFAULT 0, supervisor TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_items_flight_id ON inventory_items(flight_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_handovers_from_flight_id ON handovers(from_flight_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_flights_flight_date ON flights(flight_date)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status)`),
    d1.prepare(`UPDATE flights SET supervisor = 'Sana Khan' WHERE supervisor = 'Sara Khan'`),
    d1.prepare(`UPDATE handovers SET to_crew = 'Sana Khan' WHERE to_crew = 'Sara Khan'`),
  ]);
  const columns = await d1.prepare("PRAGMA table_info(inventory_items)").all<{ name: string }>();
  const existing = new Set(columns.results.map((column) => column.name));
  const additions = [
    ["workflow_status", "TEXT NOT NULL DEFAULT 'draft'"], ["prepared_by", "TEXT NOT NULL DEFAULT ''"], ["submitted_at", "TEXT"],
    ["crew_verified_by", "TEXT NOT NULL DEFAULT ''"], ["crew_verified_at", "TEXT"], ["catering_notes", "TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [name, definition] of additions) if (!existing.has(name)) await d1.prepare(`ALTER TABLE inventory_items ADD COLUMN ${name} ${definition}`).run();
  await d1.prepare("CREATE INDEX IF NOT EXISTS idx_inventory_items_flight_workflow ON inventory_items(flight_id, workflow_status)").run();
  const itemCount = await d1.prepare("SELECT COUNT(*) AS total FROM inventory_items WHERE flight_id = ?").bind("PA201").first<{ total: number }>();
  if (!itemCount?.total) await d1.batch(seedItems.map((item, index) => d1.prepare("INSERT OR IGNORE INTO inventory_items (id, flight_id, category, name, location, required_count, loaded_count, unit, checked, workflow_status, prepared_by, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'Ali Raza', ?)").bind(index + 1, "PA201", ...item, "2026-08-16T09:52:00Z")));
  await d1.prepare("UPDATE inventory_items SET workflow_status = 'submitted', prepared_by = 'Ali Raza', submitted_at = COALESCE(submitted_at, '2026-08-16T09:52:00Z') WHERE flight_id = 'PA201' AND workflow_status = 'draft'").run();
  const flightCount = await d1.prepare("SELECT COUNT(*) AS total FROM flights").first<{ total: number }>();
  if (!flightCount?.total) await d1.batch(seedFlights.map((flight) => d1.prepare("INSERT OR IGNORE INTO flights (flight_no, flight_date, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...flight)));
  const handoverCount = await d1.prepare("SELECT COUNT(*) AS total FROM handovers").first<{ total: number }>();
  if (!handoverCount?.total) await d1.batch([
    d1.prepare("INSERT INTO handovers (from_flight_id, to_flight_no, to_route, to_crew, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind("PA199", "PA201", "KHI → ISB", "Sana Khan", "Cabin secure. Two vegetarian meals transferred to FWD chiller.", "acknowledged", "2026-08-16T08:45:00Z"),
    d1.prepare("INSERT INTO handovers (from_flight_id, to_flight_no, to_route, to_crew, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind("PA203", "PA205", "KHI → ISB", "Hina Raza", "Awaiting final catering uplift confirmation.", "sent", "2026-08-16T10:12:00Z"),
  ]);
  await d1.prepare("PRAGMA optimize").run();
}

export async function GET(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden("Catering accounts use the catering workspace.");
  await ensureDatabase();
  const database = getDatabase();
  const [items, allFlights, recentHandovers] = await Promise.all([
    database.prepare("SELECT id, flight_id AS flightId, category, name, location, required_count AS required, loaded_count AS loaded, unit, checked, workflow_status AS workflowStatus, prepared_by AS preparedBy, submitted_at AS submittedAt, crew_verified_by AS crewVerifiedBy, crew_verified_at AS crewVerifiedAt, catering_notes AS cateringNotes, updated_at AS updatedAt FROM inventory_items WHERE flight_id = ? ORDER BY id").bind("PA201").all(),
    database.prepare("SELECT flight_no AS flightNo, flight_date AS flightDate, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor, updated_at AS updatedAt FROM flights ORDER BY flight_date, departure").all(),
    database.prepare("SELECT id, from_flight_id AS fromFlightId, to_flight_no AS toFlightNo, to_route AS toRoute, to_crew AS toCrew, notes, status, created_at AS createdAt FROM handovers ORDER BY created_at DESC LIMIT 50").all(),
  ]);
  return Response.json({ items: items.results, flights: allFlights.results, recentHandovers: recentHandovers.results });
}

export async function PATCH(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden("Catering accounts cannot verify cabin operations.");
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const database = getDatabase();
  if (body.entity === "flight") {
    const flightNo = String(body.flightNo ?? "");
    if (!flightNo) return Response.json({ error: "Flight number is required" }, { status: 400 });
    const fields = ["updated_at = ?"]; const values: Array<string | number> = [new Date().toISOString()];
    if (typeof body.status === "string") { fields.push("status = ?"); values.push(body.status); }
    if (typeof body.readiness === "number") { fields.push("readiness = ?"); values.push(Math.max(0, Math.min(100, Math.round(body.readiness)))); }
    if (typeof body.gate === "string") { fields.push("gate = ?"); values.push(body.gate); }
    await database.prepare(`UPDATE flights SET ${fields.join(", ")} WHERE flight_no = ?`).bind(...values, flightNo).run();
    const flight = await database.prepare("SELECT flight_no AS flightNo, flight_date AS flightDate, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor, updated_at AS updatedAt FROM flights WHERE flight_no = ?").bind(flightNo).first();
    return Response.json({ flight });
  }
  if (body.entity === "handover") {
    const id = Number(body.id);
    if (!id) return Response.json({ error: "Handover id is required" }, { status: 400 });
    await database.prepare("UPDATE handovers SET status = ? WHERE id = ?").bind(String(body.status ?? "acknowledged"), id).run();
    const handover = await database.prepare("SELECT id, from_flight_id AS fromFlightId, to_flight_no AS toFlightNo, to_route AS toRoute, to_crew AS toCrew, notes, status, created_at AS createdAt FROM handovers WHERE id = ?").bind(id).first();
    return Response.json({ handover });
  }
  const id = Number(body.id);
  if (!id) return Response.json({ error: "Item id is required" }, { status: 400 });
  if (typeof body.loaded === "number") return Response.json({ error: "Loaded quantities are managed by Catering." }, { status: 403 });
  const existingItem = await database.prepare("SELECT flight_id AS flightId, workflow_status AS workflowStatus FROM inventory_items WHERE id = ?").bind(id).first<{ flightId: string; workflowStatus: string }>();
  if (!existingItem) return Response.json({ error: "Item not found" }, { status: 404 });
  if (typeof body.checked !== "boolean") return Response.json({ error: "Verification status is required" }, { status: 400 });
  if (body.checked && !["submitted", "verified"].includes(existingItem.workflowStatus)) return Response.json({ error: "Catering must submit this manifest before cabin verification." }, { status: 409 });
  const now = new Date().toISOString();
  await database.prepare("UPDATE inventory_items SET checked = ?, crew_verified_by = ?, crew_verified_at = ?, updated_at = ? WHERE id = ?").bind(body.checked ? 1 : 0, body.checked ? user.fullName : "", body.checked ? now : null, now, id).run();
  const pending = await database.prepare("SELECT COUNT(*) AS total FROM inventory_items WHERE flight_id = ? AND checked = 0").bind(existingItem.flightId).first<{ total: number }>();
  await database.prepare("UPDATE inventory_items SET workflow_status = ? WHERE flight_id = ? AND workflow_status IN ('submitted', 'verified')").bind(pending?.total ? "submitted" : "verified", existingItem.flightId).run();
  const item = await database.prepare("SELECT id, flight_id AS flightId, category, name, location, required_count AS required, loaded_count AS loaded, unit, checked, workflow_status AS workflowStatus, prepared_by AS preparedBy, submitted_at AS submittedAt, crew_verified_by AS crewVerifiedBy, crew_verified_at AS crewVerifiedAt, catering_notes AS cateringNotes, updated_at AS updatedAt FROM inventory_items WHERE id = ?").bind(id).first();
  return Response.json({ item });
}

export async function POST(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden("Catering accounts use the catering workspace.");
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const database = getDatabase();
  if (body.action === "createFlight") {
    const flightNo = String(body.flightNo ?? "").trim().toUpperCase();
    if (!flightNo || !body.origin || !body.destination || !body.departure) return Response.json({ error: "Flight number, route and departure are required" }, { status: 400 });
    const aircraft = String(body.aircraft ?? "Airbus A320");
    const passengers = Math.max(0, Math.round(Number(body.passengers ?? 0)));
    const capacity = aircraft.toLowerCase().includes("a321") ? 207 : 180;
    if (passengers > capacity) return Response.json({ error: `${aircraft} supports a maximum of ${capacity} passengers.` }, { status: 400 });
    await database.prepare("INSERT INTO flights (flight_no, flight_date, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, ?)").bind(flightNo, String(body.flightDate ?? "2026-08-16"), String(body.origin).toUpperCase(), String(body.destination).toUpperCase(), String(body.departure), aircraft, String(body.registration ?? "TBA").toUpperCase(), String(body.gate ?? "TBA"), passengers, String(body.supervisor ?? "Unassigned")).run();
    const flight = await database.prepare("SELECT flight_no AS flightNo, flight_date AS flightDate, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor, updated_at AS updatedAt FROM flights WHERE flight_no = ?").bind(flightNo).first();
    return Response.json({ flight }, { status: 201 });
  }
  if (!body.toCrew || !body.toFlightNo) return Response.json({ error: "Incoming crew and flight are required" }, { status: 400 });
  const requestedStatus = body.status === "draft" ? "draft" : "sent";
  const result = await database.prepare("INSERT INTO handovers (from_flight_id, to_flight_no, to_route, to_crew, notes, status) VALUES (?, ?, ?, ?, ?, ?)").bind(String(body.fromFlightId ?? "PA201"), String(body.toFlightNo), String(body.toRoute ?? ""), String(body.toCrew), String(body.notes ?? "").trim(), requestedStatus).run();
  const handover = await database.prepare("SELECT id, from_flight_id AS fromFlightId, to_flight_no AS toFlightNo, to_route AS toRoute, to_crew AS toCrew, notes, status, created_at AS createdAt FROM handovers WHERE id = ?").bind(result.meta.last_row_id).first();
  return Response.json({ handover }, { status: 201 });
}
