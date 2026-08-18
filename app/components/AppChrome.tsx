"use client";

import { ArrowRight, Bell, ClipboardCheck, FileText, LayoutDashboard, Plane, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { AuthGate, CrewProfile } from "./AuthGate";
import { MobileNav } from "./MobileNav";

const nav = [
  ["Overview", "/overview", LayoutDashboard], ["Turnaround", "/", ClipboardCheck], ["Flights", "/flights", Plane], ["Handovers", "/handovers", ArrowRight], ["Cabin Defects", "/defects", ShieldAlert], ["Reports", "/reports", FileText],
] as const;

export function AppChrome({ children, active }: { children: React.ReactNode; active: string }) {
  return <AuthGate><div className="app-shell">
    <aside className="sidebar">
      <a href="/overview" className="brand"><span className="brand-mark">a</span><span>air<span>blue</span></span></a>
      <div className="product-label">CREW OPERATIONS</div>
      <nav aria-label="Primary navigation">{nav.map(([label, href, Icon]) => <a key={href} href={href} className={active === label ? "nav-item active" : "nav-item"}><Icon size={19} /><span>{label}</span>{label === "Turnaround" && <b>3</b>}</a>)}</nav>
      <div className="sidebar-spacer" />
      <div className="support-card"><div className="support-icon"><ShieldCheck size={19} /></div><p>Need operational support?</p><span>Contact OCC · Ext. 240</span></div>
      <CrewProfile />
    </aside>
    <main>
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">a</span> airblue</div><div className="search"><Search size={18} /><input aria-label="Search operations" placeholder="Search flights, items or crew" /><kbd>⌘ K</kbd></div><div className="top-actions"><button aria-label="Notifications" className="icon-button"><Bell size={19} /><i /></button><span className="station"><b>ISB</b> Islamabad Station</span></div></header>
      {children}
      <MobileNav active={active} />
    </main>
  </div></AuthGate>;
}
