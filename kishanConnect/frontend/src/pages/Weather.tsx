import WeatherWidget from "../components/WeatherWidget";

export default function Weather() {
  return <div className="min-h-screen bg-[#f7faf6] pb-24 md:pb-8">
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Weather intelligence</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900">Local weather for farm decisions</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-slate-600">Forecast data comes from Open-Meteo and requires browser location permission. Use the forecast as context, then check field conditions before irrigation or spraying.</p>
      <WeatherWidget />
      <div className="rounded-2xl border border-green-100 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">Weather guidance is informational. It does not use an on-farm rain gauge or soil moisture sensor. For time-sensitive crop protection decisions, confirm local conditions and product labels.</div>
    </main>
  </div>;
}
