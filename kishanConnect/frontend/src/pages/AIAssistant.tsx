import { useState, useRef, useEffect } from "react";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिंदी", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "मराठी", flag: "🇮🇳" },
  { code: "pa", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা", flag: "🇮🇳" },
  { code: "or", name: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം", flag: "🇮🇳" },
  { code: "as", name: "অসমীয়া", flag: "🇮🇳" },
];

const suggestedQuestions = [
  "Which crops grow best in Karnataka?",
  "How to treat tomato leaf curl disease?",
  "Best time to sell onion in Maharashtra?",
  "How much water does rice need per acre?",
  "What is organic farming?",
  "How to increase crop yield?",
  "Which fertilizer is best for wheat?",
  "How to control pests in cotton?",
];
const languageLabels: Record<string, string> = { en: "English", hi: "Hindi", kn: "Kannada", ta: "Tamil", te: "Telugu", mr: "Marathi", pa: "Punjabi", gu: "Gujarati", bn: "Bengali", or: "Odia", ml: "Malayalam", as: "Assamese" };

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
}

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const speechLocale: Record<string, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN", pa: "pa-IN", gu: "gu-IN", bn: "bn-IN", or: "or-IN", ml: "ml-IN", as: "as-IN" };
const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:5000" : "https://backend-smart-crop-360.onrender.com");

