// Shared weather fetching utility used by WeatherWidget and AiInsightsPanel

export interface CurrentWeather {
  temp: number
  humidity: number
  windSpeed: number
  weatherCode: number
  isDay: boolean
  city: string
}

export interface DailyForecast {
  date: string
  tempMax: number
  tempMin: number
  precipitation: number
  weatherCode: number
}

export interface WeatherPayload {
  current: CurrentWeather
  forecast: DailyForecast[]
}

const WEATHER_AI_CACHE_KEY = 'weather-ai-cache-v1'
const WEATHER_AI_TTL = 6 * 60 * 60 * 1000 // 6 hours

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weatherHash(payload: WeatherPayload): string {
  // Round temp to nearest 5° and precipitation to nearest 5mm to avoid cache churn on small changes
  const t = Math.round(payload.current.temp / 5) * 5
  const rain = payload.forecast.reduce((s, d) => s + d.precipitation, 0)
  const rainRounded = Math.round(rain / 5) * 5
  return `${t}_${rainRounded}_${payload.current.weatherCode}`
}

export async function fetchWeatherPayload(lat: number, lng: number, city: string): Promise<WeatherPayload> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&forecast_days=4&timezone=auto`
  )
  const data = await res.json()
  const c = data.current
  const d = data.daily

  const current: CurrentWeather = {
    temp: Math.round(c.temperature_2m ?? 0),
    humidity: Math.round(c.relative_humidity_2m ?? 0),
    windSpeed: Math.round(c.wind_speed_10m ?? 0),
    weatherCode: c.weather_code ?? 0,
    isDay: c.is_day === 1,
    city,
  }

  const forecast: DailyForecast[] = (d.time ?? []).map((date: string, i: number) => ({
    date,
    tempMax: Math.round(d.temperature_2m_max[i] ?? 0),
    tempMin: Math.round(d.temperature_2m_min[i] ?? 0),
    precipitation: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
    weatherCode: d.weather_code[i] ?? 0,
  }))

  return { current, forecast }
}

export function weatherCodeDesc(code: number): string {
  if (code === 0) return 'clear sky'
  if (code <= 3) return 'partly cloudy'
  if (code <= 48) return 'foggy'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'heavy rain showers'
  if (code <= 86) return 'heavy snow'
  if (code >= 95) return 'thunderstorm'
  return 'cloudy'
}

interface AiWeatherCache {
  payload: WeatherPayload
  hash: string
  timestamp: number
}

export function getCachedAiWeather(): { payload: WeatherPayload; hash: string } | null {
  try {
    const raw = localStorage.getItem(WEATHER_AI_CACHE_KEY)
    if (!raw) return null
    const cache: AiWeatherCache = JSON.parse(raw)
    if (Date.now() - cache.timestamp > WEATHER_AI_TTL) {
      localStorage.removeItem(WEATHER_AI_CACHE_KEY)
      return null
    }
    return { payload: cache.payload, hash: cache.hash }
  } catch {
    return null
  }
}

export function setCachedAiWeather(payload: WeatherPayload): string {
  const hash = weatherHash(payload)
  const cache: AiWeatherCache = { payload, hash, timestamp: Date.now() }
  try { localStorage.setItem(WEATHER_AI_CACHE_KEY, JSON.stringify(cache)) } catch { /* ignore */ }
  return hash
}
