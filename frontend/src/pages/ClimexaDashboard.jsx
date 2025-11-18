import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { climexaAPI, automationAPI } from '../services/api'
import { 
  Battery, 
  Droplet, 
  Sun, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Sprout as FarmIcon
} from 'lucide-react'

export default function ClimexaDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [farmDetail, setFarmDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    loadDashboard()
    loadAlerts()
    const interval = setInterval(() => {
      loadDashboard()
      loadAlerts()
    }, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedFarm) {
      loadFarmDetail(selectedFarm.id)
    }
  }, [selectedFarm])

  const loadDashboard = async () => {
    try {
      const response = await climexaAPI.getDashboard()
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await climexaAPI.getAlerts()
      setAlerts(response.data.alerts || [])
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const loadFarmDetail = async (farmId) => {
    try {
      const response = await climexaAPI.getFarmDetail(farmId)
      setFarmDetail(response.data)
    } catch (error) {
      console.error('Error loading farm detail:', error)
    }
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await automationAPI.updateAllStatuses()
      await loadDashboard()
      await loadAlerts()
    } catch (error) {
      console.error('Error refreshing:', error)
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

  const summary = dashboardData?.summary || {}
  const farms = dashboardData?.farms || []

  return (
    <div className="min-h-screen bg-climexa-background">
      {/* Header */}
      <header className="bg-climexa-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Climexa AI</h1>
              <p className="text-sm opacity-90">Company Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh All
              </button>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-climexa-text">Total Farms</h3>
              <FarmIcon className="w-5 h-5 text-climexa-accent" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-climexa-primary">
                {summary.total_farms || 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-climexa-text">Active Irrigation</h3>
              <Droplet className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-climexa-primary">
                {summary.active_irrigation || 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-climexa-text">Avg Battery Level</h3>
              <Battery className="w-5 h-5 text-climexa-accent" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-climexa-primary">
                {summary.average_battery_level || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-climexa-primary">Alerts</h2>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-climexa-text">{alert.farm_name}</h3>
                      {alert.alerts.map((a, i) => (
                        <p key={i} className="text-sm text-gray-700 mt-1">
                          <span className={`font-medium ${
                            a.severity === 'high' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {a.type.replace('_', ' ').toUpperCase()}
                          </span>: {a.message}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const farm = farms.find(f => f.id === alert.farm_id)
                        if (farm) setSelectedFarm(farm)
                      }}
                      className="text-climexa-primary hover:underline text-sm"
                    >
                      View Farm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farms List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-climexa-primary">All Farms</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Farm Name</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Farmer</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Battery</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Irrigation</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-climexa-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr
                    key={farm.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFarm(farm)}
                  >
                    <td className="py-4 px-6 text-sm font-medium">{farm.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{farm.farmer_name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              farm.battery_level < 20 ? 'bg-red-500' :
                              farm.battery_level < 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${farm.battery_level || 0}%` }}
                          />
                        </div>
                        <span className="text-sm">{farm.battery_level || 0}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        farm.irrigation_on
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {farm.irrigation_on ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        farm.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {farm.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFarm(farm)
                        }}
                        className="text-climexa-primary hover:underline text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Farm Detail Modal */}
        {selectedFarm && farmDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-2xl font-bold text-climexa-primary">
                  {farmDetail.farm?.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedFarm(null)
                    setFarmDetail(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Battery Level</p>
                    <p className="text-2xl font-bold text-climexa-primary">
                      {farmDetail.status?.battery_level || 0}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">PV Output</p>
                    <p className="text-2xl font-bold text-climexa-primary">
                      {farmDetail.status?.pv_output_kw || 0} kW
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Irrigation</p>
                    <p className="text-2xl font-bold text-climexa-primary">
                      {farmDetail.status?.irrigation_on ? 'ON' : 'OFF'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="text-2xl font-bold text-climexa-primary">
                      {farmDetail.status?.current_temperature || 'N/A'}°C
                    </p>
                  </div>
                </div>

                {farmDetail.status?.irrigation_reason && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-sm text-gray-700">
                      <strong>Irrigation Status:</strong> {farmDetail.status.irrigation_reason}
                    </p>
                  </div>
                )}

                {farmDetail.recent_sensor_readings && farmDetail.recent_sensor_readings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-climexa-text mb-4">Recent Sensor Readings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-4">Sensor</th>
                            <th className="text-left py-2 px-4">Type</th>
                            <th className="text-left py-2 px-4">Value</th>
                            <th className="text-left py-2 px-4">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {farmDetail.recent_sensor_readings.map((reading) => (
                            <tr key={reading.id} className="border-b">
                              <td className="py-2 px-4">{reading.sensor_name}</td>
                              <td className="py-2 px-4 text-gray-600">{reading.sensor_type}</td>
                              <td className="py-2 px-4 font-medium">
                                {reading.value} {reading.unit}
                              </td>
                              <td className="py-2 px-4 text-gray-500">
                                {new Date(reading.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

