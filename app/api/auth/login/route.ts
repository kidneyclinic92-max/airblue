import { createSession, ensureAuthDatabase, hashPassword } from "../../../../db/auth";
import { getDatabase } from "../../../../db";

type LoginRow = { id: number; fullName: string; employeeId: string; email: string; role: string; station: string; passwordHash: string; passwordSalt: string; passwordIterations: number };
export async function POST(request: Request) {
  await ensureAuthDatabase();
  const body = await request.json() as { identity?: string; password?: string }; const identity = body.identity?.trim().toLowerCase() ?? "";
  const user = await getDatabase().prepare("SELECT id, full_name AS fullName, employee_id AS employeeId, email, role, station, password_hash AS passwordHash, password_salt AS passwordSalt, password_iterations AS passwordIterations FROM crew_users WHERE lower(email) = ? OR lower(employee_id) = ? LIMIT 1").bind(identity, identity).first<LoginRow>();
  if (!user) return Response.json({ error: "Incorrect email, employee ID or password." }, { status: 401 });
  const supplied = await hashPassword(body.password ?? "", user.passwordSalt, user.passwordIterations);
  if (supplied.hash !== user.passwordHash) return Response.json({ error: "Incorrect email, employee ID or password." }, { status: 401 });
  const cookie = await createSession(user.id, request); const safeUser = { id: user.id, fullName: user.fullName, employeeId: user.employeeId, email: user.email, role: user.role, station: user.station };
  return Response.json({ user: safeUser }, { headers: { "set-cookie": cookie } });
}
