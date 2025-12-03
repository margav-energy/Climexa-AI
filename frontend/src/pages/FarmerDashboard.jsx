import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { farmerAPI, automationAPI } from '../services/api'
import { 
  Droplet, 
  Battery, 
  Sun, 
  Cloud, 
  Thermometer, 
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import WeatherForecast from '../components/WeatherForecast'
import AISuggestions from '../components/AISuggestions'
import HourlyForecastGraph from '../components/HourlyForecastGraph'

export default function FarmerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [farms, setFarms] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [weatherForecast, setWeatherForecast] = useState(null)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    if (selectedFarm) {
      loadDashboard(selectedFarm.id)
      loadWeatherForecast(selectedFarm.id)
      const interval = setInterval(() => {
        loadDashboard(selectedFarm.id)
        loadWeatherForecast(selectedFarm.id)
      }, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [selectedFarm])

  const loadWeatherForecast = async (farmId) => {
    try {
      const response = await automationAPI.getWeatherForecast(farmId)
      setWeatherForecast(response.data)
    } catch (error) {
      console.error('Error loading weather forecast:', error)
    }
  }

  const loadFarms = async () => {
    try {
      const response = await farmerAPI.getFarms()
      console.log('Farms API full response:', response)
      console.log('Farms API response data:', response.data)
      console.log('Response status:', response.status)
      
      // Handle paginated response or direct array
      let farmsData = []
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          farmsData = response.data
        } else if (response.data.results && Array.isArray(response.data.results)) {
          farmsData = response.data.results
        } else {
          console.warn('Unexpected response format:', response.data)
          farmsData = []
        }
      } else {
        console.warn('Response data is empty or undefined')
        farmsData = []
      }
      
      setFarms(farmsData)
      if (farmsData.length > 0) {
        setSelectedFarm(farmsData[0])
      } else {
        console.log('No farms found for this user')
      }
    } catch (error) {
      console.error('Error loading farms:', error)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      console.error('Error message:', error.message)
      setFarms([]) // Ensure farms is always an array
    } finally {
      setLoading(false)
    }
  }

  const loadDashboard = async (farmId) => {
    try {
      const response = await farmerAPI.getFarmDashboard(farmId)
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  const handleRefresh = async () => {
    if (!selectedFarm) return
    setRefreshing(true)
    try {
      // This calls Open Meteo API and updates farm status
      await automationAPI.updateStatus(selectedFarm.id)
      await loadDashboard(selectedFarm.id)
      await loadWeatherForecast(selectedFarm.id)
    } catch (error) {
      console.error('Error refreshing (Open Meteo update):', error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-climexa-text">Loading...</div>
      </div>
    )
  }

  if (!Array.isArray(farms) || farms.length === 0) {
    return (
      <div className="min-h-screen bg-climexa-background p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-climexa-text mb-4">No Farms Found</h2>
          <p className="text-climexa-text">Please contact Climexa to set up your farm.</p>
        </div>
      </div>
    )
  }

  const status = dashboardData?.status
  const farm = dashboardData?.farm

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-climexa-primary to-climexa-accent rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Climexa AI</h1>
              <p className="text-xs text-gray-500">Smart Farming Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {farms.length > 1 && (
              <select
                value={selectedFarm?.id || ''}
                onChange={(e) => {
                  const farm = farms.find(f => f.id === parseInt(e.target.value))
                  setSelectedFarm(farm)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                {Array.isArray(farms) && farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">Farmer</p>
            </div>
            <button
              onClick={() => navigate('/simulation')}
              className="px-4 py-2 text-sm font-medium text-climexa-primary hover:bg-climexa-primary/10 rounded-lg transition-colors border border-climexa-primary"
            >
              Simulation
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Farm Overview</h2>
          <p className="text-gray-600">Monitor your farm's performance and weather conditions</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Battery Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Battery Level</h3>
              <div className="p-2 bg-green-50 rounded-lg">
                <Battery className="w-5 h-5 text-climexa-accent" />
              </div>
            </div>
            <div className="flex items-baseline mb-3">
              <span className="text-4xl font-bold text-gray-900">
                {status?.battery_level || 0}
              </span>
              <span className="text-lg text-gray-500 ml-1">%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  (status?.battery_level || 0) > 50 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  (status?.battery_level || 0) > 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                style={{ width: `${status?.battery_level || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {status?.battery_kwh || 0} kWh stored
            </p>
          </div>

          {/* PV Generation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PV Generation</h3>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Sun className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <div className="flex items-baseline mb-2">
              <span className="text-4xl font-bold text-gray-900">
                {status?.pv_output_kw || 0}
              </span>
              <span className="text-lg text-gray-500 ml-1">kW</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              GTI: {status?.gti || 0} W/m²
            </p>
          </div>

          {/* Irrigation Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Irrigation</h3>
              <div className={`p-2 rounded-lg ${status?.irrigation_on ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <Droplet className={`w-5 h-5 ${status?.irrigation_on ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
            </div>
            <div className="flex items-baseline mb-2">
              <span className={`text-4xl font-bold ${status?.irrigation_on ? 'text-blue-600' : 'text-gray-400'}`}>
                {status?.irrigation_on ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {status?.irrigation_reason || 'No status'}
            </p>
          </div>

          {/* Weather */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Weather</h3>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Cloud className="w-5 h-5 text-climexa-accent" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Temperature</span>
                <span className="text-sm font-semibold text-gray-900">{status?.current_temperature || weatherForecast?.current?.temperature || 'N/A'}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Precipitation</span>
                <span className="text-sm font-semibold text-gray-900">{status?.current_rain || weatherForecast?.current?.rain || 0} mm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cloud Cover</span>
                <span className="text-sm font-semibold text-gray-900">{status?.current_clouds || weatherForecast?.current?.clouds || 0}%</span>
              </div>
              {weatherForecast?.forecast_tomorrow && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tomorrow</p>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Clouds</span>
                    <span className="font-semibold text-gray-900">{weatherForecast.forecast_tomorrow.clouds}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Rain</span>
                    <span className="font-semibold text-gray-900">{weatherForecast.forecast_tomorrow.rain} mm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Average Soil Moisture */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Soil Moisture</h3>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Droplet className={`w-5 h-5 ${
                  (dashboardData?.average_soil_moisture || 0) < 30 ? 'text-red-500' :
                  (dashboardData?.average_soil_moisture || 0) < 50 ? 'text-yellow-500' :
                  'text-green-500'
                }`} />
              </div>
            </div>
            <div className="flex items-baseline mb-2">
              <span className={`text-4xl font-bold ${
                (dashboardData?.average_soil_moisture || 0) < 30 ? 'text-red-600' :
                (dashboardData?.average_soil_moisture || 0) < 50 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {dashboardData?.average_soil_moisture !== null && dashboardData?.average_soil_moisture !== undefined 
                  ? dashboardData.average_soil_moisture.toFixed(1)
                  : status?.current_soil_moisture?.toFixed(1) || 'N/A'}
              </span>
              <span className="text-lg text-gray-500 ml-1">%</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Average from all sensors (300cm depth)
              {dashboardData?.average_soil_moisture !== null && dashboardData?.average_soil_moisture !== undefined && (
                <span className={`ml-2 ${
                  dashboardData.average_soil_moisture < 30 ? 'text-red-600' :
                  dashboardData.average_soil_moisture < 50 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {dashboardData.average_soil_moisture < 30 ? 'Critical' :
                   dashboardData.average_soil_moisture < 50 ? 'Low' :
                   'Optimal'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* AI Suggestions */}
        {selectedFarm && (
          <div className="mb-8">
            <AISuggestions farmId={selectedFarm.id} />
          </div>
        )}

        {/* Weather Forecast - Apple Style */}
        {selectedFarm && (
          <div className="mb-8">
            <WeatherForecast farmId={selectedFarm.id} />
          </div>
        )}

        {/* Hourly Forecast Graph */}
        {selectedFarm && (
          <div className="mb-8">
            <HourlyForecastGraph farmId={selectedFarm.id} />
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
            <p className="text-sm text-gray-500">Last updated: {status?.last_updated ? new Date(status.last_updated).toLocaleString() : 'Never'}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-climexa-primary text-white px-5 py-2.5 rounded-lg hover:bg-climexa-accent transition-all disabled:opacity-50 shadow-sm hover:shadow-md font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        {/* Sensor Readings */}
        {dashboardData?.recent_sensor_readings && dashboardData.recent_sensor_readings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Recent Sensor Readings</h2>
                <p className="text-sm text-gray-500">Latest data from your farm sensors</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sensor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboardData.recent_sensor_readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{reading.sensor_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{reading.sensor_type}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {reading.value} <span className="text-gray-500">{reading.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(reading.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Farm Details */}
        {farm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Farm Details</h2>
              <p className="text-sm text-gray-500">System configuration and specifications</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">System Size</p>
                <p className="text-2xl font-bold text-gray-900">{farm.system_size_kw} <span className="text-lg text-gray-500">kW</span></p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Battery Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{farm.battery_capacity_kwh} <span className="text-lg text-gray-500">kWh</span></p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Panel Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{(farm.panel_efficiency * 100).toFixed(0)}<span className="text-lg text-gray-500">%</span></p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</p>
                <p className="text-sm font-semibold text-gray-900">
                  {farm.latitude ? Number(farm.latitude).toFixed(4) : 'N/A'}, {farm.longitude ? Number(farm.longitude).toFixed(4) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

