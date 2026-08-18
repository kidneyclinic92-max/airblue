"use client";

import { ClipboardCheck, FileText, LayoutDashboard, Plane, Send, ShieldAlert } from "lucide-react";

const items = [
  ["Overview", "/overview", LayoutDashboard],
  ["Turnaround", "/", ClipboardCheck],
  ["Flights", "/flights", Plane],
  ["Handovers", "/handovers", Send],
  ["Defects", "/defects", ShieldAlert],
  ["Reports", "/reports", FileText],
] as const;

export function MobileNav({ active }: { active: string }) {
  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
    {items.map(([label, href, Icon]) => {
      const selected = active === label || (active === "Cabin Defects" && label === "Defects");
      return <a key={href} href={href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}>
        <Icon aria-hidden="true" /><span>{label}</span>
      </a>;
    })}
  </nav>;
}
