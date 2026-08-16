import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { handovers, inventoryItems } from "../../../db/schema";

const seedItems = [
  ["Catering", "Hot meal trays", "FWD galley", 126, 126, "trays", 1],
  ["Catering", "Water bottles", "FWD + AFT", 192, 184, "bottles", 0],
  ["Cabin comfort", "Blankets", "Bins 1–4", 48, 48, "pieces", 1],
  ["Cabin comfort", "Pillows", "Bins 1–4", 36, 36, "pieces", 1],
  ["Cabin service", "Tea & coffee kits", "FWD galley", 8, 8, "kits", 1],
  ["Cabin service", "Waste bags", "AFT galley", 20, 20, "pieces", 0],
  ["Special requests", "Infant meal", "FWD chiller", 2, 2, "meals", 1],
  ["Special requests", "Wheelchair tags", "Door 1L kit", 3, 3, "tags", 1],
] as const;

async function ensureDatabase() {
  const d1 = env.DB;
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, flight_id TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, location TEXT NOT NULL, required_count INTEGER NOT NULL, loaded_count INTEGER NOT NULL, unit TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS handovers (id INTEGER PRIMARY KEY AUTOINCREMENT, from_flight_id TEXT NOT NULL, to_flight_no TEXT NOT NULL, to_route TEXT NOT NULL, to_crew TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_items_flight_id ON inventory_items(flight_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_handovers_from_flight_id ON handovers(from_flight_id)`),
  ]);
  const count = await d1.prepare("SELECT COUNT(*) AS total FROM inventory_items WHERE flight_id = ?").bind("PA201").first<{ total: number }>();
  if (!count?.total) {
    await d1.batch(seedItems.map((item) => d1.prepare("INSERT INTO inventory_items (flight_id, category, name, location, required_count, loaded_count, unit, checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("PA201", ...item)));
  }
}

export async function GET() {
  await ensureDatabase();
  const db = getDb();
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.flightId, "PA201")).orderBy(inventoryItems.id);
  const recentHandovers = await db.select().from(handovers).orderBy(desc(handovers.createdAt)).limit(5);
  return Response.json({ items, recentHandovers });
}

export async function PATCH(request: Request) {
  await ensureDatabase();
  const body = await request.json() as { id?: number; loaded?: number; checked?: boolean };
  if (!body.id) return Response.json({ error: "Item id is required" }, { status: 400 });
  const changes: { loaded?: number; checked?: boolean; updatedAt: string } = { updatedAt: new Date().toISOString() };
  if (typeof body.loaded === "number") changes.loaded = Math.max(0, Math.round(body.loaded));
  if (typeof body.checked === "boolean") changes.checked = body.checked;
  const [item] = await getDb().update(inventoryItems).set(changes).where(eq(inventoryItems.id, body.id)).returning();
  return Response.json({ item });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as { notes?: string; toCrew?: string; toFlightNo?: string; toRoute?: string };
  if (!body.toCrew || !body.toFlightNo) return Response.json({ error: "Incoming crew and flight are required" }, { status: 400 });
  const [handover] = await getDb().insert(handovers).values({ fromFlightId: "PA201", toFlightNo: body.toFlightNo, toRoute: body.toRoute ?? "", toCrew: body.toCrew, notes: body.notes?.trim() ?? "", status: "sent" }).returning();
  return Response.json({ handover }, { status: 201 });
}
