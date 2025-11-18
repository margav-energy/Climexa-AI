import { useState, useEffect } from 'react'
import { automationAPI, farmerAPI } from '../services/api'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar
} from 'recharts'
import { Thermometer, Droplets, Sun, Cloud } from 'lucide-react'

const formatHour = (timeString) => {
  const date = new Date(timeString)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

const formatDate = (timeString) => {
  const date = new Date(timeString)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[200px]">
        <p className="font-semibold text-gray-900 mb-2">{formatDate(label)}</p>
        <p className="text-sm text-gray-600 mb-3">{formatHour(label)}</p>
        <div className="space-y-2">
          {data.temperature !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">Temperature</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{data.temperature}°C</span>
            </div>
          )}
          {data.gti !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">GTI</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{data.gti} W/m²</span>
            </div>
          )}
          {data.pv_output !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">PV Output</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{data.pv_output} kW</span>
            </div>
          )}
          {data.precipitation !== undefined && data.precipitation > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Rain</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{data.precipitation} mm</span>
            </div>
          )}
          {data.cloud_cover !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Clouds</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{data.cloud_cover}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export default function HourlyForecastGraph({ farmId }) {
  const [forecast, setForecast] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedHour, setSelectedHour] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  useEffect(() => {
    loadForecast()
    loadFarmData()
  }, [farmId])

  const loadForecast = async () => {
    try {
      setLoading(true)
      const response = await automationAPI.getWeatherForecast(farmId)
      setForecast(response.data.forecast)
    } catch (error) {
      console.error('Error loading forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFarmData = async () => {
    try {
      const response = await farmerAPI.getFarmDashboard(farmId)
      if (response.data.farm) {
        setFarmData(response.data.farm)
      }
    } catch (error) {
      console.error('Error loading farm data:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="animate-pulse text-gray-400">Loading hourly forecast...</div>
      </div>
    )
  }

  if (!forecast || !forecast.hourly) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="text-gray-500">No hourly forecast data available</div>
      </div>
    )
  }

  const hourly = forecast.hourly
  const times = hourly.time || []
  const temperatures = hourly.temperature_2m || []
  const gtiValues = hourly.global_tilted_irradiance || []
  const precipitation = hourly.precipitation || []
  const cloudCover = hourly.cloud_cover || []

  // Get farm data to calculate PV output
  const systemSizeKw = farmData?.system_size_kw || 130
  const panelEfficiency = farmData?.panel_efficiency || 0.18

  // Prepare chart data for 48 hours
  const chartData = times.slice(0, 48).map((time, index) => {
    const gti = gtiValues[index] || 0
    // Formula: kWh = GTI (W/m²) * panel_eff * system_kw / 1000
    const pvOutput = (gti * panelEfficiency * systemSizeKw) / 1000
    
    return {
      time,
      temperature: temperatures[index] || 0,
      gti: Math.round(gti * 10) / 10,
      pv_output: Math.round(pvOutput * 100) / 100,
      precipitation: precipitation[index] || 0,
      cloud_cover: cloudCover[index] || 0,
    }
  })

  const handleMouseMove = (e) => {
    if (e && e.activeTooltipIndex !== undefined) {
      setHoveredIndex(e.activeTooltipIndex)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">48-Hour Forecast</h3>
        <p className="text-sm text-gray-500">Drag or hover over the graph to see detailed forecast</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Temperature</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">GTI (Solar)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">PV Output</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Precipitation</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tickFormatter={formatHour}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            stroke="#f97316"
            fontSize={12}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'GTI (W/m²) / PV (kW)', angle: 90, position: 'insideRight' }}
            stroke="#eab308"
            fontSize={12}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
          />

          {/* Temperature line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            name="Temperature"
          />

          {/* GTI line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="gti"
            stroke="#eab308"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            name="GTI"
          />

          {/* PV Output line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pv_output"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            name="PV Output"
          />

          {/* Precipitation bars */}
          <Bar
            yAxisId="right"
            dataKey="precipitation"
            fill="#3b82f6"
            opacity={0.6}
            name="Precipitation"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {hoveredIndex !== null && chartData[hoveredIndex] && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Time</p>
              <p className="font-semibold text-gray-900">
                {formatDate(chartData[hoveredIndex].time)} {formatHour(chartData[hoveredIndex].time)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Temperature</p>
              <p className="font-semibold text-gray-900">{chartData[hoveredIndex].temperature}°C</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">GTI</p>
              <p className="font-semibold text-gray-900">{chartData[hoveredIndex].gti} W/m²</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">PV Output</p>
              <p className="font-semibold text-gray-900">{chartData[hoveredIndex].pv_output} kW</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

