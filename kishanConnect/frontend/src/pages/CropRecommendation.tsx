import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const steps = ["Location", "Land", "Soil", "Water", "Season", "Goal"];

const stateDistricts: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur","Chittoor","East Godavari","Guntur","Krishna","Kurnool","Nellore","Prakasam","Srikakulam","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw","Changlang","Dibang Valley","East Kameng","East Siang","Kurung Kumey","Lohit","Longding","Lower Dibang Valley","Namsai","Papum Pare","Tawang","Tirap","Upper Siang","West Kameng","West Siang"],
  "Assam": ["Baksa","Barpeta","Biswanath","Bongaigaon","Cachar","Darrang","Dhemaji","Dhubri","Dibrugarh","Goalpara","Golaghat","Jorhat","Kamrup","Karbi Anglong","Karimganj","Kokrajhar","Lakhimpur","Nagaon","Nalbari","Sivasagar","Sonitpur","Tinsukia"],
  "Bihar": ["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Katihar","Khagaria","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Samastipur","Saran","Sitamarhi","Siwan","Vaishali","West Champaran"],
  "Chhattisgarh": ["Bastar","Bilaspur","Dantewada","Dhamtari","Durg","Jashpur","Kanker","Korba","Koriya","Mahasamund","Raigarh","Raipur","Rajnandgaon","Surguja"],
  "Goa": ["North Goa","South Goa"],
  "Gujarat": ["Ahmedabad","Amreli","Anand","Banaskantha","Bharuch","Bhavnagar","Dahod","Gandhinagar","Jamnagar","Junagadh","Kheda","Kutch","Mehsana","Navsari","Panchmahal","Patan","Porbandar","Rajkot","Surat","Surendranagar","Vadodara","Valsad"],
  "Haryana": ["Ambala","Bhiwani","Faridabad","Fatehabad","Gurugram","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Mandi","Shimla","Sirmaur","Solan","Una"],
  "Jharkhand": ["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Khunti","Koderma","Latehar","Palamu","Ramgarh","Ranchi","Sahibganj","West Singhbhum"],
  "Karnataka": ["Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar","Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayapura","Yadgir"],
  "Kerala": ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  "Madhya Pradesh": ["Bhopal","Indore","Gwalior","Jabalpur","Ujjain","Sagar","Rewa","Satna","Chhindwara","Balaghat","Betul","Bhind","Burhanpur","Chhatarpur","Damoh","Datia","Dewas","Dhar","Guna","Hoshangabad","Jhabua","Katni","Khandwa","Khargone","Mandla","Mandsaur","Morena","Narsinghpur","Neemuch","Panna","Raisen","Rajgarh","Ratlam","Sehore","Seoni","Shahdol","Shivpuri","Singrauli","Tikamgarh","Vidisha"],
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  "Manipur": ["Bishnupur","Chandel","Churachandpur","Imphal East","Imphal West","Jiribam","Kakching","Senapati","Tamenglong","Thoubal","Ukhrul"],
  "Meghalaya": ["East Garo Hills","East Jaintia Hills","East Khasi Hills","North Garo Hills","Ri Bhoi","South Garo Hills","West Garo Hills","West Jaintia Hills","West Khasi Hills"],
  "Mizoram": ["Aizawl","Champhai","Kolasib","Lawngtlai","Lunglei","Mamit","Saiha","Serchhip"],
  "Nagaland": ["Dimapur","Kiphire","Kohima","Longleng","Mokokchung","Mon","Peren","Phek","Tuensang","Wokha","Zunheboto"],
  "Odisha": ["Angul","Balangir","Balasore","Bargarh","Bhadrak","Boudh","Cuttack","Debagarh","Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi","Kandhamal","Kendrapara","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nayagarh","Nuapada","Puri","Rayagada","Sambalpur","Sonepur","Sundargarh"],
  "Punjab": ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Mansa","Moga","Mohali","Muktsar","Nawanshahr","Pathankot","Patiala","Rupnagar","Sangrur","Tarn Taran"],
  "Rajasthan": ["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"],
  "Sikkim": ["East Sikkim","North Sikkim","South Sikkim","West Sikkim"],
  "Tamil Nadu": ["Ariyalur","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"],
  "Telangana": ["Adilabad","Bhadradri Kothagudem","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Kumuram Bheem","Mahabubabad","Mahabubnagar","Mancherial","Medak","Medchal Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Rangareddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal Rural","Warangal Urban","Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"],
  "Uttar Pradesh": ["Agra","Aligarh","Allahabad","Ambedkar Nagar","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Raebareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shravasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  "Uttarakhand": ["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"],
  "West Bengal": ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"],
};

