import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WeatherWidget from "../components/WeatherWidget";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
type Farm = { id: number; name: string; state: string; district: string; acres: number; soilType?: string; currentCrop?: string };
type FarmRecord = { id: number; farmId: number; kind: string; crop?: string; result: Record<string, unknown>; createdAt: string };
type Listing = { id: number };
type Scheme = { name: string; description: string; url: string };
type User = { name?: string; state?: string; district?: string };

const nav = [
  { label: "Dashboard", path: "/dashboard", icon: "grid", group: "Workspace" },
  { label: "My Farms", path: "/farm-tools", icon: "farm", group: "Workspace" },
  { label: "Crop Recommendation", path: "/crop-recommendation", icon: "sprout", group: "Workspace" },
  { label: "Disease Detection", path: "/disease-detection", icon: "scan", group: "Workspace" },
  { label: "Irrigation & Farm Tools", path: "/farm-tools?module=irrigation", icon: "water", group: "Advisory" },
  { label: "Weather Intelligence", path: "/weather", icon: "weather", group: "Advisory" },
  { label: "Fertilizer Advisor", path: "/farm-tools?module=nutrient-advice", icon: "leaf", group: "Advisory" },
  { label: "Yield Prediction", path: "/farm-tools?module=yield-estimate", icon: "chart", group: "Advisory" },
  { label: "Market Prices", path: "/market-prices", icon: "price", group: "Market" },
  { label: "Marketplace", path: "/marketplace", icon: "store", group: "Market" },
  { label: "Government Schemes", path: "/farm-tools?module=schemes", icon: "bank", group: "Market" },
  { label: "AI Farming Assistant", path: "/ai-assistant", icon: "bot", group: "Account" },
  { label: "Inbox", path: "/profile?tab=inquiries", icon: "inbox", group: "Account" },
  { label: "Profile & Settings", path: "/profile", icon: "user", group: "Account" },
];

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    farm: <><path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-6h6v6"/><path d="M9 9h.01M15 9h.01"/></>,
    sprout: <><path d="M12 21v-9M12 12C7 12 5 9 5 5c4 0 7 2 7 7ZM12 15c0-4 2-7 7-7 0 4-2 7-7 7Z"/></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 13c2-5 6-5 8 0-2 4-6 4-8 0Z"/><circle cx="12" cy="13" r="1"/></>,
    water: <><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/><path d="M9 15a3 3 0 0 0 3 3"/></>,
    weather: <><path d="M7 18h10a4 4 0 0 0 .3-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z"/><path d="M9 21v-1m6 1v-1"/></>,
    leaf: <><path d="M20 4C9 4 4 8 4 15a5 5 0 0 0 5 5c7 0 11-5 11-16Z"/><path d="M4 20c3-5 7-8 12-11"/></>,
    chart: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
    price: <><path d="M4 5h16v14H4zM8 9h8M8 13h3m3 0h2M8 16h8"/></>,
    store: <><path d="M4 10v10h16V10M3 5h18l-2 5H5L3 5Z"/><path d="M9 20v-6h6v6"/></>,
    bank: <><path d="m3 9 9-6 9 6H3ZM5 10v8m5-8v8m4-8v8m5-8v8M3 21h18"/></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></>,
    inbox: <><path d="M4 5h16v14H4zM4 14h4l2 2h4l2-2h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" {...common}>{paths[name] || paths.grid}</svg>;
}

