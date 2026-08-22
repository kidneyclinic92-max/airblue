import { forbidden, getCrewUser, isCateringRole, unauthorized } from "../../../db/auth";
import { createRfidChallenge, credentialForUser, enrollCard, type SignaturePurpose } from "../../../db/rfid";

export async function GET(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden("RFID handover signing is available to cabin crew accounts.");
  return Response.json({ credential: await credentialForUser(user.id) });
}

export async function POST(request: Request) {
  const user = await getCrewUser(request); if (!user) return unauthorized(); if (isCateringRole(user.role)) return forbidden("RFID handover signing is available to cabin crew accounts.");
  const body = await request.json() as { action?: string; cardUid?: string; purpose?: SignaturePurpose };
  try {
    if (body.action === "enroll") return Response.json({ credential: await enrollCard(user, body.cardUid ?? "") }, { status: 201 });
    if (body.action === "challenge" && ["send", "acknowledge"].includes(body.purpose ?? "")) return Response.json({ challenge: await createRfidChallenge(user, body.purpose as SignaturePurpose) }, { status: 201 });
    return Response.json({ error: "Choose an RFID enrollment or signature action." }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "RFID validation failed." }, { status: 400 }); }
}
