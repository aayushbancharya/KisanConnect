import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_BACKEND_URL || "https://backend-smart-crop-360.onrender.com";

const crops = [
  "Rice","Wheat","Maize","Jowar","Bajra","Ragi","Barley","Oats",
  "Chickpea","Pigeon Pea (Tur)","Black Gram (Urad)","Green Gram (Moong)",
  "Lentil (Masoor)","Kidney Bean (Rajma)","Peas","Horse Gram",
  "Groundnut","Mustard","Sunflower","Soybean","Sesame","Linseed",
  "Castor","Safflower","Coconut",
  "Sugarcane","Cotton","Jute","Tobacco","Rubber","Tea","Coffee",
  "Tomato","Onion","Potato","Chilli","Brinjal","Cabbage","Cauliflower",
  "Okra (Bhindi)","Cucumber","Pumpkin","Bitter Gourd","Bottle Gourd",
  "Spinach","Carrot","Radish","Beetroot","Garlic","Ginger",
  "Banana","Mango","Papaya","Watermelon","Grapes","Orange","Lemon",
  "Pomegranate","Guava","Apple","Pineapple","Jackfruit","Sapota",
  "Turmeric","Coriander","Cumin","Fenugreek","Cardamom","Pepper",
  "Marigold","Rose",
];

const affectedParts = [
  { label: "Leaf", desc: "Spots, yellowing or holes on leaves" },
  { label: "Stem", desc: "Black, brown or rotting stem" },
  { label: "Fruit", desc: "Spots, rot or discoloration on fruit" },
  { label: "Root", desc: "Wilting, root rot or weak plant" },
  { label: "Whole Plant", desc: "Entire plant looks sick or dying" },
];

const cropAge = [
  { label: "Just planted", desc: "Less than 2 weeks old" },
  { label: "Young plant", desc: "2 to 6 weeks old" },
  { label: "Grown plant", desc: "Has flowers or small fruits" },
  { label: "Ready to harvest", desc: "Fruits/grains are big and almost ready" },
];

const spreadLevel = [
  { label: "Only a few plants", color: "border-yellow-300 bg-yellow-50" },
  { label: "About half the field", color: "border-orange-300 bg-orange-50" },
  { label: "Most of the field", color: "border-red-300 bg-red-50" },
];

type Treatment = { name: string; dosagePerLiter: string; dosagePerAcre: string; frequency: string; method: string };
type DiseaseResult = { name: string; confidence: number; severity: string; cause: string; symptoms: string[]; chemical: Treatment; organic: Treatment };

