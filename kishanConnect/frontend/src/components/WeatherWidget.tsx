import { useState, useEffect, useCallback } from "react";

interface WeatherData {
  temperature: number;
  humidity: number;
  windspeed: number;
  rainfall: number;
  weathercode: number;
  city: string;
  state: string;
}

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainfall: number;
  weathercode: number;
  rainProbability: number | null;
}

interface HourForecast { time: string; temperature: number; precipitation: number; rainProbability: number | null }
interface MonthlyForecast { date: string; meanTemperature: number | null; temperatureAnomaly: number | null; precipitation: number | null; precipitationAnomaly: number | null }

export interface WeatherSnapshot {
  weather: WeatherData;
  forecast: ForecastDay[];
  updatedAt: string;
  advice: string[];
}

const getWeatherDescription = (code: number) => {
  if (code === 0) return { desc: "Clear Sky", icon: "☀️" };
  if (code <= 3) return { desc: "Partly Cloudy", icon: "⛅" };
  if (code <= 49) return { desc: "Foggy", icon: "🌫️" };
  if (code <= 59) return { desc: "Drizzle", icon: "🌦️" };
  if (code <= 69) return { desc: "Rainy", icon: "🌧️" };
  if (code <= 79) return { desc: "Snowy", icon: "❄️" };
  if (code <= 84) return { desc: "Rain Showers", icon: "🌨️" };
  if (code <= 99) return { desc: "Thunderstorm", icon: "⛈️" };
  return { desc: "Unknown", icon: "🌡️" };
};

const getFarmingAdvice = (weather: WeatherData, today?: ForecastDay): string[] => {
  const advice = [];
  if ((today?.rainfall || 0) >= 10 || (today?.rainProbability ?? 0) >= 70) {
    advice.push("Rain is likely in today's forecast — review field drainage and check conditions before irrigation or spraying.");
  } else if ((today?.rainfall || 0) > 0 || (today?.rainProbability ?? 0) >= 35) {
    advice.push("Some rain is possible today — check the local forecast before irrigation or field work.");
  } else if (weather.rainfall > 0) {
    advice.push("Precipitation is reported in current conditions — check the field before irrigating.");
  } else {
    advice.push("Little or no rain appears in today's forecast — check soil moisture and crop conditions before irrigation.");
  }
  if (weather.humidity > 80) {
    advice.push("Humidity is high — monitor susceptible crops and follow local disease guidance.");
  }
  if (weather.windspeed > 20) {
    advice.push("Winds are strong — check product label conditions before any spray application.");
  }
  if (weather.temperature > 35) {
    advice.push("High temperatures are forecast — check crop and soil conditions, and avoid heat-sensitive field work.");
  } else if (weather.temperature < 15) {
    advice.push("Cool temperatures are reported — monitor sensitive crops for cold stress.");
  } else {
    advice.push("Use crop stage and field observations alongside this general weather context.");
  }
  return advice;
};

