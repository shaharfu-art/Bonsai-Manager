import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface WeatherData {
  temp: number
  icon: string
  isDay: boolean
  city: string
  humidity: number
  windSpeed: number
}

interface ForecastDay {
  date: string
  tempMax: number
  tempMin: number
  icon: string
  weatherCode: number
  precipitation: number
  windMax: number
}

// Weather codes from Open-Meteo → icon + description
function getWeatherIcon(code: number, isDay: boolean): { icon: string; desc: string } {
  if (code === 0) 
return { icon: isDay ? '☀️' : '🌙', desc: isDay ? 'clear' : 'clear night' }
  if (code <= 3) 
return { icon: isDay ? '⛅' : '☁️', desc: 'partly cloudy' }
  if (code <= 48) 
return { icon: '🌫️', desc: 'foggy' }
  if (code <= 57) 
return { icon: '🌦️', desc: 'drizzle' }
  if (code <= 67) 
return { icon: '🌧️', desc: 'rain' }
  if (code <= 77) 
return { icon: '❄️', desc: 'snow' }
  if (code <= 82) 
return { icon: '🌧️', desc: 'heavy rain' }
  if (code <= 86) 
return { icon: '🌨️', desc: 'heavy snow' }
  if (code >= 95) 
return { icon: '⛈️', desc: 'thunderstorm' }
  
return { icon: isDay ? '🌤️' : '🌙', desc: '' }
}


const CACHE_KEY = 'weather-cache-v2'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const WeatherWidget: React.FC = () => {
  const { i18n } = useTranslation()
  
const { user } = useAuth()
  
const [weather, setWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!user) 
return

    const fetchWeather = async () => {
      // Check cache
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, forecast: cachedForecast, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL) {
            setWeather(data)
            if (cachedForecast) setForecast(cachedForecast)
            return
          }
        }
      } catch { /* ignore */ }

      // Get user location from DB
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('trees_lat, trees_lng, trees_city')
        .eq('id', user.id)
        .single()

      if (!profile?.trees_lat || !profile?.trees_lng) 
