import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const items = [
  { label: "Overview", path: "/dashboard", icon: "grid", group: "Main" },
  { label: "My Farms & Records", path: "/farm-tools", icon: "farm", group: "Main" },
  { label: "Crop Recommendations", path: "/crop-recommendation", icon: "sprout", group: "Main" },
  { label: "Disease Detection", path: "/disease-detection", icon: "scan", group: "Main" },
  { label: "Smart Irrigation", path: "/farm-tools?module=irrigation", icon: "water", group: "Farm management" },
  { label: "Weather Intelligence", path: "/weather", icon: "weather", group: "Farm management" },
  { label: "Fertilizer Advisor", path: "/farm-tools?module=nutrient-advice", icon: "leaf", group: "Farm management" },
  { label: "Yield Prediction", path: "/farm-tools?module=yield-estimate", icon: "chart", group: "Farm management" },
  { label: "Market Prices", path: "/market-prices", icon: "price", group: "Marketplace" },
  { label: "Farmer Marketplace", path: "/marketplace", icon: "store", group: "Marketplace" },
  { label: "Government Schemes", path: "/farm-tools?module=schemes", icon: "bank", group: "Intelligence" },
  { label: "AI Farming Assistant", path: "/ai-assistant", icon: "bot", group: "Intelligence" },
  { label: "Notifications & Inbox", path: "/profile?tab=inquiries", icon: "bell", group: "Intelligence" },
  { label: "Profile & Settings", path: "/profile", icon: "user", group: "Account" },
];
const titles: Record<string, string> = {
  "/crop-recommendation": "Crop recommendations", "/crop-results": "Recommendation results",
  "/disease-detection": "Disease detection", "/farm-tools": "Farm workspace",
  "/weather": "Weather intelligence", "/market-prices": "Market prices",
  "/marketplace": "Farmer marketplace", "/ai-assistant": "AI farming assistant", "/profile": "Your account",
};

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const shapes: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    farm: <><path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-6h6v6"/><path d="M9 9h.01M15 9h.01"/></>,
    sprout: <><path d="M12 21v-9M12 12C7 12 5 9 5 5c4 0 7 2 7 7ZM12 15c0-4 2-7 7-7 0 4-2 7-7 7Z"/></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3"/><path d="M8 13c2-5 6-5 8 0-2 4-6 4-8 0Z"/></>,
    water: <><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/><path d="M9 15a3 3 0 0 0 3 3"/></>,
    weather: <><path d="M7 18h10a4 4 0 0 0 .3-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z"/><path d="M9 21v-1m6 1v-1"/></>,
    leaf: <><path d="M20 4C9 4 4 8 4 15a5 5 0 0 0 5 5c7 0 11-5 11-16Z"/><path d="M4 20c3-5 7-8 12-11"/></>,
    chart: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
    records: <><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/></>,
    price: <><path d="M4 5h16v14H4zM8 9h8M8 13h3m3 0h2M8 16h8"/></>,
    store: <><path d="M4 10v10h16V10M3 5h18l-2 5H5L3 5Z"/><path d="M9 20v-6h6v6"/></>,
    bank: <><path d="m3 9 9-6 9 6H3ZM5 10v8m5-8v8m4-8v8m5-8v8M3 21h18"/></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.grid}</svg>;
}

