import { getDatabase } from ".";

export type CrewUser = { id: number; fullName: string; employeeId: string; email: string; role: string; station: string };
const COOKIE_NAME = "bluecrew_session";
const ITERATIONS = 150000;

function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function hexToBytes(hex: string) { return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []); }
function randomHex(size: number) { return bytesToHex(crypto.getRandomValues(new Uint8Array(size))); }
async function sha256(value: string) { return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }

export async function hashPassword(password: string, salt = randomHex(16), iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations }, key, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt, iterations };
}

export async function ensureAuthDatabase() {
  const d1 = getDatabase();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS crew_users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, employee_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, station TEXT NOT NULL DEFAULT 'ISB', password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL DEFAULT 150000, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS crew_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    d1.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_users_email ON crew_users(email)`),
    d1.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_users_employee_id ON crew_users(employee_id)`),
    d1.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crew_sessions_token_hash ON crew_sessions(token_hash)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_crew_sessions_user_id ON crew_sessions(user_id)`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_crew_sessions_expires_at ON crew_sessions(expires_at)`),
  ]);
  const demo = await d1.prepare("SELECT id FROM crew_users WHERE email = ?").bind("sana.khan@airblue.com").first();
  if (!demo) {
    const password = await hashPassword("Crew@123");
    await d1.prepare("INSERT OR IGNORE INTO crew_users (full_name, employee_id, email, role, station, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Sana Khan", "AB-2047", "sana.khan@airblue.com", "Cabin Supervisor", "ISB", password.hash, password.salt, password.iterations).run();
  }
  const cateringDemo = await d1.prepare("SELECT id FROM crew_users WHERE email = ?").bind("catering.team@airblue.com").first();
  if (!cateringDemo) {
    const password = await hashPassword("Catering@123");
    await d1.prepare("INSERT OR IGNORE INTO crew_users (full_name, employee_id, email, role, station, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Ali Raza", "CT-1001", "catering.team@airblue.com", "Catering Supervisor", "ISB", password.hash, password.salt, password.iterations).run();
  }
  await d1.prepare("DELETE FROM crew_sessions WHERE expires_at <= ?").bind(new Date().toISOString()).run();
}

export async function createSession(userId: number, request: Request) {
  const token = randomHex(32); const tokenHash = await sha256(token); const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await getDatabase().prepare("INSERT INTO crew_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").bind(userId, tokenHash, expires.toISOString()).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

function readCookie(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? "";
}

export async function getCrewUser(request: Request): Promise<CrewUser | null> {
  await ensureAuthDatabase();
  const token = readCookie(request); if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await getDatabase().prepare(`SELECT u.id, u.full_name AS fullName, u.employee_id AS employeeId, u.email, u.role, u.station FROM crew_sessions s JOIN crew_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active' LIMIT 1`).bind(tokenHash, new Date().toISOString()).first<CrewUser>();
  return row ?? null;
}

export async function destroySession(request: Request) {
  const token = readCookie(request); if (token) await getDatabase().prepare("DELETE FROM crew_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function unauthorized() { return Response.json({ error: "Authentication required" }, { status: 401 }); }
export function isCateringRole(role: string) { return role.toLowerCase().includes("catering"); }
export function forbidden(message = "You do not have access to this workspace") { return Response.json({ error: message }, { status: 403 }); }