return

      // Fetch from Open-Meteo
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${profile.trees_lat}&longitude=${profile.trees_lng}&current=temperature_2m,is_day,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=5`
        )
        
const data = await res.json()
        
const current = data.current
        const temp = Math.round(current?.temperature_2m ?? 0)
        
const isDay = current?.is_day === 1
        const weatherCode = current?.weather_code ?? 0
        const humidity = Math.round(current?.relative_humidity_2m ?? 0)
        
const windSpeed = Math.round(current?.wind_speed_10m ?? 0)
        
const { icon } = getWeatherIcon(weatherCode, isDay)

        
const weatherData: WeatherData = {
          temp,
          icon,
          isDay,
          city: profile.trees_city || '',
          humidity,
          windSpeed,
        }
        setWeather(weatherData)

        // Parse daily forecast
        let forecastDays: ForecastDay[] = []
        if (data.daily) {
          for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
            const dayIcon = getWeatherIcon(data.daily.weather_code[i], true).icon
            forecastDays.push({
              date: data.daily.time[i],
              tempMax: Math.round(data.daily.temperature_2m_max[i]),
              tempMin: Math.round(data.daily.temperature_2m_min[i]),
              icon: dayIcon,
              weatherCode: data.daily.weather_code[i],
              precipitation: Math.round((data.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
              windMax: Math.round(data.daily.wind_speed_10m_max?.[i] ?? 0),
            })
          }
          setForecast(forecastDays)
        }

        // Cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: weatherData,
          forecast: forecastDays,
          timestamp: Date.now(),
        }))
      } catch { /* silently fail */ }
    }

    fetchWeather()
  }, [user])

  if (!weather) 
return null

  // Check if current conditions are hazardous
  const isHazard = weather.temp > 37 || weather.temp < 3 || weather.windSpeed > 50 || weather.humidity < 25
  let bgGradient: string
  if (!weather.isDay) {
    bgGradient = 'bg-gradient-to-r from-indigo-900 to-slate-800'
  } else if (weather.temp > 35) {
    bgGradient = 'bg-gradient-to-r from-orange-400 to-red-500'
  } else if (weather.temp > 25) {
    bgGradient = 'bg-gradient-to-r from-sky-400 to-blue-500'
  } else if (weather.temp > 15) {
    bgGradient = 'bg-gradient-to-r from-sky-300 to-blue-400'
  } else if (weather.temp > 5) {
    bgGradient = 'bg-gradient-to-r from-slate-300 to-sky-400'
  } else {
    bgGradient = 'bg-gradient-to-r from-blue-700 to-indigo-800'
  }

  const isRtl = i18n.language === 'he'

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`${bgGradient} rounded-2xl px-4 py-1 flex items-center gap-2.5 text-white min-w-[220px] relative overflow-hidden cursor-pointer hover:brightness-110 transition-all`}
        style={{ boxShadow: '0 0 12px 2px rgba(0,0,0,0.15), inset 0 0 8px rgba(255,255,255,0.1)' }}
      >
        {/* Twinkling stars for night */}
        {!weather.isDay && (
          <>
            <span className="absolute top-1 left-8 w-1 h-1 bg-white rounded-full animate-pulse opacity-60" />
            <span className="absolute top-3 left-16 w-0.5 h-0.5 bg-white rounded-full animate-pulse opacity-40" style={{ animationDelay: '0.5s' }} />
            <span className="absolute bottom-2 left-24 w-0.5 h-0.5 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: '1s' }} />
            <span className="absolute top-1.5 right-12 w-1 h-1 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
            <span className="absolute bottom-1 right-20 w-0.5 h-0.5 bg-white rounded-full animate-pulse opacity-30" style={{ animationDelay: '0.8s' }} />
          </>
        )}
        <span className="text-3xl leading-none drop-shadow-lg relative z-10">{weather.icon}</span>
        <div className="flex flex-col items-start flex-1 relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold leading-tight drop-shadow">{weather.temp}°</span>
            {isHazard && <span className="text-sm animate-pulse">⚠️</span>}
            {weather.city && (
              <span className="text-[10px] opacity-70">{weather.city}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs opacity-90">💧 {weather.humidity}%</span>
            <span className="text-xs opacity-90">💨 {weather.windSpeed}km/h</span>
          </div>
        </div>
      </button>

      {/* Expanded forecast dropdown */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="fixed top-16 left-4 z-50 rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden">
            {/* Header gradient */}
            <div className={`${bgGradient} px-4 py-3 text-white`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{isRtl ? '📅 תחזית 4 ימים' : '📅 4-Day Forecast'}</span>
                <button onClick={() => setExpanded(false)} className="text-white/60 hover:text-white text-lg">×</button>
              </div>
              {weather.city && <p className="text-[11px] text-white/70 mt-0.5">📍 {weather.city}</p>}
            </div>

            {/* Forecast body */}
            <div className="bg-white p-3">
              {forecast.length > 0 ? (
                <div className="space-y-2">
                  {forecast.map(day => {
                    const isExtreme = day.tempMax >= 38
                    const isHot = !isExtreme && day.tempMax >= 35
                    const isCold = day.tempMin <= 5
                    const isRainy = day.weatherCode >= 61 && day.weatherCode <= 82
                    const isStormy = day.weatherCode >= 95
                    const isWindy = day.windMax >= 30

                    const hazards: Array<{ icon: string; text: string }> = []
                    if (isExtreme) hazards.push({ icon: '🔥', text: isRtl ? 'חמסין — העבר עצים לצל!' : 'Extreme heat — move to shade!' })
                    else if (isHot) hazards.push({ icon: '☀️', text: isRtl ? 'יום חם — הקפד על השקיה' : 'Hot day — make sure to water' })
                    if (isCold) hazards.push({ icon: '🥶', text: isRtl ? 'סכנת כפור — הכנס עצים לבית' : 'Frost risk — bring trees indoors' })
                    if (isStormy) hazards.push({ icon: '⛈️', text: isRtl ? 'סופה צפויה — אבטח עצים מרוח' : 'Storm expected — secure from wind' })
                    else if (isRainy) hazards.push({ icon: '🌧️', text: isRtl ? 'גשם — לא צריך להשקות' : 'Rain — no need to water' })
                    if (isWindy && !isStormy) hazards.push({ icon: '💨', text: isRtl ? 'רוח חזקה — קבע עציצים במקומם' : 'Strong wind — anchor pots' })

                    const hasHazard = hazards.length > 0
                    const rowBg = isExtreme ? 'bg-red-50' : isHot ? 'bg-orange-50' : isCold ? 'bg-blue-50' : isStormy ? 'bg-purple-50' : ''

                    return (
                      <div key={day.date} className={`rounded-xl p-3 ${rowBg || 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{day.icon}</span>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-700">
                              {new Date(day.date).toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-gray-900">{day.tempMax}°</span>
                              <span className="text-xs text-gray-400">{day.tempMin}°</span>
                              {day.precipitation > 0 && <span className="text-[10px] text-blue-500">💧{day.precipitation}mm</span>}
                              {day.windMax > 20 && <span className="text-[10px] text-gray-400">💨{day.windMax}</span>}
                            </div>
                          </div>
                        </div>
                        {hasHazard && (
                          <div className="mt-1.5 border-t border-gray-200/60 pt-1.5">
                            {hazards.map((h, i) => (
                              <p key={i} className="text-[11px] font-bold text-red-700">
                                {h.icon} {h.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


export default WeatherWidget
