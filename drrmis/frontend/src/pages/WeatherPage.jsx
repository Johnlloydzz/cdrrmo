import { Thermometer, Droplets, Wind, Eye, Gauge, CloudRain } from 'lucide-react'

const current = {
  temp: 28, feelsLike: 31, humidity: 88, rainfall: 42,
  windSpeed: 25, windDir: 'NE', pressure: 1008, visibility: 8,
  condition: 'Heavy Rain', icon: '🌧️',
}

const forecast = [
  { day: 'Today',    icon: '🌧️', high: 28, low: 24, rain: 90 },
  { day: 'Tuesday',  icon: '⛈️', high: 27, low: 23, rain: 80 },
  { day: 'Wednesday',icon: '🌦️', high: 29, low: 24, rain: 60 },
  { day: 'Thursday', icon: '⛅', high: 30, low: 25, rain: 30 },
  { day: 'Friday',   icon: '☀️', high: 32, low: 26, rain: 10 },
]

const WeatherCard = ({ icon: Icon, label, value, unit, color }) => (
  <div className="card p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xl font-bold text-gray-800">{value}<span className="text-sm font-normal text-gray-500 ml-1">{unit}</span></p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
)

export default function WeatherPage() {
  return (
    <div className="space-y-6">
      {/* Current conditions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gingoog City</h2>
            <p className="text-gray-500 text-sm">Last updated: July 13, 2026 — 08:00 AM</p>
          </div>
          <div className="text-center">
            <p className="text-6xl">{current.icon}</p>
            <p className="text-sm text-gray-600 mt-1">{current.condition}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <WeatherCard icon={Thermometer} label="Temperature"   value={current.temp}       unit="°C"   color="bg-orange-500" />
          <WeatherCard icon={Thermometer} label="Feels Like"    value={current.feelsLike}  unit="°C"   color="bg-red-400" />
          <WeatherCard icon={Droplets}    label="Humidity"      value={current.humidity}   unit="%"    color="bg-blue-500" />
          <WeatherCard icon={CloudRain}   label="Rainfall"      value={current.rainfall}   unit="mm"   color="bg-indigo-500" />
          <WeatherCard icon={Wind}        label="Wind Speed"    value={current.windSpeed}  unit="km/h" color="bg-teal-500" />
          <WeatherCard icon={Gauge}       label="Pressure"      value={current.pressure}   unit="hPa"  color="bg-violet-500" />
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-4">5-Day Forecast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {forecast.map(f => (
            <div key={f.day} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-600 mb-2">{f.day}</p>
              <p className="text-3xl mb-2">{f.icon}</p>
              <p className="text-sm font-bold text-gray-800">{f.high}° / {f.low}°</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Droplets size={12} className="text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">{f.rain}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <h3 className="font-semibold text-orange-800 mb-2">⚠️ PAGASA Weather Advisory</h3>
        <p className="text-sm text-orange-700">
          Tropical Depression DOMENG is estimated at 380 km east of Surigao City, moving WNW at 15 km/h.
          Residents in low-lying and flood-prone areas are advised to evacuate to safer ground.
          RSMC Rainfall Warning: Orange (moderate to heavy rainfall) in effect for Gingoog City.
        </p>
      </div>
    </div>
  )
}
