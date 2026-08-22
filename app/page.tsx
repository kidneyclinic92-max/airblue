"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coffee,
  FileText,
  HandCoins,
  LayoutDashboard,
  PackageCheck,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  ShieldAlert,
} from "lucide-react";
import { AuthGate, CrewProfile } from "./components/AuthGate";
import { MobileNav } from "./components/MobileNav";

type Item = {
  id: number;
  category: string;
  name: string;
  location: string;
  required: number;
  loaded: number;
  unit: string;
  checked: boolean;
  workflowStatus?: "draft" | "submitted" | "verified";
  preparedBy?: string;
  submittedAt?: string | null;
  crewVerifiedBy?: string;
};

const initialItems: Item[] = [
  { id: 1, category: "Catering", name: "Hot meal trays", location: "FWD galley", required: 126, loaded: 126, unit: "trays", checked: true },
  { id: 2, category: "Catering", name: "Water bottles", location: "FWD + AFT", required: 192, loaded: 184, unit: "bottles", checked: false },
  { id: 3, category: "Cabin comfort", name: "Blankets", location: "Bins 1–4", required: 48, loaded: 48, unit: "pieces", checked: true },
  { id: 4, category: "Cabin comfort", name: "Pillows", location: "Bins 1–4", required: 36, loaded: 36, unit: "pieces", checked: true },
  { id: 5, category: "Cabin service", name: "Tea & coffee kits", location: "FWD galley", required: 8, loaded: 8, unit: "kits", checked: true },
  { id: 6, category: "Cabin service", name: "Waste bags", location: "AFT galley", required: 20, loaded: 20, unit: "pieces", checked: false },
  { id: 7, category: "Special requests", name: "Infant meal", location: "FWD chiller", required: 2, loaded: 2, unit: "meals", checked: true },
  { id: 8, category: "Special requests", name: "Wheelchair tags", location: "Door 1L kit", required: 3, loaded: 3, unit: "tags", checked: true },
];

const categoryMeta: Record<string, { icon: typeof Coffee; tone: string }> = {
  Catering: { icon: Coffee, tone: "blue" },
  "Cabin comfort": { icon: Sparkles, tone: "indigo" },
  "Cabin service": { icon: PackageCheck, tone: "teal" },
  "Special requests": { icon: HandCoins, tone: "amber" },
};