const getDayName = (dateStr: string) => {
  const date = new Date(`${dateStr}T12:00:00`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
};

export default function WeatherWidget({ onWeatherUpdate }: { onWeatherUpdate?: (snapshot: WeatherSnapshot) => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [hourly, setHourly] = useState<HourForecast[]>([]);
  const [monthly, setMonthly] = useState<MonthlyForecast[]>([]);
  const [monthlyError, setMonthlyError] = useState("");
  const [forecastView, setForecastView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const getWeatherData = useCallback(async (lat: number, lon: number) => {
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,windspeed_10m,weathercode,precipitation&hourly=temperature_2m,precipitation,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia/Kolkata&forecast_days=16&forecast_hours=24`;
      const [weatherRes, seasonalRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(`https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&monthly=temperature_2m_mean,temperature_2m_anomaly,precipitation_mean,precipitation_anomaly&models=ecmwf_seasonal_ensemble_mean_seamless&timezone=Asia%2FKolkata&forecast_days=217`).catch(() => null),
      ]);
      if (!weatherRes.ok) throw new Error("Weather service unavailable");
      const weatherData = await weatherRes.json();
      const hourlyData = weatherData.hourly;
      setHourly((hourlyData?.time || []).map((time: string, i: number) => ({
        time, temperature: Math.round(hourlyData.temperature_2m[i]), precipitation: hourlyData.precipitation[i] || 0,
        rainProbability: hourlyData.precipitation_probability?.[i] ?? null,
      })));
      if (seasonalRes?.ok) {
        const seasonalData = await seasonalRes.json();
        const monthlyData = seasonalData.monthly;
        setMonthly((monthlyData?.time || []).map((date: string, i: number) => ({
          date, meanTemperature: monthlyData.temperature_2m_mean?.[i] ?? null,
          temperatureAnomaly: monthlyData.temperature_2m_anomaly?.[i] ?? null,
          precipitation: monthlyData.precipitation_mean?.[i] ?? null,
          precipitationAnomaly: monthlyData.precipitation_anomaly?.[i] ?? null,
        })));
        setMonthlyError("");
      } else {
        setMonthly([]);
        setMonthlyError("The long-range seasonal service is unavailable right now.");
      }
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = geoRes.ok ? await geoRes.json() : {};
      const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "Your Location";
      const state = geoData.address?.state || "India";
      setWeather({
        temperature: Math.round(weatherData.current.temperature_2m),
        humidity: weatherData.current.relative_humidity_2m,
        windspeed: Math.round(weatherData.current.windspeed_10m),
        rainfall: weatherData.current.precipitation || 0,
        weathercode: weatherData.current.weathercode, city, state,
      });
      const forecastDays: ForecastDay[] = weatherData.daily.time.map((date: string, i: number) => ({
        date, maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
        minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
        rainfall: weatherData.daily.precipitation_sum[i] || 0,
        weathercode: weatherData.daily.weathercode[i],
        rainProbability: weatherData.daily.precipitation_probability_max?.[i] ?? null,
      }));
      setForecast(forecastDays);
      setUpdatedAt(new Date().toISOString());
      setError("");
    } catch {
      setError("Could not fetch weather data. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(() => {
    setLoading(true);
    setError("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          void getWeatherData(latitude, longitude);
        },
        () => {
          void (async () => {
            try {
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              const query = [user.district, user.state, "India"].filter(Boolean).join(", ");
              if (!query) throw new Error("Location permission is required for local weather.");
              const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
              if (!response.ok) throw new Error("Could not find your profile location.");
              const places = await response.json();
              if (!places.length) throw new Error("Could not find your profile location.");
              await getWeatherData(Number(places[0].lat), Number(places[0].lon));
            } catch (error) {
              setError(error instanceof Error ? error.message : "Allow location access to retrieve local weather.");
              setLoading(false);
            }
          })();
        }
      );
    } else {
      setError("This browser does not support location access.");
      setLoading(false);
    }
  }, [getWeatherData]);

  useEffect(() => {
    const task = window.setTimeout(fetchWeather, 0);
    return () => window.clearTimeout(task);
  }, [fetchWeather]);

  useEffect(() => {
    if (weather && updatedAt) onWeatherUpdate?.({ weather, forecast, updatedAt, advice: getFarmingAdvice(weather, forecast[0]) });
  }, [weather, forecast, updatedAt, onWeatherUpdate]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">🌤️</span>
          <p className="text-sm text-slate-600">Fetching weather for your location...</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-950">Weather unavailable</p>
        <p className="mt-1 text-xs text-amber-800">{error || "Weather service returned no data."}</p>
        <button type="button" onClick={fetchWeather} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100">Retry weather</button>
      </div>
    );
  }

  const { desc, icon } = getWeatherDescription(weather.weathercode);
  const advice = getFarmingAdvice(weather, forecast[0]);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">

      {/* Main Weather Row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Local weather · {weather.city}, {weather.state}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-4xl">{icon}</span>
            <div>
              <p className="text-3xl font-bold text-slate-900">{weather.temperature}°C</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="grid grid-cols-2 gap-2 text-left text-xs text-slate-600">
            <span>Humidity <b className="text-slate-900">{weather.humidity}%</b></span>
            <span>Wind <b className="text-slate-900">{weather.windspeed} km/h</b></span>
            <span>Rain now <b className="text-slate-900">{weather.rainfall} mm</b></span>
            {forecast[0]?.rainProbability !== null && forecast[0]?.rainProbability !== undefined && <span>Rain chance <b className="text-slate-900">{forecast[0].rainProbability}%</b></span>}
          </div>
        </div>
      </div>

      {/* Farming Advice */}
      <div className="mt-3 border-t border-slate-100 px-5 pt-3 pb-4">
        <div className="mb-1 flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-700">Weather based farming notes</p><span className="text-[11px] text-slate-400">Open-Meteo · {updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span></div>
        {advice.map((a, i) => (
          <p key={i} className="text-xs leading-5 text-slate-600">{a}</p>
        ))}
      </div>

      <div className="border-t border-slate-100">
        <div role="tablist" aria-label="Weather forecast range" className="flex gap-2 overflow-x-auto px-5 py-3">
          {([['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={forecastView === id} onClick={() => setForecastView(id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${forecastView === id ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>{label}</button>)}
        </div>
        {forecastView === "daily" && <section role="tabpanel" className="bg-slate-50 px-5 py-4"><p className="mb-1 text-sm font-semibold text-slate-800">Today, hour by hour</p><p className="mb-3 text-xs text-slate-500">Next 24 hours · local time</p><div className="flex gap-3 overflow-x-auto pb-2">{hourly.map((hour) => <article key={hour.time} className="min-w-24 rounded-xl border border-slate-200 bg-white p-3 text-center"><p className="text-xs font-medium text-slate-500">{new Date(hour.time).toLocaleTimeString([], { hour: "numeric" })}</p><p className="mt-2 text-lg font-bold text-slate-900">{hour.temperature}°</p><p className="mt-1 text-xs text-blue-700">{hour.precipitation.toFixed(1)} mm</p><p className="text-[10px] text-slate-500">{hour.rainProbability == null ? "Rain chance —" : `${hour.rainProbability}% rain chance`}</p></article>)}</div></section>}
        {forecastView === "weekly" && <section role="tabpanel" className="bg-slate-50 px-5 py-4"><p className="mb-3 text-sm font-semibold text-slate-800">7-day forecast</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">{forecast.slice(0, 7).map((day) => { const dayWeather = getWeatherDescription(day.weathercode); return <article key={day.date} className="rounded-xl border border-slate-200 bg-white p-3 text-center"><p className="text-xs font-medium text-slate-500">{getDayName(day.date)} · {new Date(`${day.date}T12:00:00`).getDate()}</p><span className="text-xl">{dayWeather.icon}</span><p className="text-sm font-semibold text-slate-900">{day.maxTemp}° <span className="font-normal text-slate-500">{day.minTemp}°</span></p><p className="mt-1 text-[11px] text-blue-700">{day.rainfall} mm rain</p><p className="text-[10px] text-slate-500">{day.rainProbability == null ? "Rain chance —" : `${day.rainProbability}% chance`}</p></article>; })}</div></section>}
        {forecastView === "monthly" && <section role="tabpanel" className="bg-slate-50 px-5 py-4"><p className="text-sm font-semibold text-slate-800">Monthly seasonal outlook</p><p className="mb-3 mt-1 text-xs leading-5 text-slate-500">ECMWF ensemble guidance for broad regional trends. Long-range values are uncertain and are not a local day-by-day forecast.</p>{monthly.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{monthly.map((month) => <article key={month.date} className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="font-semibold text-slate-800">{new Date(`${month.date}T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h4><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[11px] text-slate-500">Mean temperature</p><p className="text-lg font-bold text-slate-900">{month.meanTemperature == null ? "—" : `${month.meanTemperature.toFixed(1)}°C`}</p>{month.temperatureAnomaly != null && <p className="text-[11px] text-slate-500">{month.temperatureAnomaly > 0 ? "+" : ""}{month.temperatureAnomaly.toFixed(1)}° vs normal</p>}</div><div><p className="text-[11px] text-slate-500">Precipitation outlook</p><p className="text-lg font-bold text-blue-800">{month.precipitation == null ? "—" : `${month.precipitation.toFixed(1)} mm`}</p>{month.precipitationAnomaly != null && <p className="text-[11px] text-slate-500">{month.precipitationAnomaly > 0 ? "+" : ""}{month.precipitationAnomaly.toFixed(1)} mm vs normal</p>}</div></div></article>)}</div> : <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{monthlyError || "Monthly outlook is not available for this location right now."}</div>}</section>}
      </div>

    </div>
  );
}
