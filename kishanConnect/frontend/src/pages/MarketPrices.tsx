import { useState } from "react";
import { useNavigate } from "react-router-dom";

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar",
  "Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

const allCrops = [
  "Rice","Wheat","Maize","Jowar","Bajra","Ragi","Barley","Oats","Sorghum",
  "Chickpea","Pigeon Pea","Black Gram","Green Gram","Lentil","Kidney Bean",
  "Peas","Horse Gram","Moth Bean","Cowpea","Bengal Gram",
  "Groundnut","Mustard","Sunflower","Soybean","Sesame","Linseed",
  "Castor","Safflower","Coconut","Rapeseed","Niger Seed",
  "Sugarcane","Cotton","Jute","Tobacco","Rubber","Tea","Coffee","Arecanut",
  "Tomato","Onion","Potato","Chilli","Brinjal","Cabbage","Cauliflower",
  "Okra","Cucumber","Pumpkin","Bitter Gourd","Bottle Gourd","Ridge Gourd",
  "Snake Gourd","Ash Gourd","Spinach","Carrot","Radish","Beetroot",
  "Garlic","Ginger","Capsicum","Drumstick","Cluster Beans",
  "French Beans","Knol Khol","Lettuce","Celery","Coriander","Fenugreek Leaves",
  "Amaranthus","Sweet Potato","Colocasia","Yam","Elephant Foot Yam",
  "Curry Leaves","Mint","Spring Onion","Leek","Parsley","Turnip",
  "Banana","Mango","Papaya","Watermelon","Grapes","Orange","Lemon",
  "Pomegranate","Guava","Apple","Pineapple","Jackfruit","Sapota",
  "Mosambi","Custard Apple","Fig","Jamun","Litchi","Mulberry",
  "Passion Fruit","Dragon Fruit","Avocado","Kiwi","Plum","Peach",
  "Pear","Cherry","Strawberry","Gooseberry","Wood Apple",
  "Turmeric","Cumin","Fenugreek","Cardamom","Pepper",
  "Clove","Cinnamon","Nutmeg","Ajwain","Fennel","Star Anise",
  "Bay Leaf","Tamarind","Kokum","Dry Chilli","Dry Ginger",
  "Marigold","Rose","Jasmine","Chrysanthemum","Gerbera","Tuberose",
  "Arhar","Groundnut Pod","Copra","Dry Coconut","Betel Leaves",
  "Bamboo","Lemongrass","Aloe Vera",
];