type Farm = { id: number; name: string; state: string; district: string; currentCrop?: string };
type User = { name?: string; email?: string; state?: string; district?: string };
function readUser(): User { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState<User>(() => readUser());
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState(() => localStorage.getItem("activeFarmId") || "");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const activeFarm = farms.find((farm) => String(farm.id) === farmId);
  const title = titles[location.pathname] || "Farm workspace";

  useEffect(() => {
    // These workspaces already load their farm choices for their own forms.
    if (["/farm-tools", "/crop-results", "/ai-assistant"].includes(location.pathname)) {
      return;
    }
    let cancelled = false;
    fetch(`${API}/api/farms`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Farm request failed")))
      .then((data) => { if (!cancelled) { const list = data.farms || []; setFarms(list); const saved = localStorage.getItem("activeFarmId"); setFarmId(saved && list.some((farm: Farm) => String(farm.id) === saved) ? saved : String(list[0]?.id || "")); } })
      .catch(() => { if (!cancelled) setFarms([]); });
    return () => { cancelled = true; };
  }, [location.pathname]);
  useEffect(() => { if (farmId) localStorage.setItem("activeFarmId", farmId); }, [farmId]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setDrawerOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const signOut = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); };
  const renderSidebar = (mobile = false) => <aside className={`flex h-full flex-col bg-[#10261d] text-white ${mobile ? "w-[284px]" : collapsed ? "w-[76px]" : "w-[258px]"}`}>
    <div className={`flex h-[76px] shrink-0 items-center border-b border-white/10 ${collapsed && !mobile ? "justify-center px-2" : "gap-3 px-5"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500"><Icon name="sprout" className="h-6 w-6"/></span>{(!collapsed || mobile) && <div><div className="text-sm font-bold tracking-wide">SMART CROP <span className="text-emerald-300">360</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-emerald-100/60">Intelligent farming</div></div>}{mobile && <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10"><Icon name="close"/></button>}</div>
    <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">{[...new Set(items.map((item) => item.group))].map((group) => <div key={group}><p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-100/45 ${collapsed && !mobile ? "sr-only" : ""}`}>{group}</p><div className="space-y-1">{items.filter((item) => item.group === group).map((item) => { const [target, query] = item.path.split("?"); const selectedTab = new URLSearchParams(location.search).get("tab"); const active = target === "/profile" ? location.pathname === target && (item.label === "Inbox" || item.label === "Notifications & Inbox" ? selectedTab === "inquiries" : selectedTab !== "inquiries") : location.pathname === target && (query ? location.search === `?${query}` : target !== "/farm-tools" || !location.search); return <button type="button" key={item.label} title={collapsed && !mobile ? item.label : undefined} aria-current={active ? "page" : undefined} onClick={() => { navigate(item.path); setDrawerOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${active ? "bg-emerald-500 text-white" : "text-emerald-50/75 hover:bg-white/8 hover:text-white"} ${collapsed && !mobile ? "justify-center px-0" : ""}`}><Icon name={item.icon}/>{(!collapsed || mobile) && <span className="truncate">{item.label}</span>}</button>; })}</div></div>)}</nav>
    <div className="border-t border-white/10 p-3">{(!collapsed || mobile) && <button type="button" onClick={() => navigate("/profile")} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/8"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-sm font-semibold">{(user.name || "F").charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.name || "Farmer"}</span><span className="block text-[10px] text-emerald-100/55">Farm account</span></span></button>}{!mobile && <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-emerald-100/60 hover:bg-white/8"><span className={collapsed ? "rotate-180" : ""}><Icon name="chevron" className="h-4 w-4"/></span>{!collapsed && <span className="ml-2 text-xs">Collapse sidebar</span>}</button>}</div>
  </aside>;

  return <div className="min-h-screen bg-[#f5f7f4] text-slate-800">
    <div className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 md:block ${collapsed ? "w-[76px]" : "w-[258px]"}`}>{renderSidebar()}</div>
    {drawerOpen && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="Close navigation backdrop" className="absolute inset-0 bg-slate-950/45" onClick={() => setDrawerOpen(false)}/><div className="relative h-full shadow-2xl">{renderSidebar(true)}</div></div>}
    <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "md:ml-[76px]" : "md:ml-[258px]"}`}>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 md:hidden"><Icon name="menu"/></button><div className="min-w-0"><p className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700 sm:block">Smart Crop 360</p><h1 className="truncate text-lg font-bold text-slate-900 sm:mt-0.5 sm:text-xl">{title}</h1></div></div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">{farms.length > 0 && <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex"><Icon name="farm" className="h-4 w-4 text-emerald-700"/><span className="sr-only">Active farm</span><select aria-label="Select active farm" value={farmId} onChange={(event) => { setFarmId(event.target.value); window.dispatchEvent(new CustomEvent("farm-context-change", { detail: { farmId: event.target.value } })); }} className="max-w-48 bg-transparent text-xs font-semibold text-slate-700 outline-none"><option value="">No farm selected</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>}<button type="button" aria-label="Open notifications and inbox" onClick={() => navigate("/profile")} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><Icon name="bell"/></button><div className="relative"><button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{(user.name || "F").charAt(0).toUpperCase()}</span><span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 lg:block">{user.name || "Farmer"}</span></button>{profileOpen && <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><div className="px-3 py-2"><p className="truncate text-sm font-semibold">{user.name || "Farmer"}</p><p className="truncate text-xs text-slate-500">{user.email || "Signed-in account"}</p></div><button type="button" onClick={() => { setProfileOpen(false); navigate("/profile"); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Profile & settings</button><button type="button" onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign out</button></div>}</div></div>
      </div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 sm:px-6 lg:px-8"><span className="inline-flex min-w-0 items-center gap-1"><Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-emerald-700"/><span className="truncate">{activeFarm ? `${activeFarm.name} · ${activeFarm.district}, ${activeFarm.state}` : [user.district, user.state].filter(Boolean).join(", ") || "No farm selected"}</span></span>{farms.length > 0 && <label className="sm:hidden"><span className="sr-only">Select active farm</span><select aria-label="Select active farm" value={farmId} onChange={(event) => { setFarmId(event.target.value); window.dispatchEvent(new CustomEvent("farm-context-change", { detail: { farmId: event.target.value } })); }} className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"><option value="">Select farm</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>}</div></header>
      {children}
    </div>
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{[{ label: "Home", path: "/dashboard", icon: "grid" }, { label: "Farms", path: "/farm-tools", icon: "farm" }, { label: "Disease", path: "/disease-detection", icon: "scan" }, { label: "Markets", path: "/market-prices", icon: "price" }, { label: "Assistant", path: "/ai-assistant", icon: "bot" }].map((item) => <button type="button" key={item.path} onClick={() => navigate(item.path)} aria-current={location.pathname === item.path ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 py-1 text-[10px] ${location.pathname === item.path ? "text-emerald-700" : "text-slate-500"}`}><Icon name={item.icon} className="h-[18px] w-[18px]"/><span>{item.label}</span></button>)}</div></nav>
  </div>;
}
