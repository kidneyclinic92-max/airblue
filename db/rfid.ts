import { getDatabase } from ".";
import type { CrewUser } from "./auth";

export type SignaturePurpose = "send" | "acknowledge";

function normalizeCardUid(cardUid: string) {
  const normalized = cardUid.trim().toUpperCase().replaceAll(" ", "");
  if (!/^[A-Z0-9:_-]{6,64}$/.test(normalized)) throw new Error("Scan a valid RFID crew card.");
  return normalized;
}

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function cardHash(cardUid: string) {
  return digest(`${process.env.RFID_HASH_PEPPER || "airblue-local-rfid"}:${normalizeCardUid(cardUid)}`);
}

export async function ensureRfidDatabase() {
  const database = getDatabase();
  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS rfid_credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, card_hash TEXT NOT NULL, card_fingerprint TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_used_at TEXT)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS rfid_challenges (id TEXT PRIMARY KEY NOT NULL, user_id INTEGER NOT NULL, purpose TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS handover_signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, handover_id INTEGER NOT NULL, user_id INTEGER NOT NULL, signer_name TEXT NOT NULL, employee_id TEXT NOT NULL, purpose TEXT NOT NULL, card_fingerprint TEXT NOT NULL, signature_hash TEXT NOT NULL, validation_status TEXT NOT NULL DEFAULT 'valid', signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_rfid_credentials_card_hash ON rfid_credentials(card_hash)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_rfid_credentials_user_active ON rfid_credentials(user_id, active)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_rfid_challenges_user_expiry ON rfid_challenges(user_id, expires_at)`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_handover_signatures_handover_purpose ON handover_signatures(handover_id, purpose)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_handover_signatures_user_id ON handover_signatures(user_id)`),
  ]);
  await database.prepare("DELETE FROM rfid_challenges WHERE expires_at <= ? OR used_at IS NOT NULL").bind(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).run();
}

export async function credentialForUser(userId: number) {
  await ensureRfidDatabase();
  return getDatabase().prepare("SELECT id, card_fingerprint AS cardFingerprint, enrolled_at AS enrolledAt, last_used_at AS lastUsedAt FROM rfid_credentials WHERE user_id = ? AND active = 1 LIMIT 1").bind(userId).first<{ id: number; cardFingerprint: string; enrolledAt: string; lastUsedAt: string | null }>();
}

export async function enrollCard(user: CrewUser, rawUid: string) {
  await ensureRfidDatabase();
  const normalized = normalizeCardUid(rawUid); const hash = await cardHash(normalized); const fingerprint = normalized.slice(-4);
  const database = getDatabase();
  const owner = await database.prepare("SELECT user_id AS userId FROM rfid_credentials WHERE card_hash = ? AND active = 1").bind(hash).first<{ userId: number }>();
  if (owner && owner.userId !== user.id) throw new Error("This RFID card is already assigned to another crew member.");
  await database.prepare("UPDATE rfid_credentials SET active = 0 WHERE user_id = ?").bind(user.id).run();
  if (owner) await database.prepare("UPDATE rfid_credentials SET active = 1, enrolled_at = CURRENT_TIMESTAMP WHERE card_hash = ?").bind(hash).run();
  else await database.prepare("INSERT INTO rfid_credentials (user_id, card_hash, card_fingerprint) VALUES (?, ?, ?)").bind(user.id, hash, fingerprint).run();
  return credentialForUser(user.id);
}

export async function createRfidChallenge(user: CrewUser, purpose: SignaturePurpose) {
  await ensureRfidDatabase();
  if (!await credentialForUser(user.id)) throw new Error("Enroll an RFID crew card before signing a handover.");
  const id = crypto.randomUUID(); const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  await getDatabase().prepare("INSERT INTO rfid_challenges (id, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)").bind(id, user.id, purpose, expiresAt).run();
  return { id, expiresAt };
}

export async function validateAndSignHandover(args: { user: CrewUser; handoverId: number; purpose: SignaturePurpose; challengeId: string; cardUid: string; snapshot: string }) {
  await ensureRfidDatabase();
  const { user, handoverId, purpose, challengeId, cardUid, snapshot } = args; const database = getDatabase(); const now = new Date().toISOString();
  const challenge = await database.prepare("SELECT id FROM rfid_challenges WHERE id = ? AND user_id = ? AND purpose = ? AND expires_at > ? AND used_at IS NULL").bind(challengeId, user.id, purpose, now).first();
  if (!challenge) throw new Error("RFID signing request expired. Start the signature again.");
  const hash = await cardHash(cardUid);
  const credential = await database.prepare("SELECT id, card_fingerprint AS cardFingerprint FROM rfid_credentials WHERE user_id = ? AND card_hash = ? AND active = 1 LIMIT 1").bind(user.id, hash).first<{ id: number; cardFingerprint: string }>();
  if (!credential) throw new Error("RFID card does not match the signed-in crew member.");
  const consumed = await database.prepare("UPDATE rfid_challenges SET used_at = ? WHERE id = ? AND used_at IS NULL").bind(now, challengeId).run();
  if (!consumed.meta.changes) throw new Error("This RFID signing request has already been used.");
  const signatureHash = await digest(`${handoverId}|${purpose}|${user.id}|${snapshot}|${challengeId}|${now}`);
  const result = await database.prepare("INSERT INTO handover_signatures (handover_id, user_id, signer_name, employee_id, purpose, card_fingerprint, signature_hash, signed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(handoverId, user.id, user.fullName, user.employeeId, purpose, credential.cardFingerprint, signatureHash, now).run();
  await database.prepare("UPDATE rfid_credentials SET last_used_at = ? WHERE id = ?").bind(now, credential.id).run();
  return { id: result.meta.last_row_id, signerName: user.fullName, employeeId: user.employeeId, purpose, cardFingerprint: credential.cardFingerprint, signatureHash, signedAt: now, validationStatus: "valid" };
}
