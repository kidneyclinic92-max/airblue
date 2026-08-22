import { forbidden, getCrewUser, isCateringRole, unauthorized } from "../../../db/auth";
import { ensureDatabase } from "../operations/route";
import { getDatabase } from "../../../db";

function ruleFor(aircraft: string) {
  const normalized = aircraft.toLowerCase().replaceAll(" ", "");
  if (normalized.includes("a321")) return { aircraftType: normalized.includes("neo") ? "A321neo" : "A321", capacity: "201–207", baseCabinCrew: 5, leadCrew: 1, standardTotal: 6 };
  return { aircraftType: "A320", capacity: "180", baseCabinCrew: 3, leadCrew: 1, standardTotal: 4 };
}

async function ensureCrewPlanning() {
  await ensureDatabase(); const d1 = getDatabase();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS crew_plans (flight_no TEXT PRIMARY KEY NOT NULL, base_cabin_crew INTEGER NOT NULL, lead_crew INTEGER NOT NULL DEFAULT 1, additional_crew INTEGER NOT NULL DEFAULT 0, double_crew INTEGER NOT NULL DEFAULT 0, required_total INTEGER NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS crew_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, flight_no TEXT NOT NULL, user_id INTEGER, crew_name TEXT NOT NULL, employee_id TEXT NOT NULL, assignment_role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_crew_assignments_flight_no ON crew_assignments(flight_no)`),
    d1.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_assignments_flight_employee ON crew_assignments(flight_no, employee_id)`),
  ]);
  const flights = await d1.prepare("SELECT flight_no AS flightNo, aircraft FROM flights").all<{ flightNo: string; aircraft: string }>();
  for (const flight of flights.results) { const rule = ruleFor(flight.aircraft); await d1.prepare("INSERT OR IGNORE INTO crew_plans (flight_no, base_cabin_crew, lead_crew, additional_crew, double_crew, required_total, updated_by) VALUES (?, ?, ?, 0, 0, ?, ?)").bind(flight.flightNo, rule.baseCabinCrew, rule.leadCrew, rule.standardTotal, "System rule").run(); }
  await d1.prepare("PRAGMA optimize").run();
}

export async function GET(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden(); await ensureCrewPlanning();
  const database = getDatabase();
  const [plans, assignments, users] = await Promise.all([
    database.prepare("SELECT flight_no AS flightNo, base_cabin_crew AS baseCabinCrew, lead_crew AS leadCrew, additional_crew AS additionalCrew, double_crew AS doubleCrew, required_total AS requiredTotal, updated_by AS updatedBy, updated_at AS updatedAt FROM crew_plans").all(),
    database.prepare("SELECT id, flight_no AS flightNo, user_id AS userId, crew_name AS crewName, employee_id AS employeeId, assignment_role AS assignmentRole, status, created_at AS createdAt FROM crew_assignments ORDER BY assignment_role DESC, crew_name").all(),
    database.prepare("SELECT id, full_name AS fullName, employee_id AS employeeId, role, station FROM crew_users WHERE status = 'active' ORDER BY full_name").all(),
  ]);
  return Response.json({ plans: plans.results, assignments: assignments.results, users: users.results });
}

export async function POST(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden(); await ensureCrewPlanning(); const body = await request.json() as Record<string, unknown>;
  const database = getDatabase();
  if (body.action === "updatePlan") {
    const flightNo = String(body.flightNo ?? ""); const flight = await database.prepare("SELECT aircraft FROM flights WHERE flight_no = ?").bind(flightNo).first<{ aircraft: string }>();
    if (!flight) return Response.json({ error: "Flight not found" }, { status: 404 }); const rule = ruleFor(flight.aircraft); const additional = Math.max(0, Math.min(20, Number(body.additionalCrew ?? 0))); const doubleCrew = Boolean(body.doubleCrew); const requiredTotal = (rule.standardTotal + additional) * (doubleCrew ? 2 : 1);
    await database.prepare("UPDATE crew_plans SET base_cabin_crew = ?, lead_crew = ?, additional_crew = ?, double_crew = ?, required_total = ?, updated_by = ?, updated_at = ? WHERE flight_no = ?").bind(rule.baseCabinCrew, rule.leadCrew, additional, doubleCrew ? 1 : 0, requiredTotal, user.fullName, new Date().toISOString(), flightNo).run();
    return Response.json({ plan: { flightNo, ...rule, additionalCrew: additional, doubleCrew, requiredTotal } });
  }
  if (body.action === "assignCrew") {
    const flightNo = String(body.flightNo ?? ""); const crewName = String(body.crewName ?? "").trim(); const employeeId = String(body.employeeId ?? "").trim().toUpperCase(); const role = String(body.assignmentRole ?? "Cabin Crew");
    if (!flightNo || !crewName || !employeeId) return Response.json({ error: "Crew member details are required" }, { status: 400 });
    const plan = await database.prepare("SELECT required_total AS requiredTotal FROM crew_plans WHERE flight_no = ?").bind(flightNo).first<{ requiredTotal: number }>(); const count = await database.prepare("SELECT COUNT(*) AS total FROM crew_assignments WHERE flight_no = ?").bind(flightNo).first<{ total: number }>();
    if (count && plan && count.total >= plan.requiredTotal) return Response.json({ error: "The required crew complement is already filled. Increase additional crew first." }, { status: 409 });
    try { const result = await database.prepare("INSERT INTO crew_assignments (flight_no, user_id, crew_name, employee_id, assignment_role, status) VALUES (?, ?, ?, ?, ?, 'confirmed')").bind(flightNo, body.userId ? Number(body.userId) : null, crewName, employeeId, role).run(); return Response.json({ id: result.meta.last_row_id }, { status: 201 }); } catch { return Response.json({ error: "This crew member is already assigned to the flight." }, { status: 409 }); }
  }
  return Response.json({ error: "Unsupported action" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden(); await ensureCrewPlanning(); const id = Number(new URL(request.url).searchParams.get("id")); if (!id) return Response.json({ error: "Assignment id required" }, { status: 400 }); await getDatabase().prepare("DELETE FROM crew_assignments WHERE id = ?").bind(id).run(); return Response.json({ ok: true });
}
