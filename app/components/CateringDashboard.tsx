"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChefHat, Clock3, Minus, PackageCheck, Plane, Plus, RefreshCw, Send, Utensils } from "lucide-react";
import { AuthGate, CrewProfile } from "./AuthGate";

type Flight = { flightNo: string; flightDate: string; origin: string; destination: string; departure: string; aircraft: string; registration: string; gate: string; passengers: number };
type CateringItem = { id: number; flightId: string; category: string; name: string; location: string; required: number; loaded: number; unit: string; checked: boolean; workflowStatus: "draft" | "submitted" | "verified"; preparedBy: string; submittedAt: string | null; cateringNotes: string };

export function CateringDashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightNo, setFlightNo] = useState("PA201");
  const [items, setItems] = useState<CateringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load(selected = flightNo) {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/catering?flightNo=${encodeURIComponent(selected)}`); const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load catering manifest.");
      setFlights(data.flights); setFlightNo(data.selectedFlight); setItems(data.items);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load catering manifest."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/catering?flightNo=PA201").then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
      if (!active) return; if (!response.ok) throw new Error(data.error ?? "Unable to load catering manifest.");
      setFlights(data.flights); setFlightNo(data.selectedFlight); setItems(data.items); setLoading(false);
    }).catch((caught) => { if (active) { setError(caught instanceof Error ? caught.message : "Unable to load catering manifest."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const flight = flights.find((candidate) => candidate.flightNo === flightNo);
  const totals = useMemo(() => ({ required: items.reduce((sum, item) => sum + item.required, 0), loaded: items.reduce((sum, item) => sum + item.loaded, 0), shortages: items.filter((item) => item.loaded < item.required).length }), [items]);
  const status = items.some((item) => item.workflowStatus === "draft") ? "draft" : items.length > 0 && items.every((item) => item.workflowStatus === "verified") ? "verified" : "submitted";

  async function updateItem(item: CateringItem, loaded: number) {
    const next = Math.max(0, Math.round(loaded)); setSavingId(item.id); setError("");
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, loaded: next, workflowStatus: "draft", checked: false } : candidate));
    try {
      const response = await fetch("/api/catering", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, loaded: next, cateringNotes: item.cateringNotes }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to save quantity.");
      setItems((current) => current.map((candidate) => candidate.id === item.id ? data.item : candidate));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save quantity."); await load(flightNo); }
    finally { setSavingId(null); }
  }

  async function submitManifest() {
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/catering", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit", flightNo }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to submit manifest.");
      setItems(data.items); setNotice(data.message); window.setTimeout(() => setNotice(""), 4200);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit manifest."); }
    finally { setSubmitting(false); }
  }

  return <AuthGate team="catering"><div className="catering-shell">
    <aside className="catering-sidebar"><a href="/catering" className="brand"><span className="brand-mark">a</span><span>air<span>blue</span></span></a><div className="product-label">CATERING OPERATIONS</div><nav><a href="/catering" className="nav-item active"><ChefHat size={19} /> Flight manifests</a></nav><div className="catering-process"><Utensils /><strong>Prepare → Submit → Verify</strong><span>Cabin crew receives each manifest as soon as catering submits it.</span></div><div className="sidebar-spacer" /><CrewProfile /></aside>
    <main className="catering-main"><header className="catering-topbar"><div className="mobile-brand"><span className="brand-mark">a</span> airblue <small>CATERING</small></div><div><span className="catering-eyebrow">ISLAMABAD STATION</span><strong>Catering control desk</strong></div><button className="ghost-button" onClick={() => load(flightNo)}><RefreshCw size={16} /> Refresh</button></header>
      <div className="catering-workspace"><section className="catering-heading"><div><span className="catering-eyebrow">FLIGHT UPLIFT WORKSPACE</span><h1>Pre-flight catering manifest</h1><p>Enter final loaded quantities, record any shortages, then submit the manifest to cabin crew for verification.</p></div><label>Active flight<select value={flightNo} onChange={(event) => { setFlightNo(event.target.value); void load(event.target.value); }}>{flights.map((item) => <option key={item.flightNo} value={item.flightNo}>{item.flightNo} · {item.origin} → {item.destination} · {item.departure}</option>)}</select></label></section>
        {flight && <section className="catering-flight"><div className="catering-flight-route"><span className="catering-plane"><Plane /></span><div><small>ACTIVE MANIFEST</small><h2>{flight.flightNo}</h2><strong>{flight.origin} <span>→</span> {flight.destination}</strong></div></div><div className="catering-flight-meta"><span><small>DEPARTURE</small><strong>{flight.departure}</strong></span><span><small>GATE</small><strong>{flight.gate}</strong></span><span><small>AIRCRAFT</small><strong>{flight.aircraft.replace("Airbus ", "")}</strong><b>{flight.registration}</b></span><span><small>PASSENGERS</small><strong>{flight.passengers}</strong></span></div><div className={`manifest-state ${status}`}><span>{status === "verified" ? <CheckCircle2 /> : status === "submitted" ? <Send /> : <Clock3 />}</span><div><small>MANIFEST STATUS</small><strong>{status === "verified" ? "Verified by cabin crew" : status === "submitted" ? "Awaiting cabin verification" : "Draft in progress"}</strong></div></div></section>}
        <section className="catering-kpis"><article><span><PackageCheck /></span><div><small>LOADED UNITS</small><strong>{totals.loaded}</strong><p>of {totals.required} required</p></div></article><article className={totals.shortages ? "warning" : "success"}><span>{totals.shortages ? <AlertTriangle /> : <CheckCircle2 />}</span><div><small>SHORTAGE LINES</small><strong>{totals.shortages}</strong><p>{totals.shortages ? "Can submit with variance" : "All quantities matched"}</p></div></article><article><span><Send /></span><div><small>HANDOFF</small><strong>{status === "draft" ? "Not sent" : "Sent"}</strong><p>{items[0]?.preparedBy ? `Prepared by ${items[0].preparedBy}` : "Awaiting preparation"}</p></div></article></section>
        {error && <div className="catering-alert error"><AlertTriangle /> {error}</div>}{notice && <div className="catering-alert success"><CheckCircle2 /> {notice}</div>}
        <section className="catering-manifest"><div className="manifest-toolbar"><div><h2>Uplift items</h2><p>{items.length} requisites assigned to {flightNo}</p></div><span className={`manifest-badge ${status}`}>{status}</span></div>
          {loading ? <div className="catering-empty">Loading manifest…</div> : <div className="catering-items">{items.map((item) => { const variance = item.loaded - item.required; return <article key={item.id} className={variance < 0 ? "has-shortage" : ""}><div className="catering-item-name"><span className="item-category">{item.category}</span><strong>{item.name}</strong><small>{item.location}</small></div><div className="catering-required"><small>REQUIRED</small><strong>{item.required}</strong><span>{item.unit}</span></div><div className="catering-quantity"><small>LOADED</small><div className="catering-stepper"><button aria-label={`Decrease ${item.name}`} disabled={savingId === item.id} onClick={() => updateItem(item, item.loaded - 1)}><Minus /></button><input aria-label={`${item.name} loaded quantity`} type="number" min="0" value={item.loaded} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, loaded: Number(event.target.value), workflowStatus: "draft" } : candidate))} onBlur={() => updateItem(item, item.loaded)} /><button aria-label={`Increase ${item.name}`} disabled={savingId === item.id} onClick={() => updateItem(item, item.loaded + 1)}><Plus /></button></div></div><div className={`catering-variance ${variance < 0 ? "short" : "ready"}`}><small>VARIANCE</small><strong>{variance > 0 ? `+${variance}` : variance}</strong><span>{variance < 0 ? "Short" : "Ready"}</span></div></article>; })}</div>}
          <footer className="manifest-submit"><div>{totals.shortages ? <AlertTriangle /> : <CheckCircle2 />}<span><strong>{totals.shortages ? `${totals.shortages} shortage line${totals.shortages > 1 ? "s" : ""}` : "Manifest quantities complete"}</strong><small>Submitting locks in this snapshot for cabin-crew verification. Editing later returns it to draft.</small></span></div><button className="primary-button" disabled={loading || submitting || !items.length || savingId !== null} onClick={submitManifest}>{submitting ? "Submitting…" : status === "draft" ? "Submit to cabin crew" : "Resubmit manifest"} <Send size={17} /></button></footer>
        </section>
      </div>
    </main>
  </div></AuthGate>;
}