interface MandiData {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  min_price: string;
  max_price: string;
  modal_price: string;
  arrival_date: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function MarketPrices() {
  const navigate = useNavigate();
  const [crop, setCrop] = useState("Tomato");
  const [cropSearch, setCropSearch] = useState("");
  const [state, setState] = useState("Karnataka");
  const [quantity, setQuantity] = useState("");
  const [results, setResults] = useState<MandiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [dataSource, setDataSource] = useState("");
  const [dataNote, setDataNote] = useState("");

  const filteredCrops = allCrops.filter((c) =>
    c.toLowerCase().includes(cropSearch.toLowerCase())
  );

  const fetchPrices = async () => {
    setLoading(true);
    setError("");
    setDataSource("");
    setDataNote("");
    setResults([]);
    setSearched(true);

    try {
      const url = `${BACKEND_URL}/api/market-prices?commodity=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Official market prices are unavailable right now.");

      const records = Array.isArray(data.records) ? data.records.filter((record: MandiData) => record?.modal_price) : [];
      if (records.length > 0) {
        setResults(records);
        setDataSource(data.source || "Official mandi data");
        setDataNote(data.note || "Prices are reported market data; availability and reporting dates vary by mandi.");
      } else {
        setError(data.error || `No recent reported prices were found for ${crop} in ${state}. Try another crop or state.`);
      }
    } catch (err) {
      setError(err instanceof DOMException && err.name === "TimeoutError"
        ? "The official market data service took too long to respond. Please retry."
        : err instanceof Error ? err.message : "Failed to connect to the official market data service.");
    } finally {
      setLoading(false);
    }
  };

  const getBestMandi = () => {
    if (results.length === 0) return null;
    return results.reduce((best, current) =>
      parseInt(current.modal_price) > parseInt(best.modal_price) ? current : best
    );
  };

  const getEstimatedEarnings = (modalPrice: string) => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(modalPrice) || 0;
    return Math.round(price * qty).toLocaleString("en-IN");
  };

  const best = getBestMandi();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Official Mandi Prices</h2>
          <p className="text-sm text-gray-500 mt-1">
            Recent reported prices from official data.gov.in and AGMARKNET sources. Availability varies by mandi.
          </p>
        </div>

        {/* Search Panel */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          {/* Crop Search */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Crop
            </label>
            <input
              type="text"
              placeholder="Search crop..."
              value={cropSearch}
              onChange={(e) => setCropSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {crop && (
              <p className="text-xs text-green-600 mb-2">
                Selected: <strong>{crop}</strong>
              </p>
            )}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto">
              {filteredCrops.map((c) => (
                <button key={c} onClick={() => setCrop(c)}
                  className={`py-1.5 px-2 rounded-lg text-xs border transition ${
                    crop === c
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-200 text-gray-600 hover:border-green-400"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* State Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              📍 Select State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {indianStates.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Your Quantity (Quintals)
            </label>
            <input
              type="number" min="0.1" step="0.1" placeholder="Optional"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-40 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={fetchPrices}
            disabled={!crop || !state || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition">
            {loading ? "Fetching Official Prices..." : "Get Official Prices"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center mb-6">
            <div role="status" aria-label="Loading market prices" className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
            <h3 className="font-bold text-gray-700 mb-2">Fetching live prices...</h3>
            <p className="text-sm text-gray-500">
              Getting real data from Agmarknet government database
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
              <div className="bg-green-500 h-2 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-6"/></svg></div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Try: Tomato in Karnataka, Onion in Maharashtra, Wheat in Punjab
            </p>
          </div>
        )}

        {/* Best Mandi Highlight */}
        {best && !loading && (
          <div className="bg-green-600 rounded-2xl p-5 mb-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-green-200 text-xs mb-1">⭐ HIGHEST REPORTED PRICE</p>
                <h3 className="font-bold text-xl mb-1">{best.market}</h3>
                <p className="text-green-200 text-sm">
                  {best.district}, {best.state}
                </p>
                <p className="text-green-200 text-xs mt-1">
                  Updated: {best.arrival_date}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">₹{best.modal_price}</p>
                <p className="text-green-200 text-xs">per Quintal</p>
                {Number(quantity) > 0 && <><p className="mt-1 font-semibold text-white">Gross estimate: ₹{getEstimatedEarnings(best.modal_price)}</p><p className="text-xs text-green-200">for {quantity} quintals · before costs</p></>}
              </div>
            </div>
            <button
              onClick={() => window.open(
                `https://www.google.com/maps/search/${encodeURIComponent(best.market + " " + best.district + " " + best.state)}`,
                "_blank"
              )}
              className="mt-3 w-full bg-white text-green-600 py-2 rounded-xl text-sm font-semibold hover:bg-green-50 transition">
              Open Best Mandi Map
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="font-bold text-gray-700 mb-4">
              All Mandis for {crop} in {state}
              <span className="text-xs text-gray-400 font-normal ml-2">
                ({results.length} markets found)
              </span>
            </h3>
            <p className="mb-4 text-xs text-gray-500">Source: {dataSource}. {dataNote}</p>

            <div className="space-y-3">
              {[...results]
                .sort((a, b) => (Number(b.modal_price) || 0) - (Number(a.modal_price) || 0))
                .map((item, i) => (
                  <div key={i}
                    className={`rounded-xl p-4 border transition ${
                      i === 0
                        ? "border-green-300 bg-green-50"
                        : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {i === 0 && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                              Best Price
                            </span>
                          )}
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {item.market}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500">
                          📍 {item.district} • Variety: {item.variety}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {item.arrival_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700 text-lg">
                          ₹{item.modal_price}
                        </p>
                        <p className="text-xs text-gray-400">Reported price / quintal</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ₹{item.min_price} – ₹{item.max_price}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                      {Number(quantity) > 0 ? <p className="text-xs text-gray-500">Gross estimate for {quantity} quintals: <span className="ml-1 font-bold text-green-700">₹{getEstimatedEarnings(item.modal_price)}</span> · before costs</p> : <span className="text-xs text-gray-400">Enter a quantity to estimate gross value</span>}
                      <button
                        onClick={() => window.open(
                          `https://www.google.com/maps/search/${encodeURIComponent(item.market + " " + item.district + " " + item.state)}`,
                          "_blank"
                        )}
                        className="text-xs text-green-600 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-50">
                        Get Directions
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No results yet */}
        {!searched && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v10h16V10M3 5h18l-2 5H5L3 5Z"/><path d="M9 20v-6h6v6"/></svg></span>
            <h3 className="font-bold text-gray-700 mb-2">
              Search for Live Mandi Prices
            </h3>
            <p className="text-sm text-gray-500">
              Select a crop and state to see real government mandi prices
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 max-w-sm mx-auto">
              {["Tomato → Karnataka", "Wheat → Punjab", "Onion → Maharashtra"].map((s) => (
                <span key={s}
                  className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => navigate("/marketplace")}
            className="bg-yellow-50 hover:bg-yellow-100 rounded-xl p-4 text-center transition">
            <p className="text-sm font-medium text-gray-700">Sell Directly to Buyers</p>
          </button>
          <button onClick={() => navigate("/ai-assistant")}
            className="bg-purple-50 hover:bg-purple-100 rounded-xl p-4 text-center transition">
            <p className="text-sm font-medium text-gray-700">Ask AI Assistant</p>
          </button>
        </div>

      </div>
    </div>
  );
}