export default function AIAssistant() {
  const [selectedLang, setSelectedLang] = useState(languages[0]);
  const [farms, setFarms] = useState<Array<{id:number; name:string; state:string; district:string; currentCrop?:string; soilType?:string}>>([]);
  const [farmId, setFarmId] = useState(() => localStorage.getItem("activeFarmId") || "");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to KisanConnect.\n\nI can discuss crop planning, symptoms to discuss with an expert, soil and irrigation practices, and general farming questions. I do not have live price, weather, sensor, or disease model data.\n\nAsk a farming question in your selected language.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  useEffect(() => {
    const task = window.setTimeout(async () => {
      try {
        const response = await fetch(`${backendUrl}/api/farms`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        if (!response.ok) return;
        const data = await response.json(); setFarms(data.farms || []);
        const saved = localStorage.getItem("activeFarmId");
        setFarmId(saved && data.farms?.some((farm: { id: number }) => String(farm.id) === saved) ? saved : String(data.farms?.[0]?.id || ""));
      } catch { /* chat can still work without saved farm context */ }
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    const syncFarm = (event: Event) => setFarmId((event as CustomEvent<{ farmId: string }>).detail.farmId);
    window.addEventListener("farm-context-change", syncFarm);
    return () => window.removeEventListener("farm-context-change", syncFarm);
  }, []);
  useEffect(() => { if (farmId) localStorage.setItem("activeFarmId", farmId); }, [farmId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getSystemPrompt = (language: string = "English") => {
    return `You are a STRICT agricultural assistant for Indian farmers in the KisanConnect app.

YOUR ONLY JOB is to help farmers with these topics:
1. Crop selection (which crop to grow, when, where)
2. Crop diseases (identification, symptoms, treatment)
3. Fertilizers and pesticides (type, dosage, timing)
4. Market prices and best time/place to sell
5. Irrigation and water management
6. Soil health and crop rotation
7. Seeds and sowing methods
8. Weather based farming advice
9. Organic and sustainable farming
10. Government schemes and subsidies for farmers
11. Post harvest storage and management
12. Pest control methods

CRITICAL LANGUAGE RULE: You MUST respond in ${language} language ONLY. 
Even if the user writes in English, respond in ${language}.
If ${language} is English, respond in English.
If ${language} is हिंदी, respond fully in Hindi.
If ${language} is ಕನ್ನಡ, respond fully in Kannada.
If ${language} is தமிழ், respond fully in Tamil.
If ${language} is తెలుగు, respond fully in Telugu.
If ${language} is मराठी, respond fully in Marathi.
If ${language} is ਪੰਜਾਬੀ, respond fully in Punjabi.
If ${language} is ગુજરાતી, respond fully in Gujarati.
If ${language} is বাংলা, respond fully in Bengali.
This is the most important rule - NEVER ignore the language setting.

STRICT RULES:
1. ONLY answer farming and agriculture related questions
2. If someone asks ANYTHING not related to farming say: "Sorry, I can only help with farming and agriculture questions."
3. Always respond in the SAME language the user writes in
4. If user writes in Hindi → respond fully in Hindi
5. If user writes in Kannada → respond fully in Kannada
6. If user writes in Tamil → respond fully in Tamil
7. If user writes in Telugu → respond fully in Telugu
8. If user writes in Marathi → respond fully in Marathi
9. If user writes in Punjabi → respond fully in Punjabi
10. Use SIMPLE words that uneducated farmers can understand
11. Do not guess chemical dosages, live prices, scheme eligibility, disease diagnoses, or model confidence
12. Always think about Indian farming conditions
13. Be encouraging and supportive
14. Keep answers short and practical`;
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const speech = window as SpeechWindow;
    const RecognitionConstructor = speech.SpeechRecognition || speech.webkitSpeechRecognition;
    if (!RecognitionConstructor) {
      setVoiceError("Voice input is not supported by this browser. You can type your question instead.");
      return;
    }
    setVoiceError("");
    try {
      const recognition = new RecognitionConstructor();
      recognitionRef.current = recognition;
      recognition.lang = speechLocale[selectedLang.code] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => { setListening(true); setVoiceError(""); };
      recognition.onresult = (event) => {
        let transcript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (event.results[index].isFinal !== false) transcript += event.results[index][0]?.transcript || "";
        }
        if (transcript.trim()) setInput((current) => `${current}${current ? " " : ""}${transcript.trim()}`);
      };
      recognition.onerror = (event) => {
        setVoiceError(event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow microphone permission for this site, then try again."
          : event.error === "audio-capture"
            ? "No microphone was detected. Connect or enable a microphone and try again."
            : event.error === "network"
              ? "Browser speech recognition could not reach its speech service. Check your connection or type your question."
              : event.error === "no-speech"
                ? "No speech was detected. Try again and speak after the microphone opens."
                : "Voice recognition stopped unexpectedly. Please try again or type your question.");
      };
      recognition.onend = () => { recognitionRef.current = null; setListening(false); };
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError("Could not start voice input. Check microphone permission and try again.");
    }
  };

  const speakReply = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Speech output is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale[selectedLang.code] || "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/ai-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({
          system: getSystemPrompt(languageLabels[selectedLang.code] || "English"),
          languageCode: selectedLang.code,
          farmContext: farms.find((farm) => String(farm.id) === farmId) || null,
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: messageText },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant service could not answer.");
      const reply = data.reply || "Sorry, I could not get a response. Please try again.";

      const assistantMessage: Message = {
        role: "assistant",
        content: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error ? error.message : "Could not connect to the farming assistant.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">

        

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col flex-1">

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">AI Farming Assistant</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ask anything about farming in your language
          </p>
        </div>

        {farms.length > 0 && <label className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">Farm context<select className="max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2" value={farmId} onChange={(e) => { setFarmId(e.target.value); if (e.target.value) localStorage.setItem("activeFarmId", e.target.value); window.dispatchEvent(new CustomEvent("farm-context-change", { detail: { farmId: e.target.value } })); }}><option value="">No farm context</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.district}{farm.currentCrop ? ` · ${farm.currentCrop}` : ""}</option>)}</select></label>}

        {/* Language Selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            🌐 Select your language:
          </p>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  selectedLang.code === lang.code
                    ? "bg-green-600 text-white border-green-600"
                    : "border-gray-200 text-gray-600 hover:border-green-400"}`}>
                {languageLabels[lang.code] || lang.code}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            💡 Try asking:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
            <button
                key={i}
                onClick={() => sendMessage(selectedLang.code !== "en" ? `Please answer in ${languageLabels[selectedLang.code]}: ${q}` : q)}
                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs transition">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-xs md:max-w-md lg:max-w-lg`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg></span>
                      <span className="text-xs text-gray-400">AI Assistant</span>
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-green-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && i > 0 && <button onClick={() => speakReply(msg.content)} className="mt-1 text-xs font-medium text-green-700 hover:text-green-900" aria-label="Read this answer aloud">🔊 Listen</button>}
                  <span className="text-xs text-gray-400 mt-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="text-xs text-gray-400 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
          <button type="button" onClick={startVoiceInput} aria-pressed={listening} aria-label={listening ? "Stop voice input" : "Speak your question"} className={`rounded-xl px-3 py-2.5 text-sm font-medium ${listening ? "bg-red-100 text-red-800" : "bg-green-50 text-green-800 hover:bg-green-100"}`}>{listening ? "Stop listening" : "Voice input"}</button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(selectedLang.code !== "en" ? `Please answer in ${languageLabels[selectedLang.code]}: ${input}` : input)}
            placeholder={`Type your farming question in ${languageLabels[selectedLang.code] || "English"}...`}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={() => sendMessage(selectedLang.code !== "en" ? `Please answer in ${languageLabels[selectedLang.code]}: ${input}` : input)}
            disabled={!input.trim() || loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
            {loading ? "⏳" : "Send 📤"}
          </button>
        </div>

        {voiceError && <p role="status" className="mt-2 text-center text-xs text-amber-800">{voiceError}</p>}
        <p className="text-center text-xs text-gray-400 mt-2">Voice uses your browser's speech features. Chat replies are saved to your account when the AI provider is configured.</p>

      </div>
    </div>
  );
}
