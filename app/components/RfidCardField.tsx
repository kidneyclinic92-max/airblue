"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Radio } from "lucide-react";

type Credential = { cardFingerprint: string; enrolledAt: string; lastUsedAt: string | null };

export function RfidCardField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [credential, setCredential] = useState<Credential | null>(null); const [loading, setLoading] = useState(true); const [enrolling, setEnrolling] = useState(false); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/rfid").then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => { if (!response.ok) throw new Error(data.error); setCredential(data.credential); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load RFID credential.")).finally(() => setLoading(false)); }, []);
  async function enroll() { setError(""); setEnrolling(true); const response = await fetch("/api/rfid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "enroll", cardUid: value }) }); const data = await response.json(); setEnrolling(false); if (!response.ok) return setError(data.error ?? "Unable to enroll card."); setCredential(data.credential); onChange(""); }
  return <section className="rfid-card-field"><div className="rfid-field-head"><span><Radio /></span><div><small>RFID DIGITAL SIGNATURE</small><strong>{credential ? `Crew card •••• ${credential.cardFingerprint}` : loading ? "Checking crew card…" : "No crew card enrolled"}</strong></div>{credential && <CheckCircle2 className="rfid-valid" />}</div><label><span>{credential ? "Tap your registered RFID card" : "Tap a card to enroll it to your account"}</span><div><CreditCard /><input type="password" autoComplete="off" disabled={disabled || loading} value={value} onChange={(event) => onChange(event.target.value)} placeholder="RFID reader input" /></div></label>{!credential && !loading && <button type="button" className="rfid-enroll" disabled={enrolling || value.trim().length < 6} onClick={enroll}>{enrolling ? "Enrolling…" : "Enroll this crew card"}</button>}{error && <p className="rfid-error">{error}</p>}<p className="rfid-help">USB RFID readers that type the card ID are supported. The card ID is hashed before storage.</p></section>;
}
