import { getDatabase } from "../../../db";

export async function GET() {
  try {
    const database = getDatabase();
    const check = database.prepare("SELECT 1 AS healthy").first<{ healthy: number }>();
    return Response.json({ status: check?.healthy === 1 ? "ok" : "degraded" }, { status: check?.healthy === 1 ? 200 : 503 });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
