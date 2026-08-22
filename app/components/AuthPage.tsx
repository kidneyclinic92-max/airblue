"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Plane, ShieldCheck, UserRound, Utensils } from "lucide-react";

type AuthUser = { role: string };

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", employeeId: "", email: "", role: "Flight Attendant", station: "ISB", identity: "", password: "", confirm: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (signup && form.password !== form.confirm) return setError("Passwords do not match.");
    setSaving(true);
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json() as { error?: string; user?: AuthUser }; setSaving(false);
    if (!response.ok || !data.user) return setError(data.error ?? "Unable to continue.");
    const catering = data.user.role.toLowerCase().includes("catering");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const safeReturn = returnTo?.startsWith("/") && (catering ? returnTo.startsWith("/catering") : !returnTo.startsWith("/catering"));
    window.location.href = safeReturn ? returnTo! : catering ? "/catering" : "/overview";
  }

  function fillDemo(team: "crew" | "catering") {
    setForm({ ...form, identity: team === "crew" ? "sana.khan@airblue.com" : "catering.team@airblue.com", password: team === "crew" ? "Crew@123" : "Catering@123" });
  }

  return <main className="auth-page">
    <section className="auth-visual"><div className="auth-brand"><span className="brand-mark">a</span><strong>air<span>blue</span></strong><small>FLIGHT OPERATIONS</small></div><div className="auth-visual-copy"><span>BLUECREW OPS</span><h1>Prepared by catering.<br />Verified by cabin crew.</h1><p>One accountable workspace connecting uplift preparation, cabin readiness and shift continuity.</p><div className="auth-points"><span><CheckCircle2 /> Catering manifests by flight</span><span><CheckCircle2 /> Cabin-crew verification</span><span><CheckCircle2 /> Traceable operational handovers</span></div></div><div className="auth-flight-card"><Plane /><span><small>NEXT DEPARTURE</small><strong>PA201 · ISB → KHI</strong></span><b>11:20</b></div></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-form-icon">{signup ? <UserRound /> : <LockKeyhole />}</div><span className="auth-eyebrow">AIRBLUE TEAM ACCESS</span><h2>{signup ? "Create your operations account" : "Welcome back"}</h2><p>{signup ? "Register with your assigned cabin or catering role." : "Sign in to your assigned team workspace."}</p>
      <form onSubmit={submit}>
        {signup && <><label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Sana Khan" /></label><div className="auth-form-grid"><label>Employee ID<input required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value.toUpperCase() })} placeholder="AB-2047" /></label><label>Home station<input required value={form.station} onChange={(event) => setForm({ ...form, station: event.target.value.toUpperCase() })} placeholder="ISB" /></label></div><label>Airblue email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@airblue.com" /></label><label>Team role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><optgroup label="Cabin crew"><option>Flight Attendant</option><option>Cabin Supervisor</option><option>Senior Purser</option></optgroup><optgroup label="Catering"><option>Catering Staff</option><option>Catering Supervisor</option></optgroup></select></label></>}
        {!signup && <label>Email or employee ID<input required value={form.identity} onChange={(event) => setForm({ ...form, identity: event.target.value })} placeholder="name@airblue.com or employee ID" /></label>}
        <label>Password<div className="password-field"><input required type={showPassword ? "text" : "password"} minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Minimum 8 characters" /><button type="button" aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {signup && <label>Confirm password<input required type="password" minLength={8} value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} placeholder="Repeat your password" /></label>}
        {error && <div className="auth-error">{error}</div>}<button className="auth-submit" disabled={saving}>{saving ? "Please wait…" : signup ? "Create account" : "Sign in"}<ArrowRight /></button>
      </form>
      {!signup && <div className="demo-accounts"><div className="demo-account"><ShieldCheck /><span><strong>Cabin supervisor</strong>Sana · Crew@123</span><button onClick={() => fillDemo("crew")}>Use demo</button></div><div className="demo-account catering"><Utensils /><span><strong>Catering supervisor</strong>Ali · Catering@123</span><button onClick={() => fillDemo("catering")}>Use demo</button></div></div>}
      <p className="auth-switch">{signup ? "Already registered?" : "New operations team member?"} <a href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create account"}</a></p><small className="auth-footnote">Authorized Airblue team access only · Activity is recorded</small>
    </div></section>
  </main>;
}
