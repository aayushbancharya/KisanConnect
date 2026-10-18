import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
type Farm = { id: number; name: string; state: string; district: string; acres: number; soilType?: string; waterSource?: string; currentCrop?: string };
type RecordItem = { id: number; kind: string; crop?: string; createdAt: string; result: Record<string, unknown> };
type Scheme = { name: string; description: string; url: string };
const availableModules = ["crop-advice", "irrigation", "nutrient-advice", "yield-estimate", "disease-analysis", "schemes"] as const;
const fields = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100";
const button = "rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50";

async function request(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { ...init, headers: {
      "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...(init.headers || {}),
    } });
  } catch {
    throw new Error(`Could not reach the farm service at ${API}. Check that the backend is running and try again.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function GuidanceResult({ result }: { result: Record<string, unknown> }) {
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations as Array<Record<string, unknown>> : [];
  const excluded = new Set(["label", "status", "recordId", "recommendations", "inputs"]);
  const details = Object.entries(result).filter(([key, value]) => !excluded.has(key) && value != null && value !== "");
  const inputDetails = result.inputs && typeof result.inputs === "object" ? Object.entries(result.inputs as Record<string, unknown>).filter(([, value]) => value != null && value !== "") : [];
  const title = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const valueText = (value: unknown) => Array.isArray(value) ? value.join(", ") : String(value);

  return <section aria-live="polite" className="mt-5 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-bold uppercase tracking-wide text-green-800">Farm guidance</p><h3 className="mt-1 text-base font-semibold text-slate-900">{String(result.label || result.status || "Your result")}</h3></div>
      {result.recordId != null && <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-green-800">Saved to farm records</span>}
    </div>
    {recommendations.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{recommendations.map((item, index) => <article key={`${String(item.crop)}-${index}`} className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800">{index + 1}</span><h4 className="font-semibold text-slate-900">{String(item.crop || "Option")}</h4></div>
      {Boolean(item.reason) && <p className="mt-3 text-sm leading-5 text-slate-600">{String(item.reason)}</p>}
      {Boolean(item.season) && <p className="mt-3 text-xs font-medium text-green-800">{String(item.season)} season</p>}
    </article>)}</div>}
    {details.length > 0 && <dl className={`mt-4 grid gap-3 ${recommendations.length ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>{details.map(([key, value]) => <div key={key} className="rounded-xl bg-white/80 p-3"><dt className="text-xs font-medium text-slate-500">{title(key)}</dt><dd className="mt-1 text-sm leading-5 text-slate-800">{valueText(value)}</dd></div>)}</dl>}
    {inputDetails.length > 0 && <div className="mt-4 border-t border-green-100 pt-3"><p className="text-xs font-semibold text-slate-500">Based on your inputs</p><dl className="mt-2 flex flex-wrap gap-2">{inputDetails.map(([key, value]) => <div key={key} className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-600"><dt className="inline font-medium">{title(key)}: </dt><dd className="inline">{valueText(value)}</dd></div>)}</dl></div>}
  </section>;
}

export default function FarmTools() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemeFilter, setSchemeFilter] = useState("");
  const [selectedFarm, setSelectedFarm] = useState(() => localStorage.getItem("activeFarmId") || "");
  const [module, setModule] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("module");
    return availableModules.includes(requested as typeof availableModules[number]) ? requested as string : "crop-advice";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [farmForm, setFarmForm] = useState({ name: "", state: "", district: "", acres: "", soilType: "", waterSource: "", currentCrop: "" });
  const [form, setForm] = useState({ crop: "", soilType: "", waterAvailability: "medium", season: "Kharif", forecastRainMm: "", temperatureC: "", observation: "", acres: "" });

  const load = useCallback(async () => {
    try {
      const [farmData, history, schemeData] = await Promise.all([
        request("/api/farms"), request("/api/farm-records"), request("/api/schemes"),
      ]);
      setFarms(farmData.farms); setRecords(history.records); setSchemes(schemeData.schemes);
      setSelectedFarm((current) => current && farmData.farms.some((farm: Farm) => String(farm.id) === current) ? current : String(farmData.farms[0]?.id || ""));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your farm workspace."); }
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    const syncFarm = (event: Event) => setSelectedFarm((event as CustomEvent<{ farmId: string }>).detail.farmId);
    window.addEventListener("farm-context-change", syncFarm);
    return () => window.removeEventListener("farm-context-change", syncFarm);
  }, []);
  const farm = farms.find((item) => String(item.id) === selectedFarm);
  useEffect(() => { if (selectedFarm) localStorage.setItem("activeFarmId", selectedFarm); }, [selectedFarm]);
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const addFarm = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request("/api/farms", { method: "POST", body: JSON.stringify({ ...farmForm, acres: Number(farmForm.acres) }) });
      setFarms((current) => [data.farm, ...current]); setSelectedFarm(String(data.farm.id)); localStorage.setItem("activeFarmId", String(data.farm.id));
      setFarmForm({ name: "", state: "", district: "", acres: "", soilType: "", waterSource: "", currentCrop: "" });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save farm."); }
    finally { setBusy(false); }
  };

  const runTool = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const data = await request(`/api/farm-tools/${module}`, { method: "POST", body: JSON.stringify({ ...form, farmId: selectedFarm ? Number(selectedFarm) : undefined, acres: Number(form.acres || farm?.acres || 0) }) });
      setResult(data); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "The request could not be completed."); }
    finally { setBusy(false); }
  };

  const modules = [
    ["crop-advice", "Crop planning", "Rule based crop and season guidance"],
    ["irrigation", "Irrigation", "Weather informed checks; no sensor data"],
    ["nutrient-advice", "Input advisor", "General nutrient and safe use guidance"],
    ["yield-estimate", "Yield outlook", "Model availability and data status"],
    ["disease-analysis", "Disease detection", "Requires a configured vision model"],
    ["schemes", "Government schemes", "Official portals and eligibility links"],
  ];

  return <div className="min-h-screen bg-[#f7faf6] pb-24 md:pb-8">
    <main className="mx-auto max-w-6xl px-4 py-7 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-green-700">Farm workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Your farm, one place</h1><p className="mt-2 text-sm text-slate-600">Save farm details once, then use them across advisory tools.</p></div>
        <label className="text-sm font-medium text-slate-600">Active farm<select className={`${fields} mt-1 min-w-56`} value={selectedFarm} onChange={(e) => { setSelectedFarm(e.target.value); localStorage.setItem("activeFarmId", e.target.value); window.dispatchEvent(new CustomEvent("farm-context-change", { detail: { farmId: e.target.value } })); }}><option value="">No farm selected</option>{farms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.district}</option>)}</select></label>
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="text-lg font-bold text-slate-900">My farms</h2><p className="text-sm text-slate-500">Stored privately with your account.</p></div>
          {farm && <div className="mb-4 rounded-xl bg-green-50 p-4"><div className="font-semibold text-green-950">{farm.name}</div><div className="mt-1 text-sm text-green-800">{farm.acres} acres · {farm.district}, {farm.state}</div><div className="mt-1 text-xs text-green-700">{farm.soilType || "Soil not recorded"} · {farm.currentCrop || "No current crop"}</div></div>}
          <form onSubmit={addFarm} className="grid gap-3 sm:grid-cols-2">
            <input className={fields} placeholder="Farm name" aria-label="Farm name" value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} required />
            <input className={fields} placeholder="Acres" aria-label="Acres" type="number" min="0.1" step="0.1" value={farmForm.acres} onChange={(e) => setFarmForm({ ...farmForm, acres: e.target.value })} required />
            <input className={fields} placeholder="State" aria-label="State" value={farmForm.state} onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })} required />
            <input className={fields} placeholder="District" aria-label="District" value={farmForm.district} onChange={(e) => setFarmForm({ ...farmForm, district: e.target.value })} required />
            <select className={fields} aria-label="Soil type" value={farmForm.soilType} onChange={(e) => setFarmForm({ ...farmForm, soilType: e.target.value })}><option value="">Soil type</option>{["Loamy", "Clay", "Sandy", "Red", "Black", "Alluvial"].map((soil) => <option key={soil}>{soil}</option>)}</select>
            <input className={fields} placeholder="Water source" aria-label="Water source" value={farmForm.waterSource} onChange={(e) => setFarmForm({ ...farmForm, waterSource: e.target.value })} />
            <input className={`${fields} sm:col-span-2`} placeholder="Current crop (optional)" aria-label="Current crop" value={farmForm.currentCrop} onChange={(e) => setFarmForm({ ...farmForm, currentCrop: e.target.value })} />
            <button className={`${button} sm:col-span-2`} disabled={busy}>{busy ? "Saving…" : "Save farm"}</button>
          </form>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Farm tools</h2><p className="mb-4 text-sm text-slate-500">Each response identifies its source and limitations.</p>
          <div className="mb-4 flex flex-wrap gap-2">{modules.map(([id, title]) => <button key={id} onClick={() => { setModule(id); setResult(null); setError(""); }} className={`rounded-full px-3 py-2 text-xs font-semibold ${module === id ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-green-50"}`}>{title}</button>)}</div>
          {module !== "schemes" && <form onSubmit={runTool} className="space-y-3">
            <input className={fields} aria-label="Crop" placeholder="Crop, if known" value={form.crop || farm?.currentCrop || ""} onChange={(e) => change("crop", e.target.value)} />
            {module === "crop-advice" && <><input className={fields} placeholder="Soil type" value={form.soilType || farm?.soilType || ""} onChange={(e) => change("soilType", e.target.value)} /><div className="grid grid-cols-2 gap-3"><select className={fields} value={form.waterAvailability} onChange={(e) => change("waterAvailability", e.target.value)}><option value="low">Low water</option><option value="medium">Medium water</option><option value="high">High water</option></select><select className={fields} value={form.season} onChange={(e) => change("season", e.target.value)}><option>Kharif</option><option>Rabi</option><option>Zaid</option></select></div></>}
            {module === "irrigation" && <><p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">Enter values from a forecast provider. These readings are manually entered; this tool does not fetch weather or read sensors.</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input className={fields} type="number" min="0" max="500" step="0.1" placeholder="Forecast rain (mm)" aria-label="Forecast rain in millimeters" required value={form.forecastRainMm} onChange={(e) => change("forecastRainMm", e.target.value)} /><input className={fields} type="number" min="-30" max="60" step="0.1" placeholder="Temperature °C" aria-label="Temperature in Celsius" required value={form.temperatureC} onChange={(e) => change("temperatureC", e.target.value)} /></div></>}
            {module === "nutrient-advice" && <textarea className={fields} rows={3} placeholder="Describe crop stage or observed symptoms" value={form.observation} onChange={(e) => change("observation", e.target.value)} />}
            {module === "yield-estimate" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No validated yield model is configured. This tool reports model status and will not invent a yield estimate.</p>}
            {module === "disease-analysis" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Image analysis stays unavailable until a genuine inference model or provider is configured.</p>}
            <button className={button} disabled={busy}>{busy ? "Working…" : module === "disease-analysis" ? "Check model availability" : "Save and get guidance"}</button>
          </form>}
          {result && <GuidanceResult result={result} />}
        </section>
      </div>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Government portals</h2><p className="mb-3 text-xs text-slate-500">Official links only; verify current eligibility and dates with the portal.</p><input className={`${fields} mb-3`} type="search" placeholder="Filter schemes and portals" aria-label="Filter schemes" value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)} /><div className="space-y-2">{schemes.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(schemeFilter.toLowerCase())).map((item) => <a key={item.name} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-slate-50 p-3 hover:bg-green-50"><div className="text-sm font-semibold text-green-800">{item.name} ↗</div><div className="mt-1 text-xs text-slate-600">{item.description}</div></a>)}{!schemes.some((item) => `${item.name} ${item.description}`.toLowerCase().includes(schemeFilter.toLowerCase())) && <p className="text-sm text-slate-500">No portal matches that search.</p>}</div></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Recent farm records</h2><p className="mb-3 text-xs text-slate-500">Saved advisories are linked to your account and farm.</p>{records.length ? <div className="space-y-2">{records.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><div className="text-sm font-semibold text-slate-800">{item.kind.replaceAll("-", " ")}{item.crop ? ` · ${item.crop}` : ""}</div><div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div></div><span className="text-xs text-green-700">Saved</span></div>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No saved records yet. Use a tool to start your farm history.</div>}</div>
      </section>
    </main>
  </div>;
}
