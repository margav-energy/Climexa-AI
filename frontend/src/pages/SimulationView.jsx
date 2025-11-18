import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { automationAPI, farmerAPI } from '../services/api'
import { 
  Battery, 
  Sun, 
  Droplet, 
  Cloud, 
  Thermometer,
  Zap,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Gauge
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Simulate farm system running in real-time with soil moisture-based logic
const simulateHour = (currentData, hour) => {
  // Simulate solar curve (peak at noon, 0 at night)
  const hourOfDay = hour % 24
  const solarIntensity = Math.max(0, Math.sin((hourOfDay - 6) * Math.PI / 12) * 1000)
  
  // Simulate GTI based on time of day with reduced randomness for more consistent charging
  // Reduce randomness during peak hours to ensure better charging
  const baseGTI = solarIntensity
  const randomness = hourOfDay >= 10 && hourOfDay <= 15 ? 50 : 100 // Less randomness at peak
  const gti = Math.max(0, baseGTI + (Math.random() * randomness * 2 - randomness))
  
  // Calculate PV output
  const systemSizeKw = currentData.systemSizeKw || 130
  const panelEfficiency = currentData.panelEfficiency || 0.18
  const pvOutput = (gti * panelEfficiency * systemSizeKw) / 1000
  
  // Simulate temperature (warmer during day)
  const baseTemp = 20 + (hourOfDay > 6 && hourOfDay < 18 ? 10 : 0)
  const temperature = baseTemp + (Math.random() * 5 - 2.5)
  
  // Simulate clouds (less during peak sun)
  const clouds = hourOfDay > 10 && hourOfDay < 14 ? 
    Math.random() * 30 : Math.random() * 80
  
  // Simulate rain (occasional)
  const rain = Math.random() > 0.9 ? Math.random() * 5 : 0
  
  // Simulate soil moisture (decreases over time if no irrigation, increases with rain/irrigation)
  let soilMoisture = currentData.soilMoisture || 50
  if (rain > 0.5) {
    soilMoisture = Math.min(100, soilMoisture + rain * 2) // Rain increases moisture
  } else {
    // Moisture decreases naturally (evaporation, plant uptake)
    // But if irrigation is on, moisture increases more quickly
    const previousIrrigation = currentData.lastIrrigationOn || false
    if (previousIrrigation) {
      // Irrigation increases moisture more effectively during day
      const irrigationEffect = hourOfDay >= 6 && hourOfDay < 18 ? 2.0 : 1.0
      soilMoisture = Math.min(100, soilMoisture + irrigationEffect)
    } else {
      // Natural decrease varies by temperature and time of day
      const decreaseRate = 0.5 + (temperature > 25 ? 1 : 0) + (hourOfDay >= 10 && hourOfDay <= 15 ? 0.5 : 0)
      soilMoisture = Math.max(0, soilMoisture - decreaseRate)
    }
  }
  
  // Determine irrigation need based on soil moisture
  const SOIL_MOISTURE_LOW = 30
  const SOIL_MOISTURE_OPTIMAL = 50
  const irrigationNeeded = soilMoisture < SOIL_MOISTURE_OPTIMAL
  const irrigationCritical = soilMoisture < SOIL_MOISTURE_LOW
  
  // Calculate variable load based on time of day (Essential - Domestic)
  let domesticLoad = 1.0 // Base load
  if (22 <= hourOfDay || hourOfDay < 6) {
    domesticLoad = 0.5 // Night: minimal
  } else if (6 <= hourOfDay < 9) {
    domesticLoad = 1.5 // Morning: higher
  } else if (9 <= hourOfDay < 17) {
    domesticLoad = 1.0 // Day: moderate
  } else {
    domesticLoad = 1.3 // Evening: higher
  }
  
  // Determine irrigation status with refined logic
  let irrigationOn = false
  let irrigationReason = "Normal operation"
  let priority = "optional"
  const irrigationLoad = 2.0 // Critical load
  const MIN_BATTERY = 20
  const isPeakSolar = hourOfDay >= 10 && hourOfDay <= 15 // Define early for use in irrigation logic
  
  // Logic 1: If raining, no irrigation needed
  if (rain > 0.5) {
    irrigationOn = false
    irrigationReason = "Rain detected. Irrigation not needed."
    priority = "optional"
  }
  // Logic 2: If irrigation is needed (soil moisture low)
  else if (irrigationNeeded) {
    if (currentData.batteryLevel < MIN_BATTERY) {
      if (irrigationCritical) {
        // Logic: Battery is low AND soil moisture is low - keep irrigation ON (critical priority)
        irrigationOn = true
        // Reduce domestic load by 30% (keep 70% essential)
        domesticLoad = domesticLoad * 0.7
        irrigationReason = `Critical: Low soil moisture (${soilMoisture.toFixed(1)}%) and low battery (${currentData.batteryLevel.toFixed(1)}%). Irrigation maintained as critical priority.`
        priority = "critical"
      } else {
        // Check if we can charge to 20% in next hour (simplified forecast)
        // Estimate next hour PV (simplified - in real system would use forecast)
        const nextHourGTI = Math.max(0, solarIntensity + (Math.random() * 200 - 100))
        const nextHourPV = (nextHourGTI * panelEfficiency * systemSizeKw) / 1000
        const forecastNetPower = nextHourPV - domesticLoad
        const forecastBatteryChange = (forecastNetPower / currentData.batteryCapacity) * 100
        const forecastBatteryLevel = currentData.batteryLevel + forecastBatteryChange
        
        if (forecastBatteryLevel >= MIN_BATTERY) {
          irrigationOn = true
          irrigationReason = `Forecast shows battery can reach ${forecastBatteryLevel.toFixed(1)}% in next hour. Irrigation activated.`
          priority = "normal"
        } else {
          irrigationOn = false
          irrigationReason = `Battery low (${currentData.batteryLevel.toFixed(1)}%) and forecast shows insufficient charge. Irrigation paused.`
          priority = "normal"
        }
      }
    } else {
      // Battery sufficient
      if (clouds > 60) {
        if (irrigationCritical) {
          irrigationOn = true
          irrigationReason = `Critical: Low soil moisture (${soilMoisture.toFixed(1)}%) requires irrigation despite cloudy conditions.`
          priority = "critical"
        } else {
          irrigationOn = false
          irrigationReason = "Cloudy conditions. Conserving battery."
          priority = "normal"
        }
      } else {
        // Battery sufficient - allow irrigation
        // But during peak solar hours, prioritize battery charging if moisture is not critical
        if (isPeakSolar && !irrigationCritical && soilMoisture > 35) {
          // During peak hours, if moisture is not critical, allow battery to charge
          irrigationOn = false
          irrigationReason = `Peak solar hours. Soil moisture (${soilMoisture.toFixed(1)}%) acceptable. Prioritizing battery charging.`
          priority = "normal"
        } else {
          irrigationOn = true
          if (irrigationCritical) {
            irrigationReason = `Critical: Low soil moisture (${soilMoisture.toFixed(1)}%). Irrigation activated.`
            priority = "critical"
          } else {
            irrigationReason = `Soil moisture (${soilMoisture.toFixed(1)}%) below optimal. Irrigation activated.`
            priority = "normal"
          }
        }
      }
    }
  } else {
    irrigationOn = false
    irrigationReason = `Soil moisture (${soilMoisture.toFixed(1)}%) is adequate. Irrigation not needed.`
    priority = "optional"
  }
  
  // Non-essential loads (water treatment) - only if excess power
  const waterTreatmentLoad = 1.5
  let waterTreatmentOn = false
  const essentialCriticalLoad = domesticLoad + (irrigationOn ? irrigationLoad : 0)
  if (pvOutput > essentialCriticalLoad) {
    // Excess power available - can run water treatment
    const excessPower = pvOutput - essentialCriticalLoad
    waterTreatmentOn = excessPower >= waterTreatmentLoad * 0.5 // Run if at least 50% power available
  }
  
  // Calculate total load
  const totalLoad = essentialCriticalLoad + (waterTreatmentOn ? waterTreatmentLoad : 0)
  
  // Smart battery management:
  // - At peak hours (10:00-15:00), use solar directly, charge battery with excess
  // - At night/low solar, discharge battery
  // - Battery should have inverse relationship with solar
  // (isPeakSolar already defined above)
  
  // Calculate net power (PV output - total load)
  // netPower is in kW, which equals kWh per hour
  const netPower = pvOutput - totalLoad
  
  // Calculate battery change
  // netPower (kWh) / batteryCapacity (kWh) * 100 = percentage change
  // This gives us the percentage change in battery level per hour
  const batteryChangePercent = (netPower / currentData.batteryCapacity) * 100
  
  // Update battery level
  let newBatteryLevel = currentData.batteryLevel + batteryChangePercent
  newBatteryLevel = Math.max(0, Math.min(100, newBatteryLevel))
  
  // Calculate battery in kWh
  const newBatteryKwh = (newBatteryLevel / 100) * currentData.batteryCapacity
  
  // Ensure battery doesn't exceed capacity
  const maxBatteryKwh = currentData.batteryCapacity
  const actualBatteryKwh = Math.min(newBatteryKwh, maxBatteryKwh)
  const actualBatteryLevel = (actualBatteryKwh / maxBatteryKwh) * 100
  
  return {
    hour,
    hourOfDay,
    gti: Math.round(gti * 10) / 10,
    pvOutput: Math.round(pvOutput * 100) / 100,
    temperature: Math.round(temperature * 10) / 10,
    clouds: Math.round(clouds),
    rain: Math.round(rain * 10) / 10,
    soilMoisture: Math.round(soilMoisture * 10) / 10,
    batteryLevel: Math.round(actualBatteryLevel * 10) / 10,
    batteryKwh: Math.round(actualBatteryKwh * 10) / 10,
    lastIrrigationOn: irrigationOn, // Store for next iteration
    load: Math.round(totalLoad * 10) / 10,
    domesticLoad: Math.round(domesticLoad * 10) / 10,
    irrigationLoad: irrigationOn ? irrigationLoad : 0,
    waterTreatmentLoad: waterTreatmentOn ? waterTreatmentLoad : 0,
    irrigationOn,
    irrigationReason,
    priority,
    netPower: Math.round(netPower * 100) / 100,
    isPeakSolar,
    timestamp: new Date(Date.now() + hour * 3600000).toISOString()
  }
}

export default function SimulationView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [farms, setFarms] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [simulationData, setSimulationData] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1) // 1x, 2x, 5x speed
  const [currentHour, setCurrentHour] = useState(0)
  const [history, setHistory] = useState([])
  const intervalRef = useRef(null)

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    if (selectedFarm) {
      loadFarmData()
    }
  }, [selectedFarm])

  useEffect(() => {
    if (isRunning && selectedFarm) {
      intervalRef.current = setInterval(() => {
        runSimulation()
      }, 2000 / speed) // Update every 2 seconds (adjusted by speed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, speed, selectedFarm, simulationData])

  const loadFarms = async () => {
    try {
      const response = await farmerAPI.getFarms()
      const farmsData = response.data?.results || response.data || []
      setFarms(farmsData)
      if (farmsData.length > 0) {
        setSelectedFarm(farmsData[0])
      }
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const loadFarmData = async () => {
    if (!selectedFarm) return
    
    try {
      const response = await farmerAPI.getFarmDashboard(selectedFarm.id)
      const status = response.data.status
      const farm = response.data.farm
      
      setSimulationData({
        batteryLevel: parseFloat(status?.battery_level || 70),
        batteryCapacity: parseFloat(farm?.battery_capacity_kwh || 1320),
        systemSizeKw: parseFloat(farm?.system_size_kw || 130),
        panelEfficiency: parseFloat(farm?.panel_efficiency || 0.18),
        soilMoisture: parseFloat(status?.current_soil_moisture || 50),
        lastIrrigationOn: status?.irrigation_on || false,
      })
      
      // Initialize with current data
      const initial = simulateHour({
        batteryLevel: parseFloat(status?.battery_level || 70),
        batteryCapacity: parseFloat(farm?.battery_capacity_kwh || 1320),
        systemSizeKw: parseFloat(farm?.system_size_kw || 130),
        panelEfficiency: parseFloat(farm?.panel_efficiency || 0.18),
        soilMoisture: parseFloat(status?.current_soil_moisture || 50),
        lastIrrigationOn: status?.irrigation_on || false,
      }, 0)
      setHistory([initial])
    } catch (error) {
      console.error('Error loading farm data:', error)
    }
  }

  const runSimulation = () => {
    if (!simulationData) return
    
    const newHour = currentHour + 1
    const newData = simulateHour(simulationData, newHour)
    
    // Update simulation data with new battery level, soil moisture, and irrigation state
    setSimulationData(prev => ({
      ...prev,
      batteryLevel: newData.batteryLevel,
      soilMoisture: newData.soilMoisture,
      lastIrrigationOn: newData.lastIrrigationOn,
    }))
    
    setCurrentHour(newHour)
    setHistory(prev => [...prev.slice(-47), newData]) // Keep last 48 hours
  }

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setCurrentHour(0)
    setHistory([])
    loadFarmData()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const current = history[history.length - 1] || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-climexa-primary to-climexa-accent rounded-lg flex items-center justify-center shadow-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">System Simulation</h1>
              <p className="text-xs text-gray-500">Real-time farm system monitoring</p>
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
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => navigate('/farmer')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
            >
              Dashboard
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Simulation Controls */}
        <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 mb-8 transition-all ${
          isRunning ? 'border-green-500 bg-green-50/30' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">Live System Simulation</h2>
                {isRunning && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Running
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {selectedFarm?.name || 'No farm selected'} • Simulating hour {currentHour}
                {current.hourOfDay !== undefined && ` • ${current.hourOfDay}:00 (Day ${Math.floor(currentHour / 24) + 1})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                <span className="text-sm text-gray-600">Speed:</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                  disabled={isRunning}
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                </select>
              </div>
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 bg-green-500 text-white px-6 py-2.5 rounded-lg hover:bg-green-600 transition-colors font-medium shadow-sm"
                >
                  <Play className="w-4 h-4" />
                  Start Simulation
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {!selectedFarm ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Please select a farm to simulate</p>
          </div>
        ) : (
          <>
            {/* Real-time Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Battery */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Battery</h3>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Battery className={`w-5 h-5 ${current.batteryLevel > 50 ? 'text-green-500' : current.batteryLevel > 20 ? 'text-yellow-500' : 'text-red-500'}`} />
                  </div>
                </div>
                <div className="flex items-baseline mb-3">
                  <span className="text-4xl font-bold text-gray-900">
                    {current.batteryLevel?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-lg text-gray-500 ml-1">%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      current.batteryLevel > 50 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      current.batteryLevel > 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${current.batteryLevel || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {current.batteryKwh?.toFixed(1) || '0.0'} / {simulationData?.batteryCapacity || 1320} kWh
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
                    {current.pvOutput?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-lg text-gray-500 ml-1">kW</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  GTI: {current.gti || 0} W/m²
                </p>
              </div>

              {/* Irrigation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Irrigation</h3>
                  <div className={`p-2 rounded-lg ${current.irrigationOn ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <Droplet className={`w-5 h-5 ${current.irrigationOn ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
                  </div>
                </div>
                <div className="flex items-baseline mb-2">
                  <span className={`text-4xl font-bold ${current.irrigationOn ? 'text-blue-600' : 'text-gray-400'}`}>
                    {current.irrigationOn ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">
                    {current.irrigationReason || 'No status'}
                  </p>
                  {current.priority && (
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      current.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      current.priority === 'normal' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {current.priority} priority
                    </span>
                  )}
                </div>
              </div>

              {/* System Load */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">System Load</h3>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {current.load?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-lg text-gray-500 ml-1">kW</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Domestic: {current.domesticLoad?.toFixed(2) || '0.00'} kW • Net: {current.netPower > 0 ? '+' : ''}{current.netPower?.toFixed(2) || '0.00'} kW
                </p>
              </div>
            </div>

            {/* Weather & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Temperature</h3>
                  <Thermometer className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {current.temperature?.toFixed(1) || '0.0'}°C
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Cloud Cover</h3>
                  <Cloud className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {current.clouds || 0}%
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Precipitation</h3>
                  <Droplet className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {current.rain?.toFixed(1) || '0.0'} mm
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Soil Moisture</h3>
                  <Gauge className={`w-5 h-5 ${
                    current.soilMoisture < 30 ? 'text-red-500' :
                    current.soilMoisture < 50 ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                </div>
                <div className={`text-3xl font-bold ${
                  current.soilMoisture < 30 ? 'text-red-600' :
                  current.soilMoisture < 50 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {current.soilMoisture?.toFixed(1) || 'N/A'}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {current.soilMoisture < 30 ? 'Critical' : current.soilMoisture < 50 ? 'Low' : 'Optimal'}
                </p>
              </div>
            </div>

            {/* Real-time Graph */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">System Performance Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#6b7280"
                      fontSize={12}
                      label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#f97316"
                      fontSize={12}
                      label={{ value: 'Battery % / PV kW', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#3b82f6"
                      fontSize={12}
                      label={{ value: 'Load kW', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="batteryLevel" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Battery %"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="pvOutput" 
                      stroke="#eab308" 
                      strokeWidth={2}
                      name="PV Output (kW)"
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="load" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Load (kW)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* System Activity Timeline */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.slice(-10).reverse().map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-600 w-20">
                          Hour {entry.hour}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          PV: <span className="font-semibold text-gray-900">{entry.pvOutput} kW</span>
                        </span>
                        <span className="text-gray-600">
                          Battery: <span className="font-semibold text-gray-900">{entry.batteryLevel.toFixed(1)}%</span>
                        </span>
                        <span className={`font-semibold ${entry.irrigationOn ? 'text-blue-600' : 'text-gray-400'}`}>
                          Irrigation: {entry.irrigationOn ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

