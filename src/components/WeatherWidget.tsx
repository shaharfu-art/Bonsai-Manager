import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../contexts/AuthContext'

interface WeatherData {
  temp: number
  icon: string
  tip: string
  bgClass: string
  textClass: string
}

function getWeatherInfo(temp: number, isRtl: boolean): { icon: string; tip: string; bgClass: string; textClass: string } {
  if (temp < 5) return {
    icon: '🥶',
    tip: isRtl ? 'הגן מכפור!' : 'Frost risk!',
    bgClass: 'bg-blue-100/90',
    textClass: 'text-blue-800',
  }
  if (temp < 15) return {
    icon: '🌥️',
    tip: isRtl ? 'קריר, הפחת השקיה' : 'Cool, reduce watering',
    bgClass: 'bg-sky-100/90',
    textClass: 'text-sky-800',
  }
  if (temp <= 25) return {
    icon: '🌤️',
    tip: isRtl ? 'מושלם לבונסאי' : 'Perfect for bonsai',
    bgClass: 'bg-green-100/90',
    textClass: 'text-green-800',
  }
  if (temp <= 35) return {
    icon: '☀️',
    tip: isRtl ? 'חם, השקה בבוקר' : 'Hot, water in AM',
    bgClass: 'bg-orange-100/90',
    textClass: 'text-orange-800',
  }
  return {
    icon: '🔥',
    tip: isRtl ? 'חמסין! העבר לצל' : 'Heatwave! Move to shade',
    bgClass: 'bg-red-100/90',
    textClass: 'text-red-800',
  }
}

const CACHE_KEY = 'weather-cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const WeatherWidget: React.FC = () => {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const isRtl = i18n.language === 'he'
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
            const info = getWeatherInfo(data.temp, isRtl)
            setWeather({ temp: data.temp, ...info })
            return
          }
        }
      } catch { /* ignore */ }

      // Get user location from DB
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('trees_lat, trees_lng')
        .eq('id', user.id)
        .single()

      if (!profile?.trees_lat || !profile?.trees_lng) return

      // Fetch from Open-Meteo (free, no key)
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${profile.trees_lat}&longitude=${profile.trees_lng}&current=temperature_2m&timezone=auto`
        )
        const data = await res.json()
        const temp = Math.round(data.current?.temperature_2m ?? 0)
        const info = getWeatherInfo(temp, isRtl)
        setWeather({ temp, ...info })

        // Cache it
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: { temp },
          timestamp: Date.now(),
        }))
      } catch { /* silently fail */ }
    }

    fetchWeather()
  }, [user, isRtl])

  if (!weather) return null

  return (
    <div className={`${weather.bgClass} rounded-full px-4 py-1.5 flex items-center gap-2 ${weather.textClass} text-sm font-medium shadow-sm`}>
      <span className="text-base">{weather.icon}</span>
      <span className="font-bold">{weather.temp}°</span>
      <span className="hidden sm:inline text-xs opacity-80">{weather.tip}</span>
    </div>
  )
}

export default WeatherWidget
