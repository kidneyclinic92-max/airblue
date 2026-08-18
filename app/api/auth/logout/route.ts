import { destroySession, ensureAuthDatabase } from "../../../../db/auth";
export async function POST(request: Request) { await ensureAuthDatabase(); return Response.json({ ok: true }, { headers: { "set-cookie": await destroySession(request) } }); }
