import { useState, useEffect } from 'react'
import { automationAPI } from '../services/api'
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer } from 'lucide-react'

// Weather code to icon mapping (WMO codes)
const getWeatherIcon = (code) => {
  if (code === 0) return <Sun className="w-6 h-6 text-yellow-400" />
  if (code <= 3) return <Cloud className="w-6 h-6 text-gray-400" />
  if (code <= 49) return <Cloud className="w-6 h-6 text-gray-500" />
  if (code <= 59) return <CloudRain className="w-6 h-6 text-blue-400" />
  if (code <= 69) return <CloudRain className="w-6 h-6 text-blue-500" />
  if (code <= 79) return <CloudRain className="w-6 h-6 text-gray-400" />
  if (code <= 84) return <CloudRain className="w-6 h-6 text-blue-500" />
  if (code <= 86) return <CloudRain className="w-6 h-6 text-gray-400" />
  if (code >= 95) return <CloudRain className="w-6 h-6 text-purple-500" />
  return <Cloud className="w-6 h-6 text-gray-400" />
}

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️'
  if (code <= 3) return '🌤️'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '🌨️'
  if (code <= 84) return '⛈️'
  if (code <= 86) return '🌨️'
  if (code >= 95) return '⛈️'
  return '☁️'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

export default function WeatherForecast({ farmId }) {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentWeather, setCurrentWeather] = useState(null)

  useEffect(() => {
    loadForecast()
  }, [farmId])

  const loadForecast = async () => {
    try {
      setLoading(true)
      const response = await automationAPI.getWeatherForecast(farmId)
      setForecast(response.data.forecast)
      setCurrentWeather(response.data.current)
    } catch (error) {
      console.error('Error loading forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span>Loading weather data...</span>
        </div>
      </div>
    )
  }

  if (!forecast || !forecast.daily) {
    return (
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="text-center py-4">No forecast data available</div>
      </div>
    )
  }

  const daily = forecast.daily
  const days = daily.time || []
  const maxTemps = daily.temperature_2m_max || []
  const minTemps = daily.temperature_2m_min || []
  const weatherCodes = daily.weather_code || []
  const precipitation = daily.precipitation_sum || []
  const windSpeed = daily.wind_speed_10m_max || []

  // Current weather display
  const currentTemp = currentWeather?.temperature || maxTemps[0] || 0

  return (
    <div className="space-y-6">
      {/* Current Weather - Apple Style */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl border border-blue-400/20">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-light mb-2">Today</h2>
            <div className="text-7xl font-thin mb-2">{Math.round(currentTemp)}°</div>
            <p className="text-xl font-light opacity-90">
              {currentWeather?.rain > 0 ? 'Rain' : currentWeather?.clouds > 50 ? 'Cloudy' : 'Clear'}
            </p>
          </div>
          <div className="text-6xl">
            {getWeatherEmoji(weatherCodes[0] || 0)}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
          <div>
            <div className="text-sm opacity-80 mb-1">Wind</div>
            <div className="text-lg font-medium">{windSpeed[0]?.toFixed(0) || 0} km/h</div>
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">Rain</div>
            <div className="text-lg font-medium">{precipitation[0]?.toFixed(1) || 0} mm</div>
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">Humidity</div>
            <div className="text-lg font-medium">{currentWeather?.clouds?.toFixed(0) || 0}%</div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">7-Day Forecast</h3>
          <span className="text-sm text-gray-500">Extended outlook</span>
        </div>
        <div className="space-y-4">
          {days.slice(0, 7).map((day, index) => {
            const maxTemp = maxTemps[index]
            const minTemp = minTemps[index]
            const weatherCode = weatherCodes[index] || 0
            const rain = precipitation[index] || 0
            const wind = windSpeed[index] || 0

            return (
              <div
                key={index}
                className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-sm font-medium text-gray-600 w-24">
                    {formatDate(day)}
                  </div>
                  <div className="text-2xl">
                    {getWeatherEmoji(weatherCode)}
                  </div>
                  {rain > 0 && (
                    <div className="flex items-center gap-1 text-blue-500 text-sm">
                      <Droplets className="w-4 h-4" />
                      <span>{rain.toFixed(1)}mm</span>
                    </div>
                  )}
                  {wind > 20 && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Wind className="w-4 h-4" />
                      <span>{wind.toFixed(0)}km/h</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{Math.round(minTemp)}°</span>
                  <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                      style={{
                        width: `${Math.min(100, ((maxTemp - minTemp) / 30) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-gray-800 font-medium w-10 text-right">
                    {Math.round(maxTemp)}°
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

