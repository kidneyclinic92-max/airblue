import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { flights, handovers, inventoryItems } from "../../../db/schema";
import { getCrewUser, unauthorized } from "../../../db/auth";

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
  const d1 = env.DB;
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, flight_id TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, location TEXT NOT NULL, required_count INTEGER NOT NULL, loaded_count INTEGER NOT NULL, unit TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS handovers (id INTEGER PRIMARY KEY AUTOINCREMENT, from_flight_id TEXT NOT NULL, to_flight_no TEXT NOT NULL, to_route TEXT NOT NULL, to_crew TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS flights (flight_no TEXT PRIMARY KEY NOT NULL, flight_date TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL, departure TEXT NOT NULL, aircraft TEXT NOT NULL, registration TEXT NOT NULL, gate TEXT NOT NULL, passengers INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'scheduled', readiness INTEGER NOT NULL DEFAULT 0, supervisor TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_items_flight_id ON inventory_items(flight_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_handovers_from_flight_id ON handovers(from_flight_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_flights_flight_date ON flights(flight_date)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status)`),
    d1.prepare(`UPDATE flights SET supervisor = 'Sana Khan' WHERE supervisor = 'Sara Khan'`),
    d1.prepare(`UPDATE handovers SET to_crew = 'Sana Khan' WHERE to_crew = 'Sara Khan'`),
  ]);
  const itemCount = await d1.prepare("SELECT COUNT(*) AS total FROM inventory_items WHERE flight_id = ?").bind("PA201").first<{ total: number }>();
  if (!itemCount?.total) await d1.batch(seedItems.map((item, index) => d1.prepare("INSERT OR IGNORE INTO inventory_items (id, flight_id, category, name, location, required_count, loaded_count, unit, checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(index + 1, "PA201", ...item)));
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
  if (!await getCrewUser(request)) return unauthorized();
  await ensureDatabase();
  const db = getDb();
  const [items, allFlights, recentHandovers] = await Promise.all([
    db.select().from(inventoryItems).where(eq(inventoryItems.flightId, "PA201")).orderBy(inventoryItems.id),
    db.select().from(flights).orderBy(flights.flightDate, flights.departure),
    db.select().from(handovers).orderBy(desc(handovers.createdAt)).limit(50),
  ]);
  return Response.json({ items, flights: allFlights, recentHandovers });
}

export async function PATCH(request: Request) {
  if (!await getCrewUser(request)) return unauthorized();
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const db = getDb();
  if (body.entity === "flight") {
    const flightNo = String(body.flightNo ?? "");
    if (!flightNo) return Response.json({ error: "Flight number is required" }, { status: 400 });
    const changes: Partial<typeof flights.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (typeof body.status === "string") changes.status = body.status;
    if (typeof body.readiness === "number") changes.readiness = Math.max(0, Math.min(100, Math.round(body.readiness)));
    if (typeof body.gate === "string") changes.gate = body.gate;
    const [flight] = await db.update(flights).set(changes).where(eq(flights.flightNo, flightNo)).returning();
    return Response.json({ flight });
  }
  if (body.entity === "handover") {
    const id = Number(body.id);
    if (!id) return Response.json({ error: "Handover id is required" }, { status: 400 });
    const [handover] = await db.update(handovers).set({ status: String(body.status ?? "acknowledged") }).where(eq(handovers.id, id)).returning();
    return Response.json({ handover });
  }
  const id = Number(body.id);
  if (!id) return Response.json({ error: "Item id is required" }, { status: 400 });
  const changes: { loaded?: number; checked?: boolean; updatedAt: string } = { updatedAt: new Date().toISOString() };
  if (typeof body.loaded === "number") changes.loaded = Math.max(0, Math.round(body.loaded));
  if (typeof body.checked === "boolean") changes.checked = body.checked;
  const [item] = await db.update(inventoryItems).set(changes).where(eq(inventoryItems.id, id)).returning();
  return Response.json({ item });
}

export async function POST(request: Request) {
  if (!await getCrewUser(request)) return unauthorized();
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const db = getDb();
  if (body.action === "createFlight") {
    const flightNo = String(body.flightNo ?? "").trim().toUpperCase();
    if (!flightNo || !body.origin || !body.destination || !body.departure) return Response.json({ error: "Flight number, route and departure are required" }, { status: 400 });
    const aircraft = String(body.aircraft ?? "Airbus A320");
    const passengers = Math.max(0, Math.round(Number(body.passengers ?? 0)));
    const capacity = aircraft.toLowerCase().includes("a321") ? 207 : 180;
    if (passengers > capacity) return Response.json({ error: `${aircraft} supports a maximum of ${capacity} passengers.` }, { status: 400 });
    const [flight] = await db.insert(flights).values({ flightNo, flightDate: String(body.flightDate ?? "2026-08-16"), origin: String(body.origin).toUpperCase(), destination: String(body.destination).toUpperCase(), departure: String(body.departure), aircraft, registration: String(body.registration ?? "TBA").toUpperCase(), gate: String(body.gate ?? "TBA"), passengers, status: "scheduled", readiness: 0, supervisor: String(body.supervisor ?? "Unassigned") }).returning();
    return Response.json({ flight }, { status: 201 });
  }
  if (!body.toCrew || !body.toFlightNo) return Response.json({ error: "Incoming crew and flight are required" }, { status: 400 });
  const requestedStatus = body.status === "draft" ? "draft" : "sent";
  const [handover] = await db.insert(handovers).values({ fromFlightId: String(body.fromFlightId ?? "PA201"), toFlightNo: String(body.toFlightNo), toRoute: String(body.toRoute ?? ""), toCrew: String(body.toCrew), notes: String(body.notes ?? "").trim(), status: requestedStatus }).returning();
  return Response.json({ handover }, { status: 201 });
}
