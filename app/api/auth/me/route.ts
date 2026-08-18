import { getCrewUser, unauthorized } from "../../../../db/auth";
export async function GET(request: Request) { const user = await getCrewUser(request); return user ? Response.json({ user }) : unauthorized(); }
