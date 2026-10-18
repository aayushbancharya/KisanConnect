import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const cropDatabase = [
  {
    name: "Tomato",
    soils: ["Red Soil", "Loamy Soil", "Clay Soil"],
    water: ["Medium", "High"],
    seasons: ["Kharif (June–Oct)", "Rabi (Oct–Mar)"],
    landTypes: ["Wet Land", "Garden Land"],
    goals: ["Maximum Profit", "Short Duration"],
  },
  {
    name: "Onion",
    soils: ["Red Soil", "Loamy Soil", "Alluvial Soil"],
    water: ["Medium", "High"],
    seasons: ["Rabi (Oct–Mar)", "Kharif (June–Oct)"],
    landTypes: ["Dry Land", "Wet Land"],
    goals: ["Maximum Profit", "Low Investment"],
  },
  {
    name: "Groundnut",
    soils: ["Red Soil", "Sandy Soil", "Loamy Soil"],
    water: ["Low", "Medium"],
    seasons: ["Kharif (June–Oct)", "Zaid (Mar–Jun)"],
    landTypes: ["Dry Land"],
    goals: ["Low Investment", "Less Water Usage"],
  },
  {
    name: "Cotton",
    soils: ["Black Soil", "Alluvial Soil"],
    water: ["Medium", "High"],
    seasons: ["Kharif (June–Oct)"],
    landTypes: ["Wet Land", "Dry Land"],
    goals: ["Maximum Profit"],
  },
  {
    name: "Rice",
    soils: ["Clay Soil", "Alluvial Soil", "Loamy Soil"],
    water: ["High"],
    seasons: ["Kharif (June–Oct)"],
    landTypes: ["Wet Land"],
    goals: ["Low Investment"],
  },
  {
    name: "Wheat",
    soils: ["Loamy Soil", "Clay Soil", "Alluvial Soil"],
    water: ["Medium"],
    seasons: ["Rabi (Oct–Mar)"],
    landTypes: ["Dry Land", "Wet Land"],
    goals: ["Low Investment", "Maximum Profit"],
  },
  {
    name: "Maize",
    soils: ["Loamy Soil", "Sandy Soil", "Red Soil"],
    water: ["Low", "Medium"],
    seasons: ["Kharif (June–Oct)", "Rabi (Oct–Mar)"],
    landTypes: ["Dry Land", "Wet Land"],
    goals: ["Short Duration", "Low Investment"],
  },
  {
    name: "Sugarcane",
    soils: ["Alluvial Soil", "Loamy Soil", "Clay Soil"],
    water: ["High"],
    seasons: ["Kharif (June–Oct)", "Zaid (Mar–Jun)"],
    landTypes: ["Wet Land"],
    goals: ["Maximum Profit"],
  },
  {
    name: "Soybean",
    soils: ["Black Soil", "Loamy Soil", "Alluvial Soil"],
    water: ["Medium"],
    seasons: ["Kharif (June–Oct)"],
    landTypes: ["Dry Land", "Wet Land"],
    goals: ["Low Investment", "Organic Friendly"],
  },
  {
    name: "Mustard",
    soils: ["Loamy Soil", "Sandy Soil", "Alluvial Soil"],
    water: ["Low", "Medium"],
    seasons: ["Rabi (Oct–Mar)"],
    landTypes: ["Dry Land"],
    goals: ["Less Water Usage", "Low Investment"],
  },
  {
    name: "Chilli",
    soils: ["Red Soil", "Loamy Soil", "Black Soil"],
    water: ["Medium"],
    seasons: ["Kharif (June–Oct)", "Rabi (Oct–Mar)"],
    landTypes: ["Dry Land", "Garden Land"],
    goals: ["Maximum Profit", "Short Duration"],
  },
  {
    name: "Turmeric",
    soils: ["Red Soil", "Loamy Soil", "Alluvial Soil"],
    water: ["Medium", "High"],
    seasons: ["Kharif (June–Oct)"],
    landTypes: ["Wet Land", "Garden Land"],
    goals: ["Maximum Profit", "Organic Friendly"],
  },
  {
    name: "Banana",
    soils: ["Alluvial Soil", "Loamy Soil", "Clay Soil"],
    water: ["High"],
    seasons: ["Kharif (June–Oct)", "Zaid (Mar–Jun)"],
    landTypes: ["Wet Land", "Garden Land"],
    goals: ["Maximum Profit"],
  },
  {
    name: "Watermelon",
    soils: ["Sandy Soil", "Loamy Soil", "Red Soil"],
    water: ["Medium"],
    seasons: ["Zaid (Mar–Jun)"],
    landTypes: ["Dry Land", "Wet Land"],
    goals: ["Short Duration", "Low Investment"],
  },
  {
    name: "Jowar",
    soils: ["Black Soil", "Red Soil", "Loamy Soil"],
    water: ["Low"],
    seasons: ["Kharif (June–Oct)", "Rabi (Oct–Mar)"],
    landTypes: ["Dry Land"],
    goals: ["Less Water Usage", "Low Investment"],
  },
  {
    name: "Bajra",
    soils: ["Sandy Soil", "Red Soil", "Loamy Soil"],
    water: ["Low"],
    seasons: ["Kharif (June–Oct)", "Zaid (Mar–Jun)"],
    landTypes: ["Dry Land"],
    goals: ["Less Water Usage", "Short Duration"],
  },
];

