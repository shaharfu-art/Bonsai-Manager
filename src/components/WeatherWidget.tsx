import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface WeatherData {
  temp: number
  icon: string
  isDay: boolean
  city: string
  description: string
}

// Weather codes from Open-Meteo → icon + description
function getWeatherIcon(code: number, isDay: boolean): { icon: string; desc: string } {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', desc: isDay ? 'clear' : 'clear night' }
  if (code <= 3) return { icon: isDay ? '⛅' : '☁️', desc: 'partly cloudy' }
  if (code <= 48) return { icon: '🌫️', desc: 'foggy' }
  if (code <= 57) return { icon: '🌦️', desc: 'drizzle' }
  if (code <= 67) return { icon: '🌧️', desc: 'rain' }
  if (code <= 77) return { icon: '❄️', desc: 'snow' }
  if (code <= 82) return { icon: '🌧️', desc: 'heavy rain' }
  if (code <= 86) return { icon: '🌨️', desc: 'heavy snow' }
  if (code >= 95) return { icon: '⛈️', desc: 'thunderstorm' }
  return { icon: isDay ? '🌤️' : '🌙', desc: '' }
}

const CACHE_KEY = 'weather-cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const WeatherWidget: React.FC = () => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchWeather = async () => {
      // Check cache
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL) {
            setWeather(data)
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

      if (!profile?.trees_lat || !profile?.trees_lng) return

      // Fetch from Open-Meteo
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${profile.trees_lat}&longitude=${profile.trees_lng}&current=temperature_2m,is_day,weather_code&timezone=auto`
        )
        const data = await res.json()
        const current = data.current
        const temp = Math.round(current?.temperature_2m ?? 0)
        const isDay = current?.is_day === 1
        const weatherCode = current?.weather_code ?? 0
        const { icon } = getWeatherIcon(weatherCode, isDay)

        const weatherData: WeatherData = {
          temp,
          icon,
          isDay,
          city: profile.trees_city || '',
          description: '',
        }
        setWeather(weatherData)

        // Cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: weatherData,
          timestamp: Date.now(),
        }))
      } catch { /* silently fail */ }
    }

    fetchWeather()
  }, [user])

  if (!weather) return null

  // Dynamic gradient based on day/night + temperature
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

  return (
    <div className={`${bgGradient} rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-white shadow-md min-w-[100px]`}>
      <span className="text-2xl leading-none drop-shadow">{weather.icon}</span>
      <div className="flex flex-col items-start">
        <span className="text-base font-bold leading-tight drop-shadow">{weather.temp}°</span>
        {weather.city && (
          <span className="text-[9px] opacity-80 leading-tight">{weather.city}</span>
        )}
      </div>
    </div>
  )
}

export default WeatherWidget
