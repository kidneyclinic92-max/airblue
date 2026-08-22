import { getDatabase } from "../../../db";
import { forbidden, getCrewUser, isCateringRole, unauthorized } from "../../../db/auth";
import { ensureDatabase } from "../operations/route";

const templates = [
  ["Catering", "Hot meal trays", "FWD galley", 126, "trays"],
  ["Catering", "Water bottles", "FWD + AFT", 192, "bottles"],
  ["Cabin comfort", "Blankets", "Bins 1–4", 48, "pieces"],
  ["Cabin comfort", "Pillows", "Bins 1–4", 36, "pieces"],
  ["Cabin service", "Tea & coffee kits", "FWD galley", 8, "kits"],
  ["Cabin service", "Waste bags", "AFT galley", 20, "pieces"],
  ["Special requests", "Infant meal", "FWD chiller", 2, "meals"],
  ["Special requests", "Wheelchair tags", "Door 1L kit", 3, "tags"],
] as const;

async function requireCatering(request: Request) {
  const user = await getCrewUser(request);
  if (!user) return { response: unauthorized() };
  if (!isCateringRole(user.role)) return { response: forbidden("Only catering team accounts can manage uplift manifests.") };
  return { user };
}

async function ensureFlightItems(flightNo: string) {
  const database = getDatabase();
  const flight = await database.prepare("SELECT flight_no AS flightNo FROM flights WHERE flight_no = ?").bind(flightNo).first();
  if (!flight) return false;
  const count = await database.prepare("SELECT COUNT(*) AS total FROM inventory_items WHERE flight_id = ?").bind(flightNo).first<{ total: number }>();
  if (!count?.total) await database.batch(templates.map((item) => database.prepare("INSERT INTO inventory_items (flight_id, category, name, location, required_count, loaded_count, unit, checked, workflow_status) VALUES (?, ?, ?, ?, ?, 0, ?, 0, 'draft')").bind(flightNo, ...item)));
  return true;
}

const itemSelect = "SELECT id, flight_id AS flightId, category, name, location, required_count AS required, loaded_count AS loaded, unit, checked, workflow_status AS workflowStatus, prepared_by AS preparedBy, submitted_at AS submittedAt, crew_verified_by AS crewVerifiedBy, crew_verified_at AS crewVerifiedAt, catering_notes AS cateringNotes, updated_at AS updatedAt FROM inventory_items";

export async function GET(request: Request) {
  const auth = await requireCatering(request); if (auth.response) return auth.response;
  await ensureDatabase();
  const database = getDatabase();
  const requested = new URL(request.url).searchParams.get("flightNo")?.trim().toUpperCase();
  const flights = await database.prepare("SELECT flight_no AS flightNo, flight_date AS flightDate, origin, destination, departure, aircraft, registration, gate, passengers, status, readiness, supervisor FROM flights ORDER BY flight_date, departure").all();
  const flightNo = requested || String(flights.results[0]?.flightNo ?? "");
  if (flightNo && !await ensureFlightItems(flightNo)) return Response.json({ error: "Flight not found" }, { status: 404 });
  const items = flightNo ? await database.prepare(`${itemSelect} WHERE flight_id = ? ORDER BY id`).bind(flightNo).all() : { results: [] };
  return Response.json({ flights: flights.results, selectedFlight: flightNo, items: items.results });
}

export async function PATCH(request: Request) {
  const auth = await requireCatering(request); if (auth.response || !auth.user) return auth.response;
  await ensureDatabase();
  const body = await request.json() as { id?: number; loaded?: number; cateringNotes?: string };
  const id = Number(body.id); if (!id || typeof body.loaded !== "number") return Response.json({ error: "Item and loaded quantity are required" }, { status: 400 });
  const loaded = Math.max(0, Math.round(body.loaded)); const now = new Date().toISOString(); const database = getDatabase();
  const current = await database.prepare("SELECT flight_id AS flightId FROM inventory_items WHERE id = ?").bind(id).first<{ flightId: string }>();
  if (!current) return Response.json({ error: "Item not found" }, { status: 404 });
  await database.prepare("UPDATE inventory_items SET checked = 0, workflow_status = 'draft', submitted_at = NULL, crew_verified_by = '', crew_verified_at = NULL, updated_at = ? WHERE flight_id = ?").bind(now, current.flightId).run();
  const result = await database.prepare("UPDATE inventory_items SET loaded_count = ?, catering_notes = ?, checked = 0, workflow_status = 'draft', prepared_by = ?, submitted_at = NULL, crew_verified_by = '', crew_verified_at = NULL, updated_at = ? WHERE id = ?").bind(loaded, String(body.cateringNotes ?? "").trim(), auth.user.fullName, now, id).run();
  if (!result.meta.changes) return Response.json({ error: "Item was not updated" }, { status: 409 });
  const item = await database.prepare(`${itemSelect} WHERE id = ?`).bind(id).first();
  return Response.json({ item });
}

export async function POST(request: Request) {
  const auth = await requireCatering(request); if (auth.response || !auth.user) return auth.response;
  await ensureDatabase();
  const body = await request.json() as { action?: string; flightNo?: string };
  const flightNo = body.flightNo?.trim().toUpperCase() ?? "";
  if (body.action !== "submit" || !flightNo) return Response.json({ error: "A flight manifest is required" }, { status: 400 });
  if (!await ensureFlightItems(flightNo)) return Response.json({ error: "Flight not found" }, { status: 404 });
  const database = getDatabase(); const now = new Date().toISOString();
  await database.prepare("UPDATE inventory_items SET workflow_status = 'submitted', prepared_by = ?, submitted_at = ?, checked = 0, crew_verified_by = '', crew_verified_at = NULL, updated_at = ? WHERE flight_id = ?").bind(auth.user.fullName, now, now, flightNo).run();
  const items = await database.prepare(`${itemSelect} WHERE flight_id = ? ORDER BY id`).bind(flightNo).all();
  return Response.json({ items: items.results, message: `${flightNo} manifest submitted to cabin crew.` });
}
