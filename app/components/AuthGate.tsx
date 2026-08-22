"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { LogOut } from "lucide-react";

type User = { fullName: string; employeeId: string; email: string; role: string; station: string };
const CrewContext = createContext<User | null>(null);

export function AuthGate({ children, team = "crew" }: { children: React.ReactNode; team?: "crew" | "catering" }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { fetch("/api/auth/me").then(async (response) => { if (!response.ok) { const path = `${window.location.pathname}${window.location.search}`; window.location.replace(`/login?returnTo=${encodeURIComponent(path)}`); return; } const nextUser = (await response.json()).user as User; const catering = nextUser.role.toLowerCase().includes("catering"); if (team === "catering" && !catering) return window.location.replace("/overview"); if (team === "crew" && catering) return window.location.replace("/catering"); setUser(nextUser); }).catch(() => window.location.replace("/login")); }, [team]);
  if (!user) return <div className="auth-loading"><span className="brand-mark">a</span><strong>Preparing operations workspace…</strong></div>;
  return <CrewContext.Provider value={user}>{children}</CrewContext.Provider>;
}

export function CrewProfile() {
  const user = useContext(CrewContext); if (!user) return null;
  const initials = user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  return <div className="crew-profile"><div className="avatar">{initials}</div><div><strong>{user.fullName}</strong><span>{user.role}</span></div><button className="profile-logout" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={15} /></button></div>;
}