function getMatchScore(crop: typeof cropDatabase[0], form: Record<string, string>): number {
  let score = 0;
  if (crop.soils.includes(form.soilType)) score += 30;
  if (crop.water.includes(form.waterAvailability)) score += 25;
  if (crop.seasons.includes(form.season)) score += 25;
  if (crop.landTypes.includes(form.landType)) score += 15;
  if (crop.goals.includes(form.goal)) score += 5;
  return score;
}

export default function CropResults() {
  const { state: form } = useLocation();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Array<{id:number; name:string; district:string}>>([]);
  const [farmId, setFarmId] = useState(() => localStorage.getItem("activeFarmId") || "");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const task = window.setTimeout(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/farms`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        if (!response.ok) return;
        const data = await response.json(); setFarms(data.farms || []);
        const saved = localStorage.getItem("activeFarmId");
        if (data.farms?.length) setFarmId(saved && data.farms.some((farm: { id: number }) => String(farm.id) === saved) ? saved : String(data.farms[0].id));
      } catch { /* recommendations remain usable when the farm service is offline */ }
    }, 0);
    return () => window.clearTimeout(task);
  }, []);
  useEffect(() => {
    const syncFarm = (event: Event) => setFarmId((event as CustomEvent<{ farmId: string }>).detail.farmId);
    window.addEventListener("farm-context-change", syncFarm);
    return () => window.removeEventListener("farm-context-change", syncFarm);
  }, []);
  useEffect(() => { if (farmId) localStorage.setItem("activeFarmId", farmId); }, [farmId]);
  const saveCrop = async (crop: string) => {
    if (!farmId) { setNotice("Create a farm in Farm Tools before saving a crop selection."); return; }
    setSaving(crop); setNotice("");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/farms/${farmId}/crop-selection`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, body: JSON.stringify({ crop }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this crop.");
      setNotice(`${crop} saved as the current crop for ${data.farm.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this crop."); }
    finally { setSaving(""); }
  };

  const scored = cropDatabase
    .map((crop) => ({ ...crop, score: getMatchScore(crop, form || {}) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const farmRecommendations: Array<{ crop: string; reason: string }> = form?.backendAdvisory?.recommendations || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">

      

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Your Crop Recommendations
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {form ? `Based on ${form.district}, ${form.state} • ${form.landSize} acres ${form.landType} • ${form.season}` : "Start the crop planner to get recommendations matched to your farm."}
          </p>
          <p className="mt-2 text-xs text-gray-500">The suitability guide is rules based, not a validated ML model. It does not predict yield or profitability.</p>
          {form?.advisoryUnavailable && <p role="status" className="mx-auto mt-3 max-w-xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">The farm advisory service did not respond. These results use the local rules-based crop guide only.</p>}
          {form?.lastCrop && (
            <p className="text-xs text-gray-400 mt-1">
              Previous crop: {form.lastCrop}
            </p>
          )}
          {!!farms.length && <label className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">Save recommendation for<select className="rounded-lg border border-gray-300 bg-white px-3 py-2" value={farmId} onChange={(e) => { setFarmId(e.target.value); localStorage.setItem("activeFarmId", e.target.value); window.dispatchEvent(new CustomEvent("farm-context-change", { detail: { farmId: e.target.value } })); }}>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.district}</option>)}</select></label>}
          {notice && <p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
        </div>

        {farmRecommendations.length > 0 && <section className="mb-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><div className="mb-3"><h3 className="font-semibold text-slate-900">Farm workspace advisory</h3><p className="mt-1 text-xs text-slate-500">Saved by the backend using your soil, water, season and farm selection. This is rules-based guidance, not an ML prediction.</p></div><div className="grid gap-3 sm:grid-cols-3">{farmRecommendations.map((recommendation) => <article key={recommendation.crop} className="rounded-xl bg-emerald-50/70 p-4"><p className="text-sm font-bold text-emerald-950">{recommendation.crop}</p><p className="mt-1 min-h-10 text-xs leading-5 text-emerald-900">{recommendation.reason}</p>{farmId && <button type="button" disabled={!!saving} onClick={() => void saveCrop(recommendation.crop)} className="mt-3 text-xs font-semibold text-emerald-800 underline disabled:opacity-50">{saving === recommendation.crop ? "Saving…" : "Select and save"}</button>}</article>)}</div></section>}

        {/* Crop Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {scored.map((crop, index) => (
            <div key={crop.name}
              className={`bg-white rounded-2xl shadow-sm p-5 border transition hover:shadow-md
                ${index === 0 ? "border-green-300 ring-2 ring-green-100" : "border-gray-100"}`}>

              {/* Best Match Badge */}
              {index === 0 && (
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full mb-2 inline-block">
                  ⭐ Best Match
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-9M12 12C7 12 5 9 5 5c4 0 7 2 7 7ZM12 15c0-4 2-7 7-7 0 4-2 7-7 7Z"/></svg></span>
                  <div>
                    <h3 className="font-bold text-gray-800">{crop.name}</h3>
                    <p className="text-xs text-gray-500">Rules-based guide match</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-green-600 font-bold text-lg">{crop.score}%</span>
                  <p className="text-xs text-gray-400">Rules match</p>
                </div>
              </div>

              {/* Match Bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${crop.score}%` }}
                />
              </div>

              <p className="text-sm text-gray-500 mb-3">Based on selected soil, water and season criteria. Confirm local variety, sowing window and input needs before planting.</p>

              <div className="flex items-center justify-between">
<span className="text-xs text-slate-500">Profitability not assessed</span>
                <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => void saveCrop(crop.name)} disabled={!!saving} className="text-xs text-green-700 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-50 disabled:opacity-50">
                  {saving === crop.name ? "Saving…" : "Select & save"}
                </button>
                <button
                  onClick={() => navigate("/disease-detection")}
                  className="text-xs text-green-600 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-50">
                  Check Disease →
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-700 mb-4">What would you like to do next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => navigate("/disease-detection")}
              className="bg-red-50 hover:bg-red-100 rounded-xl p-4 text-center transition">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3"/><path d="M8 13c2-5 6-5 8 0-2 4-6 4-8 0Z"/></svg></div>
              <p className="text-sm font-medium text-gray-700">Check for Diseases</p>
            </button>
            <button onClick={() => navigate("/market-prices")}
              className="bg-blue-50 hover:bg-blue-100 rounded-xl p-4 text-center transition">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-6"/></svg></div>
              <p className="text-sm font-medium text-gray-700">Check Market Prices</p>
            </button>
            <button onClick={() => navigate("/crop-recommendation")}
              className="bg-green-50 hover:bg-green-100 rounded-xl p-4 text-center transition">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a7 7 0 0 1 12-2l3 5M4 12l3 5a7 7 0 0 0 12-2"/></svg></div>
              <p className="text-sm font-medium text-gray-700">Try Again</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
