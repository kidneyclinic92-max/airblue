import { createSession, ensureAuthDatabase, hashPassword } from "../../../../db/auth";
import { getDatabase } from "../../../../db";

export async function POST(request: Request) {
  await ensureAuthDatabase();
  const body = await request.json() as { fullName?: string; employeeId?: string; email?: string; password?: string; role?: string; station?: string };
  const fullName = body.fullName?.trim() ?? ""; const employeeId = body.employeeId?.trim().toUpperCase() ?? ""; const email = body.email?.trim().toLowerCase() ?? ""; const password = body.password ?? "";
  if (fullName.length < 2 || !/^[A-Z]{2}-\d{4,6}$/.test(employeeId) || !email.includes("@") || password.length < 8) return Response.json({ error: "Enter a valid name, employee ID, email and an 8+ character password." }, { status: 400 });
  const database = getDatabase();
  const exists = await database.prepare("SELECT id FROM crew_users WHERE email = ? OR employee_id = ?").bind(email, employeeId).first();
  if (exists) return Response.json({ error: "An account already exists for this email or employee ID." }, { status: 409 });
  const hashed = await hashPassword(password);
  const result = await database.prepare("INSERT INTO crew_users (full_name, employee_id, email, role, station, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(fullName, employeeId, email, body.role ?? "Flight Attendant", body.station?.toUpperCase() ?? "ISB", hashed.hash, hashed.salt, hashed.iterations).run();
  const userId = Number(result.meta.last_row_id); const cookie = await createSession(userId, request);
  return Response.json({ user: { id: userId, fullName, employeeId, email, role: body.role ?? "Flight Attendant", station: body.station ?? "ISB" } }, { status: 201, headers: { "set-cookie": cookie } });
}