export default function DiseaseDetection() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState("");
  const [search, setSearch] = useState("");
  const [affected, setAffected] = useState("");
  const [age, setAge] = useState("");
  const [spread, setSpread] = useState("");
  const [treatment, setTreatment] = useState<"chemical" | "organic">("chemical");
  const [landSize, setLandSize] = useState("1");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        setAnalysisError("Choose an image smaller than 5 MB.");
        e.target.value = "";
        return;
      }
      setAnalysisError("");
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyze = async () => {
    if (!image) {
      setAnalysisError("Upload a crop image before requesting analysis.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError("");
    setStep(1);
    try {
      const response = await fetch(`${API}/api/farm-tools/disease-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ image, crop, affectedPart: affected, cropAge: age, spread }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Disease analysis is unavailable.");
      setResult(data as DiseaseResult);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not connect to the analysis service.");
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "Severe") return "text-red-600 bg-red-50";
    if (severity === "Moderate") return "text-orange-600 bg-orange-50";
    return "text-yellow-600 bg-yellow-50";
  };

  const filteredCrops = crops.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">

        

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Step 0 - Upload & Questions */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Disease Detection</h2>
              <p className="text-sm text-gray-500 mt-1">Take a clear photo of the sick plant part</p>
            </div>

            {/* Image Upload */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">📸 Upload Plant Photo</h3>
              <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition">
                {image ? (
                  <img src={image} className="max-h-48 mx-auto rounded-lg object-cover" alt="uploaded" />
                ) : (
                  <div>
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3"/></svg></div>
                    <p className="text-sm text-gray-500">Click here to take or upload a photo</p>
                    <p className="text-xs text-gray-400 mt-1">💡 Tip: Take photo in sunlight, show the sick part clearly</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>

            {/* Crop Selection */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">Which crop is affected?</h3>

              {/* Search */}
              <input
                type="text"
                placeholder="Search crop name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
              />

              {/* Selected crop display */}
              {crop && (
                <div className="mb-2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg inline-block">
                  Selected: {crop}
                </div>
              )}

              {/* Scrollable Grid */}
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredCrops.map((c) => (
                  <button key={c} onClick={() => setCrop(c)}
                    className={`py-2 px-3 rounded-lg text-sm border transition ${
                      crop === c
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-200 text-gray-600 hover:border-green-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Affected Part */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">Which part of the plant looks affected?</h3>
              <div className="space-y-2">
                {affectedParts.map((p) => (
                  <button key={p.label} onClick={() => setAffected(p.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                      affected === p.label
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-200 hover:border-green-400"}`}>
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"/>
                    <div className="text-left">
                      <p className="font-medium text-sm">{p.label}</p>
                      <p className={`text-xs ${affected === p.label ? "text-green-100" : "text-gray-400"}`}>{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Age */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">How old is your crop?</h3>
              <div className="space-y-2">
                {cropAge.map((a) => (
                  <button key={a.label} onClick={() => setAge(a.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                      age === a.label
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-200 hover:border-green-400"}`}>
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"/>
                    <div className="text-left">
                      <p className="font-medium text-sm">{a.label}</p>
                      <p className={`text-xs ${age === a.label ? "text-green-100" : "text-gray-400"}`}>{a.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spread Level */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">How many plants are affected?</h3>
              <div className="space-y-2">
                {spreadLevel.map((s) => (
                  <button key={s.label} onClick={() => setSpread(s.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                      spread === s.label
                        ? "bg-green-600 text-white border-green-600"
                        : `${s.color} border-transparent hover:border-green-300`}`}>
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"/>
                    <p className="font-medium text-sm">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Land Size */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-3">📐 How big is your farm? (for dosage calculation)</h3>
              <div className="flex items-center gap-3">
                <input type="number" value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <span className="text-sm text-gray-500">Acres</span>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyze}
              disabled={!crop || !affected || !age || !spread || !image || analyzing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition">
              Analyze My Crop
            </button>

            {(!crop || !affected || !age || !spread) && (
              <p className="text-center text-xs text-gray-400">
                Please answer all questions above to continue
              </p>
            )}
            {analysisError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{analysisError}</p>}
          </div>
        )}

        {/* Step 1 - Analyzing */}
        {step === 1 && analyzing && (
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3"/><path d="M8 13c2-5 6-5 8 0-2 4-6 4-8 0Z"/></svg></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Checking disease analysis availability...</h3>
              <p className="text-sm text-gray-500 mb-6">This project has no trained image model configured, so it cannot classify this photo or generate treatment advice.</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-green-500 h-2 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-xs text-gray-400">No diagnosis is shown unless a genuine inference provider is available.</p>
            </div>
          </div>
        )}

        {/* Step 2 - Results */}
        {step === 2 && !result && analysisError && (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">No diagnosis was generated</h2>
            <p className="mt-2 text-sm text-amber-900">{analysisError}</p>
            <p className="mt-2 text-xs text-amber-800">This project has no configured disease image model. Your image was not classified, and no disease or treatment is being guessed.</p>
            <button onClick={() => { setStep(0); setAnalysisError(""); }} className="mt-4 rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white">Back to image and crop details</button>
          </div>
        )}
        {step === 2 && result && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
              <p className="text-sm text-gray-500">Here's what we found about your {crop}</p>
            </div>

            {/* Disease Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{result.name}</h3>
                  <p className="text-sm text-gray-500">{crop} • {affected} affected</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-bold text-xl">{result.confidence}%</p>
                  <p className="text-xs text-gray-400">Confidence</p>
                </div>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-medium ${getSeverityColor(result.severity)}`}>
                Severity: {result.severity}
              </span>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Cause</p>
                <p className="text-sm text-gray-500">{result.cause}</p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Symptoms</p>
                <ul className="space-y-1">
                  {result.symptoms.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Treatment */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Recommended Treatment</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setTreatment("chemical")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      treatment === "chemical" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}>
                    Chemical
                  </button>
                  <button onClick={() => setTreatment("organic")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      treatment === "organic" ? "bg-white shadow text-green-600" : "text-gray-500"}`}>
                    Organic
                  </button>
                </div>
              </div>

              {(() => {
                const t = result[treatment];
                const acres = parseFloat(landSize) || 1;
                return (
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="font-semibold text-blue-800 text-sm mb-1">💊 {t.name}</p>
                      <p className="text-xs text-blue-600">{t.method}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Dosage per Liter</p>
                        <p className="text-sm font-semibold text-gray-700">{t.dosagePerLiter}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Spray Frequency</p>
                        <p className="text-sm font-semibold text-gray-700">{t.frequency}</p>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">📐 Total for your {acres} acre farm</p>
                      <p className="text-sm font-bold text-green-700">{t.dosagePerAcre}</p>
                      {acres !== 1 && (
                        <p className="text-xs text-green-600 mt-1">
                          × {acres} acres = apply {acres}x the quantity above
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setStep(0);
                  setImage(null);
                  setCrop("");
                  setSearch("");
                  setAffected("");
                  setAge("");
                  setSpread("");
                  setResult(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium transition">
                🔄 Check Another Crop
              </button>
              <button onClick={() => navigate("/market-prices")}
                className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium transition">
                Check Market Prices
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