async function request(path: string, authenticated = true) {
  const headers: HeadersInit = authenticated ? { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } : {};
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function safeUser(): User {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recent" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DashboardCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,.025)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{title}</h2>{action}</div>{children}</section>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState<User>(() => safeUser());
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<FarmRecord[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [farmDataAvailable, setFarmDataAvailable] = useState<boolean | null>(null);
  const [listingDataAvailable, setListingDataAvailable] = useState(false);
  const [activeFarmId, setActiveFarmId] = useState(() => localStorage.getItem("activeFarmId") || "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const activeFarm = farms.find((farm) => String(farm.id) === activeFarmId) || farms[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setLoadError("");
      const [farmResult, recordResult, listingResult, schemeResult] = await Promise.allSettled([
        request("/api/farms"), request("/api/farm-records"), request("/api/listings", false), request("/api/schemes", false),
      ]);
      if (cancelled) return;
      if (farmResult.status === "fulfilled") {
        setFarmDataAvailable(true);
        const items = farmResult.value.farms || [];
        setFarms(items);
        const saved = localStorage.getItem("activeFarmId");
        setActiveFarmId(saved && items.some((farm: Farm) => String(farm.id) === saved) ? saved : String(items[0]?.id || ""));
      } else { setFarmDataAvailable(false); setLoadError("Farm data could not be loaded. Check your connection and sign in again if needed."); }
      if (recordResult.status === "fulfilled") setRecords(recordResult.value.records || []);
      if (listingResult.status === "fulfilled") { setListings(listingResult.value.listings || []); setListingDataAvailable(true); }
      if (schemeResult.status === "fulfilled") setSchemes(schemeResult.value.schemes || []);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeFarmId) localStorage.setItem("activeFarmId", activeFarmId);
  }, [activeFarmId]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const farmRecords = records.filter((record) => Number(record.farmId) === Number(activeFarm?.id));
  const latestIrrigation = farmRecords.find((record) => record.kind === "irrigation");
  const latestRecords = farmRecords.slice(0, 4);
  const landMaximum = Math.max(...farms.map((farm) => Number(farm.acres) || 0), 1);
  const totalArea = farms.reduce((sum, farm) => sum + (Number(farm.acres) || 0), 0);
  const activeCrops = new Set(farms.map((farm) => farm.currentCrop?.trim()).filter(Boolean)).size;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const groupedNav = [...new Set(nav.map((item) => item.group))];

  const renderSidebar = (mobile = false) => <aside className={`flex h-full flex-col bg-[#10261d] text-white ${mobile ? "w-[284px]" : collapsed ? "w-[76px]" : "w-64"}`}>
    <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed && !mobile ? "justify-center px-2" : "gap-3 px-5"}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Icon name="sprout" className="h-6 w-6"/></div>
      {(!collapsed || mobile) && <div className="min-w-0"><div className="truncate text-sm font-bold tracking-wide">SMART CROP <span className="text-emerald-300">360</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-emerald-100/60">Farm intelligence</div></div>}
      {mobile && <button aria-label="Close navigation" className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10" onClick={() => setMobileOpen(false)}><Icon name="close"/></button>}
    </div>
    <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      {groupedNav.map((group) => <div key={group}><p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-100/45 ${collapsed && !mobile ? "sr-only" : ""}`}>{group}</p><div className="space-y-1">{nav.filter((item) => item.group === group).map((item) => {
        const [target, query] = item.path.split("?"); const selectedTab = new URLSearchParams(location.search).get("tab"); const active = target === "/profile" ? location.pathname === target && (item.label === "Inbox" || item.label === "Notifications & Inbox" ? selectedTab === "inquiries" : selectedTab !== "inquiries") : location.pathname === target && (query ? location.search === `?${query}` : target !== "/farm-tools" || !location.search);
        return <button key={item.label} type="button" title={collapsed && !mobile ? item.label : undefined} aria-current={active ? "page" : undefined} onClick={() => { navigate(item.path); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${active ? "bg-emerald-500 text-white shadow-sm" : "text-emerald-50/75 hover:bg-white/8 hover:text-white"} ${collapsed && !mobile ? "justify-center px-0" : ""}`}><Icon name={item.icon} className="h-[18px] w-[18px] shrink-0"/>{(!collapsed || mobile) && <span className="truncate">{item.label}</span>}</button>;
      })}</div></div>)}
    </nav>
    <div className={`border-t border-white/10 p-3 ${collapsed && !mobile ? "text-center" : ""}`}>
      {(!collapsed || mobile) && <button type="button" onClick={() => navigate("/profile")} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/8"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-sm font-semibold text-emerald-100">{(user.name || "F").charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.name || "Farmer"}</span><span className="block text-[10px] text-emerald-100/55">Farm account</span></span></button>}
      {!mobile && <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className={`mt-2 flex w-full items-center justify-center rounded-lg p-2 text-emerald-100/60 hover:bg-white/8 hover:text-white ${collapsed ? "" : ""}`}><span className={`transition-transform ${collapsed ? "rotate-180" : ""}`}><Icon name="chevron" className="h-4 w-4"/></span>{!collapsed && <span className="ml-2 text-xs">Collapse sidebar</span>}</button>}
    </div>
  </aside>;

  return <div className="min-h-screen bg-[#f5f7f4] text-slate-800">
    <div className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 md:block ${collapsed ? "w-[76px]" : "w-64"}`}>{renderSidebar()}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)}/><div className="relative h-full shadow-2xl">{renderSidebar(true)}</div></div>}
    <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "md:ml-[76px]" : "md:ml-64"}`}>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 md:hidden"><Icon name="menu"/></button><div className="min-w-0"><p className="hidden text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-700 sm:block">Farm overview</p><h1 className="truncate text-lg font-bold text-slate-900 sm:mt-0.5 sm:text-xl">{greeting}, {user.name?.split(" ")[0] || "Farmer"}</h1></div></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex"><Icon name="farm" className="h-4 w-4 text-emerald-700"/><span className="sr-only">Active farm</span><select aria-label="Select active farm" value={activeFarm ? String(activeFarm.id) : ""} onChange={(e) => setActiveFarmId(e.target.value)} className="max-w-44 bg-transparent text-xs font-semibold text-slate-700 outline-none"><option value="">No farm selected</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
            <button type="button" aria-label="Open inbox and notifications" onClick={() => navigate("/profile")} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><Icon name="bell" className="h-[18px] w-[18px]"/></button>
            <div className="relative"><button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{(user.name || "F").charAt(0).toUpperCase()}</span><span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 lg:block">{user.name || "Farmer"}</span></button>{profileOpen && <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" onClick={() => navigate("/profile")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Profile and settings</button><button type="button" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign out</button></div>}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span>{loadError}</span><button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Retry</button></div>}
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-sm text-slate-500">Here is what is happening across your farm today.</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4 text-emerald-700"/>{activeFarm ? `${activeFarm.district}, ${activeFarm.state}` : [user.district, user.state].filter(Boolean).join(", ") || "Add your farm location"}</span><span className="hidden h-3 w-px bg-slate-300 sm:block"/><span>{activeFarm ? activeFarm.name : "No active farm selected"}</span></div></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:hidden"><Icon name="farm" className="h-4 w-4 text-emerald-700"/><span className="sr-only">Active farm</span><select aria-label="Select active farm" value={activeFarm ? String(activeFarm.id) : ""} onChange={(e) => setActiveFarmId(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"><option value="">No farm selected</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><button type="button" onClick={() => navigate("/farm-tools")} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"><Icon name="plus" className="h-4 w-4"/>Manage farms</button></div>

        <section aria-label="Farm metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Active crops", value: loading ? "…" : farmDataAvailable === false ? "—" : String(activeCrops), note: farmDataAvailable === false ? "Farm data unavailable" : "From saved farm profiles", icon: "sprout", tone: "emerald" },
            { label: "Total farm area", value: farms.length ? `${totalArea.toLocaleString()} ac` : "—", note: farms.length ? `${farms.length} saved ${farms.length === 1 ? "farm" : "farms"}` : "Add a farm to begin", icon: "farm", tone: "blue" },
            { label: "Soil moisture", value: "Not measured", note: "No connected sensor", icon: "water", tone: "amber" },
            { label: "Crop health", value: "No diagnosis", note: "No validated model result", icon: "scan", tone: "rose" },
            { label: "Yield outlook", value: "Unavailable", note: "No validated model", icon: "chart", tone: "violet" },
            { label: "Irrigation status", value: latestIrrigation ? String(latestIrrigation.result.label || latestIrrigation.result.status || "Advisory saved") : "No advisory", note: latestIrrigation ? `Saved for ${activeFarm?.name || "selected farm"}` : "No sensor connected", icon: "water", tone: "cyan" },
          ].map((metric) => { const toneClass: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", violet: "bg-violet-50 text-violet-700", cyan: "bg-cyan-50 text-cyan-700" }; return <div key={metric.label} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,.025)]"><div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">{metric.label}</span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClass[metric.tone]}`}><Icon name={metric.icon} className="h-[17px] w-[17px]"/></span></div><div className="mt-3 truncate text-lg font-bold text-slate-900 sm:text-xl">{metric.value}</div><div className="mt-1 truncate text-[10px] text-slate-400 sm:text-[11px]">{metric.note}</div></div>; })}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
          <DashboardCard title="Weather intelligence" action={<button type="button" onClick={() => navigate("/weather")} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Full forecast <span aria-hidden="true">→</span></button>}><WeatherWidget/></DashboardCard>
          <DashboardCard title="Farm portfolio" action={<button type="button" onClick={() => navigate("/farm-tools")} className="text-xs font-semibold text-emerald-700">Manage farms →</button>}>
            {farms.length ? <div className="space-y-4">{farms.map((farm) => <button type="button" key={farm.id} onClick={() => setActiveFarmId(String(farm.id))} className={`w-full rounded-xl p-3 text-left transition ${String(farm.id) === String(activeFarm?.id) ? "bg-emerald-50" : "hover:bg-slate-50"}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{farm.name}</span><span className="shrink-0 text-xs font-semibold text-slate-600">{farm.acres} acres</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (Number(farm.acres) / landMaximum) * 100)}%` }}/></div><div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-500"><span className="truncate">{farm.district}, {farm.state}</span><span className="shrink-0">{farm.currentCrop || "Crop not recorded"}</span></div></button>)}</div> : farmDataAvailable === false ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Farm portfolio is unavailable until the backend connection is restored.</p> : <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-semibold text-slate-700">No farms saved yet</p><p className="mt-1 text-xs text-slate-500">Add a farm to connect crop and advisory data.</p><button type="button" onClick={() => navigate("/farm-tools")} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Add your first farm</button></div>}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><div><p className="text-[11px] text-slate-500">Total area in account</p><p className="mt-1 font-semibold text-slate-900">{farmDataAvailable === false ? "—" : `${farms.reduce((sum, farm) => sum + (Number(farm.acres) || 0), 0).toLocaleString()} acres`}</p></div><div><p className="text-[11px] text-slate-500">Saved crops</p><p className="mt-1 font-semibold text-slate-900">{farmDataAvailable === false ? "—" : activeCrops}</p></div></div>
          </DashboardCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <DashboardCard title="Farm activity" action={<button type="button" onClick={() => navigate("/farm-tools")} className="text-xs font-semibold text-emerald-700">View records →</button>}>
            {loading ? <p className="text-sm text-slate-500">Loading farm activity…</p> : farmDataAvailable === false ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Farm activity cannot be matched until farm data loads.</p> : latestRecords.length ? <div className="divide-y divide-slate-100">{latestRecords.map((record) => <div key={record.id} className="flex items-center gap-3 py-3 first:pt-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon name={record.kind === "irrigation" ? "water" : record.kind.includes("yield") ? "chart" : "leaf"} className="h-4 w-4"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold capitalize text-slate-800">{record.kind.replaceAll("-", " ")}</p><p className="truncate text-xs text-slate-500">{record.crop || activeFarm?.currentCrop || activeFarm?.name || "Farm record"}</p></div><time className="shrink-0 text-[11px] text-slate-400">{formatDate(record.createdAt)}</time></div>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{activeFarm ? `No saved activity for ${activeFarm.name} yet. Farm tool results are stored here.` : "Add or select a farm to see its saved activity."}</div>}
            {activeFarm && !latestIrrigation && <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900"><Icon name="water" className="mt-0.5 h-4 w-4 shrink-0"/><span>No irrigation advisory is saved for this farm. <button type="button" onClick={() => navigate("/farm-tools?module=irrigation")} className="font-semibold underline">Create one</button> with forecast values.</span></div>}
          </DashboardCard>
          <DashboardCard title="Market & public resources">
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => navigate("/marketplace")} className="rounded-xl bg-slate-50 p-4 text-left hover:bg-emerald-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Icon name="store"/></span><p className="mt-3 text-xl font-bold text-slate-900">{listingDataAvailable ? listings.length : "—"}</p><p className="text-xs text-slate-500">Marketplace listings</p></button><button type="button" onClick={() => navigate("/farm-tools?module=schemes")} className="rounded-xl bg-slate-50 p-4 text-left hover:bg-emerald-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Icon name="bank"/></span><p className="mt-3 text-xl font-bold text-slate-900">{schemes.length || "—"}</p><p className="text-xs text-slate-500">Official scheme sources</p></button></div>
            <div className="mt-4 rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold text-slate-700">Latest irrigation status</p><p className="mt-1 text-xs text-slate-500">{latestIrrigation ? String(latestIrrigation.result.label || latestIrrigation.result.status || "Advisory saved") : "No saved advisory for this farm"}</p></div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">Market price integration is checked in Market Prices; provider values appear there with their source and availability.</p>
          </DashboardCard>
        </div>

        <DashboardCard title="Your farming tools" action={<button type="button" onClick={() => navigate("/farm-tools")} className="text-xs font-semibold text-emerald-700">All farm tools →</button>}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            ["Crop recommendation", "Match crops to your soil and season.", "sprout", "/crop-recommendation", "Run advisory"],
            ["Disease detection", "Check model status and submit a leaf image.", "scan", "/disease-detection", "Open detection"],
            ["Irrigation planning", "Use forecast context to plan field watering.", "water", "/farm-tools?module=irrigation", "Plan irrigation"],
            ["Fertilizer advisor", "Get crop and observation based guidance.", "leaf", "/farm-tools?module=nutrient-advice", "Open advisor"],
            ["Yield outlook", "Review validated model availability and records.", "chart", "/farm-tools?module=yield-estimate", "Check status"],
            ["Market prices", "View sourced market price availability.", "price", "/market-prices", "View markets"],
            ["Marketplace", "Browse listings and contact farmers.", "store", "/marketplace", "Open marketplace"],
            ["AI assistant", "Ask questions with your saved farm context.", "bot", "/ai-assistant", "Start a chat"],
            ["Weather intelligence", "Use the current forecast for field planning.", "weather", "/weather", "View forecast"],
            ["Government schemes", "Browse official scheme portals and sources.", "bank", "/farm-tools?module=schemes", "Find schemes"],
          ].map(([title, description, icon, path, action]) => <button type="button" key={title} onClick={() => navigate(path)} className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-white"><Icon name={icon}/></span><p className="mt-3 text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{description}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">{action}<Icon name="chevron" className="h-3 w-3"/></span></button>)}</div>
        </DashboardCard>
      </main>
    </div>
    <button type="button" aria-label="Open AI farming assistant" title="Ask the AI farming assistant" onClick={() => navigate("/ai-assistant")} className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 transition hover:scale-105 hover:bg-emerald-800"><Icon name="bot" className="h-6 w-6"/></button>
  </div>;
}
