import { useState, useEffect, useCallback } from 'react'
import { Thermometer, Droplets, Wind, Gauge, CloudRain, RefreshCw, ExternalLink } from 'lucide-react'

// Gingoog City coordinates (same as used on the GIS Map)
const LAT = 8.8231
const LNG = 125.1109

const WEATHER_API = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
  `&timezone=Asia%2FManila&forecast_days=5`

// WMO weather codes → icon + human label
// https://open-meteo.com/en/docs (weather_code table)
const WEATHER_CODES = {
  0:  { icon: '☀️', label: 'Clear Sky' },
  1:  { icon: '🌤️', label: 'Mostly Sunny' },
  2:  { icon: '⛅', label: 'Partly Cloudy' },
  3:  { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Foggy' },
  48: { icon: '🌫️', label: 'Foggy' },
  51: { icon: '🌦️', label: 'Light Drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌦️', label: 'Heavy Drizzle' },
  56: { icon: '🌦️', label: 'Freezing Drizzle' },
  57: { icon: '🌦️', label: 'Freezing Drizzle' },
  61: { icon: '🌧️', label: 'Light Rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy Rain' },
  66: { icon: '🌧️', label: 'Freezing Rain' },
  67: { icon: '🌧️', label: 'Freezing Rain' },
  71: { icon: '❄️', label: 'Light Snow' },
  73: { icon: '❄️', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy Snow' },
  77: { icon: '❄️', label: 'Snow Grains' },
  80: { icon: '🌦️', label: 'Light Showers' },
  81: { icon: '🌧️', label: 'Rain Showers' },
  82: { icon: '🌧️', label: 'Heavy Showers' },
  85: { icon: '❄️', label: 'Snow Showers' },
  86: { icon: '❄️', label: 'Snow Showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm w/ Hail' },
  99: { icon: '⛈️', label: 'Severe Thunderstorm' },
}
const weatherInfo = (code) => WEATHER_CODES[code] || { icon: '🌡️', label: 'Unknown' }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WeatherCard = ({ icon: Icon, label, value, unit, color }) => (
  <div className="card p-4 flex flex-col items-center text-center gap-2">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xl font-bold text-gray-800 whitespace-nowrap">{value}<span className="text-sm font-normal text-gray-500 ml-1">{unit}</span></p>
      <p className="text-xs text-gray-500 whitespace-nowrap">{label}</p>
    </div>
  </div>
)

export default function WeatherPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFetched, setLastFetched] = useState(null)

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(WEATHER_API)
      if (!res.ok) throw new Error('Weather service unavailable')
      const json = await res.json()
      setData(json)
      setLastFetched(new Date())
    } catch (err) {
      setError('Could not load live weather data. Check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  if (loading && !data) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center text-gray-400">
        <RefreshCw size={24} className="animate-spin mb-3" />
        Loading live weather data…
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center text-center">
        <p className="text-red-600 font-medium mb-2">{error}</p>
        <button onClick={fetchWeather} className="btn-primary mt-2">Try Again</button>
      </div>
    )
  }

  const current = data.current
  const currentInfo = weatherInfo(current.weather_code)
  const daily = data.daily

  return (
    <div className="space-y-6">
      {/* Current conditions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gingoog City</h2>
            <p className="text-gray-500 text-sm">
              Last updated: {lastFetched?.toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-6xl">{currentInfo.icon}</p>
              <p className="text-sm text-gray-600 mt-1">{currentInfo.label}</p>
            </div>
            <button
              onClick={fetchWeather}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <WeatherCard icon={Thermometer} label="Temperature"   value={Math.round(current.temperature_2m)}         unit="°C"   color="bg-orange-500" />
          <WeatherCard icon={Thermometer} label="Feels Like"    value={Math.round(current.apparent_temperature)}   unit="°C"   color="bg-red-400" />
          <WeatherCard icon={Droplets}    label="Humidity"      value={Math.round(current.relative_humidity_2m)}   unit="%"    color="bg-blue-500" />
          <WeatherCard icon={CloudRain}   label="Rainfall"      value={current.precipitation}                      unit="mm"   color="bg-indigo-500" />
          <WeatherCard icon={Wind}        label="Wind Speed"    value={Math.round(current.wind_speed_10m)}         unit="km/h" color="bg-teal-500" />
          <WeatherCard icon={Gauge}       label="Pressure"      value={Math.round(current.surface_pressure)}       unit="hPa"  color="bg-violet-500" />
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-4">5-Day Forecast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {daily.time.map((dateStr, i) => {
            const info = weatherInfo(daily.weather_code[i])
            const label = i === 0 ? 'Today' : DAY_NAMES[new Date(dateStr).getDay()]
            return (
              <div key={dateStr} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
                <p className="text-3xl mb-2">{info.icon}</p>
                <p className="text-sm font-bold text-gray-800">
                  {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Droplets size={12} className="text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">{daily.precipitation_probability_max[i]}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advisory — links to the real PAGASA site instead of showing invented alerts */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <h3 className="font-semibold text-orange-800 mb-2">⚠️ Official Weather Advisories</h3>
        <p className="text-sm text-orange-700 mb-3">
          For active tropical cyclone bulletins, rainfall warnings, and other official advisories affecting
          Gingoog City and Misamis Oriental, check PAGASA directly.
        </p>
        <a
          href="https://www.pagasa.dost.gov.ph/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-800 hover:text-orange-900"
        >
          Visit PAGASA.dost.gov.ph <ExternalLink size={14} />
        </a>
      </div>

      <p className="text-center text-xs text-gray-400">
        Live weather data from Open-Meteo.com · Auto-refreshes every 10 minutes
      </p>
    </div>
  )
}