export default function Home() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [filter, setFilter] = useState<"all" | "pending" | "shortage">("all");
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [notes, setNotes] = useState("Water bottles short by 8. Catering team notified at Gate 4.");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/operations")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.items?.length && setItems(data.items))
      .catch(() => undefined);
  }, []);

  const checked = items.filter((item) => item.checked).length;
  const shortages = items.filter((item) => item.loaded < item.required).length;
  const progress = items.length ? Math.round((checked / items.length) * 100) : 0;
  const manifestStatus = items.some((item) => item.workflowStatus === "draft") ? "draft" : items.length > 0 && items.every((item) => item.workflowStatus === "verified") ? "verified" : "submitted";
  const filteredItems = items.filter((item) => {
    if (filter === "pending") return !item.checked;
    if (filter === "shortage") return item.loaded < item.required;
    return true;
  });

  const groups = useMemo(() => {
    return Object.keys(categoryMeta).map((category) => {
      const group = items.filter((item) => item.category === category);
      return { category, done: group.filter((item) => item.checked).length, total: group.length };
    });
  }, [items]);

  async function updateItem(id: number, changes: Partial<Item>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    try {
      const response = await fetch("/api/operations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? "Unable to update item"); }
    } catch {
      setToast("Verification could not be saved. Refresh and try again.");
      fetch("/api/operations").then((response) => response.ok ? response.json() : null).then((data) => data?.items && setItems(data.items));
    }
  }

  async function sendHandover() {
    setSaving(true);
    try {
      await fetch("/api/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes, toCrew: "Ayesha Malik", toFlightNo: "PA207", toRoute: "KHI → DXB" }),
      });
    } finally {
      setSaving(false);
      setHandoverOpen(false);
      setToast("Handover sent to Ayesha Malik · PA207");
      window.setTimeout(() => setToast(""), 4200);
    }
  }

  async function saveDraft() {
    await fetch("/api/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes, toCrew: "Ayesha Malik", toFlightNo: "PA207", toRoute: "KHI → DXB", status: "draft" }) });
    setHandoverOpen(false);
    setToast("Draft saved for PA207");
    window.setTimeout(() => setToast(""), 3500);
  }

  function exportLog() {
    const rows = [["Item", "Category", "Location", "Required", "Loaded", "Status"], ...items.map((item) => [item.name, item.category, item.location, String(item.required), String(item.loaded), item.checked ? "Verified" : "Pending"])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "PA201-turnaround-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AuthGate><div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">a</span><span>air<span>blue</span></span></div>
        <div className="product-label">CREW OPERATIONS</div>
        <nav aria-label="Primary navigation">
          {[
            ["Overview", "/overview", LayoutDashboard],
            ["Turnaround", "/", ClipboardCheck],
            ["Flights", "/flights", Plane],
            ["Handovers", "/handovers", ArrowRight],
            ["Cabin Defects", "/defects", ShieldAlert],
            ["Reports", "/reports", FileText],
          ].map(([label, href, Icon]) => (
            <a key={href as string} href={href as string} className={label === "Turnaround" ? "nav-item active" : "nav-item"}>
              <Icon size={19} /><span>{label as string}</span>{label === "Turnaround" && <b>3</b>}
            </a>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="support-card">
          <div className="support-icon"><ShieldCheck size={19} /></div>
          <p>Need operational support?</p>
          <span>Contact OCC · Ext. 240</span>
        </div>
        <CrewProfile />
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">a</span> airblue</div>
          <div className="search"><Search size={18} /><input aria-label="Search flights or supplies" placeholder="Search flights, items or crew" /><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button aria-label="Notifications" className="icon-button"><Bell size={19} /><i /></button><span className="station"><b>ISB</b> Islamabad Station</span></div>
        </header>

        <div className="workspace">
          <section className="flight-banner">
            <div className="flight-primary">
              <div className="eyebrow"><span className="live-dot" /> TURNAROUND IN PROGRESS</div>
              <div className="route-row">
                <div><h1>PA201</h1><p>Islamabad <ArrowRight size={15} /> Karachi</p></div>
                <div className="aircraft-chip"><Plane size={18} /><span>Airbus A321<br /><b>AP-BMS</b></span></div>
              </div>
            </div>
            <div className="flight-stats">
              <div><span>DEPARTURE</span><strong>11:20</strong><small><Clock3 size={13} /> 42 min remaining</small></div>
              <div><span>GATE</span><strong>04</strong><small>Boarding 10:45</small></div>
              <div><span>LOAD</span><strong>181</strong><small><Users size={13} /> 94% capacity</small></div>
            </div>
            <div className="readiness">
              <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
              <div><span>FLIGHT READINESS</span><strong>{progress === 100 ? "Ready to board" : "Final checks"}</strong><small>{checked} of {items.length} items verified</small></div>
            </div>
          </section>

          <div className="section-heading">
            <div><span className="crumb">Turnaround / PA201</span><h2>Pre-flight requisites</h2><p>Verify service items and cabin readiness before passenger boarding.</p></div>
            <div className="heading-actions"><a className="ghost-button" href="/defects?new=1"><ShieldAlert size={17} /> Report defect</a><button className="ghost-button" onClick={exportLog}><FileText size={17} /> Export log</button><button className="primary-button" onClick={() => setHandoverOpen(true)}><ArrowRight size={17} /> Start handover</button></div>
          </div>

          <section className={`crew-manifest-banner ${manifestStatus}`}><span>{manifestStatus === "verified" ? <CheckCircle2 /> : manifestStatus === "submitted" ? <PackageCheck /> : <Clock3 />}</span><div><small>CATERING MANIFEST</small><strong>{manifestStatus === "verified" ? "Cabin verification complete" : manifestStatus === "submitted" ? "Submitted and ready for cabin verification" : "Awaiting submission from catering"}</strong><p>{items[0]?.preparedBy ? `Prepared by ${items[0].preparedBy}${items[0].submittedAt ? ` · ${new Date(items[0].submittedAt).toLocaleString()}` : ""}` : "Loaded quantities will appear once Catering submits this flight."}</p></div></section>

          <section className="category-grid">
            {groups.map(({ category, done, total }) => {
              const meta = categoryMeta[category];
              const Icon = meta.icon;
              const complete = done === total;
              return <article key={category} className={`category-card ${complete ? "complete" : ""}`}>
                <div className={`category-icon ${meta.tone}`}><Icon size={20} /></div>
                <div className="category-copy"><span>{category}</span><strong>{done}/{total} verified</strong><div className="mini-progress"><i style={{ width: `${(done / total) * 100}%` }} /></div></div>
                {complete ? <CheckCircle2 className="complete-check" size={20} /> : <span className="pending-count">{total - done}</span>}
              </article>;
            })}
          </section>

          <section className="inventory-panel">
            <div className="panel-toolbar">
              <div className="segmented" role="tablist" aria-label="Inventory filters">
                <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All items <span>{items.length}</span></button>
                <button className={filter === "pending" ? "selected" : ""} onClick={() => setFilter("pending")}>Needs check <span>{items.length - checked}</span></button>
                <button className={filter === "shortage" ? "selected" : ""} onClick={() => setFilter("shortage")}>Shortages <span className={shortages ? "alert" : ""}>{shortages}</span></button>
              </div>
              <div className="sync-status"><CheckCircle2 size={15} /> Saved just now</div>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Stowage</th><th>Required</th><th>Loaded</th><th>Variance</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const variance = item.loaded - item.required;
                    return <tr key={item.id} className={item.checked ? "row-checked" : ""}>
                      <td><div className="item-name"><button disabled={manifestStatus === "draft"} className={item.checked ? "check-box checked" : "check-box"} aria-label={`Mark ${item.name} verified`} onClick={() => updateItem(item.id, { checked: !item.checked })}>{item.checked && <Check size={14} />}</button><div><strong>{item.name}</strong><span>{item.category}</span></div></div></td>
                      <td><span className="location-pill">{item.location}</span></td>
                      <td><strong className="quantity">{item.required}</strong><span className="unit">{item.unit}</span></td>
                      <td><strong className="quantity catering-loaded">{item.loaded}</strong><span className="unit">{item.unit}</span></td>
                      <td>{variance < 0 ? <span className="variance shortage">{variance}</span> : <span className="variance okay">{variance > 0 ? `+${variance}` : "0"}</span>}</td>
                      <td>{item.checked ? <span className="status-pill verified"><CheckCircle2 size={14} /> Verified</span> : manifestStatus === "draft" ? <span className="status-pill waiting"><Clock3 size={14} /> Awaiting catering</span> : <button className={variance < 0 ? "verify-button shortage-verify" : "verify-button"} onClick={() => updateItem(item.id, { checked: true })}>{variance < 0 ? "Verify shortage" : "Verify"}</button>}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && <div className="empty-state"><CheckCircle2 size={28} /><strong>Nothing to review here</strong><span>All items in this view are accounted for.</span></div>}
            </div>
            <div className="panel-footer"><span><AlertTriangle size={15} /> {shortages} shortage requires attention before handover.</span><strong>{checked}/{items.length} checks completed</strong></div>
          </section>

          <section className="handover-strip">
            <div className="next-flight-icon"><Plane size={22} /></div>
            <div><span>NEXT ASSIGNMENT</span><strong>PA207 · Karachi to Dubai</strong><small>13:55 departure · Ayesha Malik, incoming supervisor</small></div>
            <div className="handover-state"><div className="avatar small">AM</div><span><b>Handover not started</b><small>Due by 11:05</small></span></div>
            <button onClick={() => setHandoverOpen(true)}>Prepare handover <ArrowRight size={16} /></button>
          </section>
        </div>
      </main>

      <MobileNav active="Turnaround" />

      {handoverOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setHandoverOpen(false)}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="handover-title">
          <div className="modal-header"><div><span className="modal-kicker">SHIFT CONTINUITY</span><h2 id="handover-title">Prepare flight handover</h2></div><button className="icon-button" aria-label="Close handover" onClick={() => setHandoverOpen(false)}><X size={20} /></button></div>
          <div className="handover-route"><div><span>FROM</span><strong>PA201</strong><small>ISB → KHI</small></div><ArrowRight size={22} /><div><span>NEXT FLIGHT</span><strong>PA207</strong><small>KHI → DXB</small></div></div>
          <div className="recipient"><div className="avatar">AM</div><div><span>HAND OVER TO</span><strong>Ayesha Malik</strong><small>Cabin Supervisor · Karachi Station</small></div><span className="online">On duty</span></div>
          <div className="handover-summary">
            <div><CheckCircle2 size={17} /><span><strong>{checked}/{items.length}</strong> requisites verified</span></div>
            <div className={shortages ? "warn" : ""}><AlertTriangle size={17} /><span><strong>{shortages}</strong> open shortage</span></div>
            <div><Clock3 size={17} /><span>Snapshot at <strong>10:38</strong></span></div>
          </div>
          <label className="notes-label">Operational notes <span>Required for open issues</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} /></label>
          <label className="confirmation"><input type="checkbox" defaultChecked /><span>I confirm this handover reflects the latest cabin and catering status.</span></label>
          <div className="modal-actions"><button className="ghost-button" onClick={saveDraft}>Save draft</button><button className="primary-button" onClick={sendHandover} disabled={saving}>{saving ? "Sending…" : "Send & notify incoming crew"} <ArrowRight size={17} /></button></div>
        </section>
      </div>}

      {toast && <div className="toast"><CheckCircle2 size={19} /><span><strong>Handover complete</strong>{toast}</span></div>}
    </div></AuthGate>
  );
}