export default function CropRecommendation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [prefilledFarm, setPrefilledFarm] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    farmId: "",
    state: "",
    district: "",
    landSize: "",
    landType: "",
    lastCrop: "",
    soilType: "",
    waterSource: "",
    waterAvailability: "",
    season: "",
    goal: "",
  });

  useEffect(() => {
    const selectedFarmId = localStorage.getItem("activeFarmId");
    if (!selectedFarmId) return;
    let cancelled = false;
    fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/farms`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load farm")))
      .then((data) => {
        const farm = (data.farms || []).find((item: { id: number }) => String(item.id) === selectedFarmId);
        if (!farm || cancelled) return;
        setPrefilledFarm(farm.name);
        setForm((current) => ({ ...current, farmId: String(farm.id), state: farm.state || current.state, district: farm.district || current.district,
          landSize: farm.acres ? String(farm.acres) : current.landSize, soilType: farm.soilType || current.soilType,
          waterSource: farm.waterSource || current.waterSource, lastCrop: farm.currentCrop || current.lastCrop }));
      }).catch(() => { /* the guided form remains usable if the farm API is offline */ });
    return () => { cancelled = true; };
  }, []);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  };

  const validateStep = () => {
    const requirements: Array<[string, string[]]> = [
      ["Choose your state and district.", [form.state, form.district]],
      ["Enter the land size, land type, and last crop grown (or choose None / First time).", [form.landSize, form.landType, form.lastCrop]],
      ["Choose the soil type.", [form.soilType]],
      ["Choose your water source and water availability.", [form.waterSource, form.waterAvailability]],
      ["Choose a growing season.", [form.season]],
      ["Choose a farming goal.", [form.goal]],
    ];
    const [message, values] = requirements[step];
    if (values.some((value) => !value.trim()) || (step === 1 && Number(form.landSize) <= 0)) {
      setFormError(message);
      return false;
    }
    setFormError("");
    return true;
  };
  const nextStep = () => { if (validateStep()) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);
  const showRecommendations = async () => {
    if (!validateStep() || submitting) return;
    setSubmitting(true);
    let backendAdvisory: unknown = null;
    let advisoryUnavailable = false;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/farm-tools/crop-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ farmId: form.farmId ? Number(form.farmId) : undefined, soilType: form.soilType, waterAvailability: form.waterAvailability, season: form.season }),
      });
      if (!response.ok) throw new Error("Farm advisory service is unavailable.");
      backendAdvisory = await response.json();
    } catch { advisoryUnavailable = true; }
    setSubmitting(false);
    navigate("/crop-results", { state: { ...form, backendAdvisory, advisoryUnavailable } });
  };

  const districts = form.state ? stateDistricts[form.state] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">

     

      <div className="max-w-xl mx-auto px-6 py-10">

        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < step ? "bg-green-600 text-white" :
                  i === step ? "bg-green-600 text-white ring-4 ring-green-200" :
                  "bg-gray-200 text-gray-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-1 w-6 mx-1 rounded transition-all
                  ${i < step ? "bg-green-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">

          {prefilledFarm && <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">Farm details prefilled from <strong>{prefilledFarm}</strong>. Confirm or update them before continuing.</div>}

          {/* Step 1 - Location */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Where is your farm located?</h2>
              <p className="text-sm text-gray-500 mb-4">Select your state and district for climate-based recommendations</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">State *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={form.state}
                    onChange={(e) => { update("state", e.target.value); update("district", ""); }}>
                    <option value="">Select State</option>
                    {Object.keys(stateDistricts).sort().map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">District *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                    disabled={!form.state}>
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Land */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Tell us about your land</h2>
              <p className="text-sm text-gray-500 mb-4">Land details help us suggest practical crops for your capacity</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Land Size (in Acres) *</label>
                  <input type="number" placeholder="e.g. 3.0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={form.landSize}
                    onChange={(e) => update("landSize", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">Land Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Dry Land", "Wet Land", "Garden Land"].map((type) => (
                      <button key={type} onClick={() => update("landType", type)}
                        className={`py-2 rounded-lg text-sm border transition ${
                          form.landType === type
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-300 text-gray-600 hover:border-green-400"}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Last Crop Grown *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={form.lastCrop}
                    onChange={(e) => update("lastCrop", e.target.value)}>
                    <option value="">Select last crop</option>
                    {["Cotton","Rice","Wheat","Sugarcane","Maize","Groundnut","Tomato","Onion","Jowar","Bajra","Soybean","Turmeric","Chilli","Sunflower","Banana","Mango","Coconut","None / First time"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Soil */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">What type of soil do you have?</h2>
              <p className="text-sm text-gray-500 mb-4">Soil type determines which crops will thrive</p>
              <div className="grid grid-cols-2 gap-3">
                {["Red Soil","Black Soil","Sandy Soil","Clay Soil","Loamy Soil","Alluvial Soil"].map((soil) => (
                  <button key={soil} onClick={() => update("soilType", soil)}
                    className={`py-3 rounded-lg text-sm border transition ${
                      form.soilType === soil
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-600 hover:border-green-400"}`}>
                    {soil}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 - Water */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">What's your water source?</h2>
              <p className="text-sm text-gray-500 mb-4">Water availability affects crop selection</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Water Source *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={form.waterSource}
                    onChange={(e) => update("waterSource", e.target.value)}>
                    <option value="">Select source</option>
                    {["Borewell","Canal","Rain Fed","River","Tank","Pond","Well"].map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">Water Availability *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Low","Medium","High"].map((level) => (
                      <button key={level} onClick={() => update("waterAvailability", level)}
                        className={`py-2 rounded-lg text-sm border transition ${
                          form.waterAvailability === level
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-300 text-gray-600 hover:border-green-400"}`}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 - Season */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Which season are you planning for?</h2>
              <p className="text-sm text-gray-500 mb-4">Different crops grow best in different seasons</p>
              <div className="space-y-3">
                {[
                  { name: "Kharif (June–Oct)", desc: "Monsoon season — Rice, Cotton, Maize" },
                  { name: "Rabi (Oct–Mar)", desc: "Winter season — Wheat, Mustard, Peas" },
                  { name: "Zaid (Mar–Jun)", desc: "Summer season — Watermelon, Cucumber" },
                ].map((s) => (
                  <button key={s.name} onClick={() => update("season", s.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                      form.season === s.name
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-700 hover:border-green-400"}`}>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className={`text-xs mt-0.5 ${form.season === s.name ? "text-green-100" : "text-gray-400"}`}>
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6 - Goal */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">What's your farming goal?</h2>
              <p className="text-sm text-gray-500 mb-4">We'll prioritize based on your preference</p>
              <div className="space-y-3">
                {[
                  { name: "Maximum Profit" },
                  { name: "Low Investment" },
                  { name: "Short Duration" },
                  { name: "Less Water Usage" },
                  { name: "Organic Friendly" },
                ].map((goal) => (
                  <button key={goal.name} onClick={() => update("goal", goal.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition flex items-center gap-3 ${
                      form.goal === goal.name
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-700 hover:border-green-400"}`}>
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-70"/>
                    {goal.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {formError && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
          <div className="flex justify-between mt-6">
            <button onClick={prevStep} disabled={step === 0}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Back
            </button>
            {step < 5 ? (
              <button onClick={nextStep}
                className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                Next →
              </button>
            ) : (
              <button disabled={submitting}
                onClick={showRecommendations}
                className="px-6 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Preparing recommendations…" : "Get Recommendations"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
