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
  Gauge,
  Waves,
  Droplets,
  Wind,
  GaugeCircle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Simulate farm system running in real-time with Open-Meteo weather data
const simulateHour = (currentData, hour, weatherForecast = null, startTime = null) => {
  const hourOfDay = hour % 24
  
  // Use real weather data from Open-Meteo if available, otherwise fall back to simulated
  let gti, temperature, clouds, rain
  let soilMoistureFromAPI = null
  let soilTemperatureFromAPI = null
  
  if (weatherForecast && weatherForecast.hourly) {
    const hourly = weatherForecast.hourly
    
    // Get values from forecast, safely handling missing data
    const gtiValues = hourly.global_tilted_irradiance || []
    const tempValues = hourly.temperature_2m || []
    const cloudValues = hourly.cloud_cover || []
    const rainValues = hourly.precipitation || []
    const times = hourly.time || []
    
    // Soil data from Open-Meteo
    const soilMoisture0to1cm = hourly.soil_moisture_0_1cm || []
    const soilMoisture1to3cm = hourly.soil_moisture_1_3cm || []
    const soilMoisture3to9cm = hourly.soil_moisture_3_9cm || []
    const soilTemperature6cm = hourly.soil_temperature_6cm || []
    
    // Calculate the index based on simulation start time and current hour
    let index = 0
    
    if (startTime && times.length > 0) {
      // Find the index for the current simulated time
      const simulatedTime = new Date(startTime.getTime() + hour * 3600000) // Add hours to start time
      const simulatedTimeStr = simulatedTime.toISOString().slice(0, 13) + ':00' // Format: YYYY-MM-DDTHH:00
      
      // Try to find exact match in times array
      const exactIndex = times.findIndex(time => {
        // Format the time from forecast to match
        const forecastTimeStr = time.slice(0, 13) + ':00'
        return forecastTimeStr === simulatedTimeStr
      })
      
      if (exactIndex >= 0) {
        index = exactIndex
      } else {
        // Fallback: calculate hours difference from start
        // Open-Meteo typically starts from current hour (index 0 = now)
        // So we use hour directly as index offset from start
        const startTimeStr = startTime.toISOString().slice(0, 13) + ':00'
        const startIndex = times.findIndex(time => {
          const forecastTimeStr = time.slice(0, 13) + ':00'
          return forecastTimeStr === startTimeStr
        })
        
        if (startIndex >= 0) {
          index = Math.min(startIndex + hour, times.length - 1)
        } else {
          // Ultimate fallback: use hour as offset from beginning
          index = Math.min(hour, times.length - 1)
        }
      }
    } else {
      // No start time, use hour as direct index
      const maxIndex = Math.max(
        gtiValues.length - 1,
        tempValues.length - 1,
        cloudValues.length - 1,
        rainValues.length - 1,
        0
      )
      index = Math.min(hour, maxIndex)
    }
    
    // Ensure index is valid
    index = Math.max(0, Math.min(index, Math.max(gtiValues.length - 1, tempValues.length - 1, cloudValues.length - 1, rainValues.length - 1, 0)))
    
    // Get values from forecast, with fallbacks
    gti = (gtiValues[index] !== undefined && gtiValues[index] !== null && !isNaN(gtiValues[index])) 
      ? parseFloat(gtiValues[index]) 
      : ((gtiValues.length > 0 && gtiValues[0] !== null && !isNaN(gtiValues[0])) ? parseFloat(gtiValues[0]) : 0)
    
    temperature = (tempValues[index] !== undefined && tempValues[index] !== null && !isNaN(tempValues[index])) 
      ? parseFloat(tempValues[index]) 
      : ((tempValues.length > 0 && tempValues[0] !== null && !isNaN(tempValues[0])) ? parseFloat(tempValues[0]) : 20)
    
    clouds = (cloudValues[index] !== undefined && cloudValues[index] !== null && !isNaN(cloudValues[index])) 
      ? parseFloat(cloudValues[index]) 
      : ((cloudValues.length > 0 && cloudValues[0] !== null && !isNaN(cloudValues[0])) ? parseFloat(cloudValues[0]) : 0)
    
    rain = (rainValues[index] !== undefined && rainValues[index] !== null && !isNaN(rainValues[index])) 
      ? parseFloat(rainValues[index]) 
      : ((rainValues.length > 0 && rainValues[0] !== null && !isNaN(rainValues[0])) ? parseFloat(rainValues[0]) : 0)
    
    // Get soil data from Open-Meteo (convert from m³/m³ to percentage for moisture)
    // Use the 3-9cm depth directly (closest to our 300cm sensors)
    const soilMoisture3to9 = (soilMoisture3to9cm[index] !== undefined && soilMoisture3to9cm[index] !== null && !isNaN(soilMoisture3to9cm[index])) 
      ? parseFloat(soilMoisture3to9cm[index]) : null
    
    // Use 3-9cm depth directly, or fallback to 1-3cm, then 0-1cm
    if (soilMoisture3to9 !== null) {
      // Convert m³/m³ to percentage (multiply by 100)
      soilMoistureFromAPI = Math.min(100, Math.max(0, soilMoisture3to9 * 100))
    } else {
      // Fallback to 1-3cm depth
      const soilMoisture1to3 = (soilMoisture1to3cm[index] !== undefined && soilMoisture1to3cm[index] !== null && !isNaN(soilMoisture1to3cm[index])) 
        ? parseFloat(soilMoisture1to3cm[index]) : null
      if (soilMoisture1to3 !== null) {
        soilMoistureFromAPI = Math.min(100, Math.max(0, soilMoisture1to3 * 100))
      } else {
        // Final fallback to 0-1cm depth
        const soilMoisture0to1 = (soilMoisture0to1cm[index] !== undefined && soilMoisture0to1cm[index] !== null && !isNaN(soilMoisture0to1cm[index])) 
          ? parseFloat(soilMoisture0to1cm[index]) : null
        if (soilMoisture0to1 !== null) {
          soilMoistureFromAPI = Math.min(100, Math.max(0, soilMoisture0to1 * 100))
        }
      }
    }
    
    // Get soil temperature
    if (soilTemperature6cm[index] !== undefined && soilTemperature6cm[index] !== null && !isNaN(soilTemperature6cm[index])) {
      soilTemperatureFromAPI = parseFloat(soilTemperature6cm[index])
    }
    
    // Ensure GTI is not negative
    gti = Math.max(0, gti || 0)
    
    // Log for debugging
    if (hour === 0 || hour % 24 === 0) {
      console.log(`[Simulation Hour ${hour}] Using Open-Meteo data - Index: ${index}, GTI: ${gti} W/m², Temp: ${temperature}°C, Soil Moisture: ${soilMoistureFromAPI !== null ? soilMoistureFromAPI.toFixed(1) + '%' : 'N/A'}, Soil Temp: ${soilTemperatureFromAPI !== null ? soilTemperatureFromAPI.toFixed(1) + '°C' : 'N/A'}`)
    }
  } else {
    // Fallback to simulated data if forecast not available
    const solarIntensity = Math.max(0, Math.sin((hourOfDay - 6) * Math.PI / 12) * 1000)
  const baseGTI = solarIntensity
    const randomness = hourOfDay >= 10 && hourOfDay <= 15 ? 50 : 100
    gti = Math.max(0, baseGTI + (Math.random() * randomness * 2 - randomness))
    
  const baseTemp = 20 + (hourOfDay > 6 && hourOfDay < 18 ? 10 : 0)
    temperature = baseTemp + (Math.random() * 5 - 2.5)
  
    clouds = hourOfDay > 10 && hourOfDay < 14 ? 
    Math.random() * 30 : Math.random() * 80
  
    rain = Math.random() > 0.9 ? Math.random() * 5 : 0
  }
  
  // Calculate PV output from GTI
  const systemSizeKw = currentData.systemSizeKw || 130
  const panelEfficiency = currentData.panelEfficiency || 0.18
  const pvOutput = (gti * panelEfficiency * systemSizeKw) / 1000
  
  // Use soil moisture directly from Open-Meteo if available, otherwise simulate
  let soilMoisture = currentData.soilMoisture || 50
  
  // If we have soil moisture from Open-Meteo API, use it directly without averaging
  if (typeof soilMoistureFromAPI === 'number' && !isNaN(soilMoistureFromAPI)) {
    // Use Open-Meteo data directly - no adjustments needed
    soilMoisture = soilMoistureFromAPI
  } else {
    // Fallback to simulated soil moisture if API data not available
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
    soilTemperature: soilTemperatureFromAPI !== null ? Math.round(soilTemperatureFromAPI * 10) / 10 : null,
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
    timestamp: startTime ? new Date(startTime.getTime() + hour * 3600000).toISOString() : new Date(Date.now() + hour * 3600000).toISOString()
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
  const [sensors, setSensors] = useState([])
  const [weatherForecast, setWeatherForecast] = useState(null)
  const [simulationStartTime, setSimulationStartTime] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    if (selectedFarm) {
      loadFarmData()
      loadSensors()
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
  }, [isRunning, speed, selectedFarm, simulationData, weatherForecast])

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
      
      // Store dashboard data for average soil moisture calculation
      setDashboardData(response.data)
      
      // Use average soil moisture from dashboard (calculated from sensors) or fallback
      const initialSoilMoisture = response.data.average_soil_moisture !== null && response.data.average_soil_moisture !== undefined
        ? parseFloat(response.data.average_soil_moisture)
        : parseFloat(status?.current_soil_moisture || 50)
      
      setSimulationData({
        batteryLevel: parseFloat(status?.battery_level || 70),
        batteryCapacity: parseFloat(farm?.battery_capacity_kwh || 1320),
        systemSizeKw: parseFloat(farm?.system_size_kw || 130),
        panelEfficiency: parseFloat(farm?.panel_efficiency || 0.18),
        soilMoisture: initialSoilMoisture,
        lastIrrigationOn: status?.irrigation_on || false,
      })
      
      // Fetch weather forecast from Open-Meteo
      let forecast = null
      try {
        const weatherResponse = await automationAPI.getWeatherForecast(selectedFarm.id)
        console.log('Weather forecast response:', weatherResponse.data)
        
        if (weatherResponse.data && weatherResponse.data.forecast) {
          forecast = weatherResponse.data.forecast
          
          // Debug: Check if GTI and soil data is present
          if (forecast.hourly && forecast.hourly.global_tilted_irradiance) {
            const gtiValues = forecast.hourly.global_tilted_irradiance
            console.log(`Loaded GTI forecast: ${gtiValues.length} hours, first 5 values:`, gtiValues.slice(0, 5))
            console.log('First forecast time:', forecast.hourly.time?.[0])
          } else {
            console.warn('Warning: GTI data not found in forecast response')
            console.log('Available hourly keys:', forecast.hourly ? Object.keys(forecast.hourly) : 'No hourly data')
          }
          
          // Debug: Check if soil data is present
          if (forecast.hourly) {
            const hasSoilMoisture = forecast.hourly.soil_moisture_0_1cm || 
                                   forecast.hourly.soil_moisture_1_3cm || 
                                   forecast.hourly.soil_moisture_3_9cm
            const hasSoilTemp = forecast.hourly.soil_temperature_6cm
            
            if (hasSoilMoisture) {
              const soilMoisture0 = forecast.hourly.soil_moisture_0_1cm?.[0]
              const soilMoisture1 = forecast.hourly.soil_moisture_1_3cm?.[0]
              const soilMoisture3 = forecast.hourly.soil_moisture_3_9cm?.[0]
              console.log(`Loaded Soil Moisture data - 0-1cm: ${soilMoisture0}, 1-3cm: ${soilMoisture1}, 3-9cm: ${soilMoisture3}`)
            } else {
              console.warn('Warning: Soil moisture data not found in forecast response')
            }
            
            if (hasSoilTemp) {
              const soilTemp = forecast.hourly.soil_temperature_6cm?.[0]
              console.log(`Loaded Soil Temperature (6cm): ${soilTemp}°C`)
            } else {
              console.warn('Warning: Soil temperature data not found in forecast response')
            }
          }
          
          setWeatherForecast(forecast)
        } else {
          console.warn('No forecast data in response')
        }
      } catch (weatherError) {
        console.error('Error loading weather forecast, using simulated data:', weatherError)
        setWeatherForecast(null)
      }
      
      // Set simulation start time to current time
      const startTime = new Date()
      setSimulationStartTime(startTime)
      
      // Initialize with current data (use same initialSoilMoisture calculated above)
      const initial = simulateHour({
        batteryLevel: parseFloat(status?.battery_level || 70),
        batteryCapacity: parseFloat(farm?.battery_capacity_kwh || 1320),
        systemSizeKw: parseFloat(farm?.system_size_kw || 130),
        panelEfficiency: parseFloat(farm?.panel_efficiency || 0.18),
        soilMoisture: initialSoilMoisture,
        lastIrrigationOn: status?.irrigation_on || false,
      }, 0, forecast, startTime)
      setHistory([initial])
    } catch (error) {
      console.error('Error loading farm data:', error)
    }
  }

  // Generate random sensor readings based on current simulation state
  const generateSensorReadings = (currentState, sensorsList = sensors) => {
    if (!sensorsList || sensorsList.length === 0) return sensorsList || []
    
    const updatedSensors = sensorsList.map(sensor => {
      const sensorName = sensor.sensor_type?.name?.toLowerCase() || ''
      
      // Generate random reading based on sensor type and current simulation state
      let randomValue = 0
      
      if (sensorName.includes('soil moisture')) {
        // Use Open-Meteo soil moisture as base if available, otherwise use simulated
        // Note: Open-Meteo provides shallow depths (0-9cm), but we display 300cm depth
        // We'll use the Open-Meteo data as a reference point with variations
        const baseMoisture = currentState?.soilMoisture || 50
        const variation = sensor.location?.includes('Plot B') ? 3 : sensor.location?.includes('Plot C') ? -2 : 0
        // Add small random variation to simulate different plot conditions
        randomValue = Math.max(20, Math.min(85, baseMoisture + variation + (Math.random() * 4 - 2)))
      } else if (sensorName.includes('soil temperature')) {
        // Use Open-Meteo soil temperature if available (at 6cm depth)
        let baseTemp
        if (currentState?.soilTemperature !== null && currentState?.soilTemperature !== undefined) {
          baseTemp = currentState.soilTemperature
        } else {
          // Fallback: soil temp follows air temp but is cooler
          baseTemp = (currentState?.temperature || 20) - 2
        }
        const variation = sensor.location?.includes('Plot B') ? 1 : sensor.location?.includes('Plot C') ? -1 : 0
        randomValue = baseTemp + variation + (Math.random() * 2 - 1)
      } else if (sensorName.includes('soil electrical conductivity') || sensorName.includes('soil ec')) {
        randomValue = 0.1 + Math.random() * 2.4
      } else if (sensorName.includes('water quality') || sensorName.includes('salinity')) {
        randomValue = 200 + Math.random() * 600
      } else if (sensorName.includes('water flow')) {
        // Water flow is active only when irrigation is on
        if (currentState?.irrigationOn) {
          randomValue = sensor.location?.includes('main line') 
            ? 50 + Math.random() * 50 
            : 20 + Math.random() * 30
        } else {
          randomValue = 0
        }
      } else if (sensorName.includes('air temperature')) {
        randomValue = (currentState?.temperature || 20) + (Math.random() * 2 - 1)
      } else if (sensorName.includes('air humidity')) {
        // Humidity varies inversely with temperature and increases with rain
        const baseHumidity = 60 - ((currentState?.temperature || 20) - 20) * 1.5
        const rainBonus = (currentState?.rain || 0) > 0.5 ? 15 : 0
        randomValue = Math.max(30, Math.min(95, baseHumidity + rainBonus + (Math.random() * 10 - 5)))
      } else if (sensorName.includes('rain gauge')) {
        randomValue = currentState?.rain || 0
      } else if (sensorName.includes('solar irradiance')) {
        // Solar irradiance matches GTI from weather
        randomValue = (currentState?.gti || 0) + (Math.random() * 50 - 25)
        randomValue = Math.max(0, randomValue)
      } else if (sensorName.includes('photosynthetic active radiation') || sensorName.includes('par')) {
        // PAR is related to solar irradiance
        const basePAR = ((currentState?.gti || 0) / 1000) * 1800
        randomValue = Math.max(0, basePAR + (Math.random() * 200 - 100))
      }
      
      return {
        ...sensor,
        latest_reading: {
          value: parseFloat(randomValue.toFixed(2)),
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return updatedSensors
  }

  const loadSensors = async () => {
    if (!selectedFarm) return
    
    try {
      const response = await farmerAPI.getSensors(selectedFarm.id)
      const loadedSensors = response.data || []
      
      // Always generate random readings for sensors (even if no simulation data yet)
      const current = history[history.length - 1] || {}
      const currentState = {
        soilMoisture: current.soilMoisture || 50,
        temperature: current.temperature || 20,
        rain: current.rain || 0,
        irrigationOn: current.irrigationOn || false,
        gti: current.gti || 0
      }
      
      if (loadedSensors.length > 0) {
        const sensorsWithReadings = generateSensorReadings(currentState, loadedSensors)
        setSensors(sensorsWithReadings)
      } else {
        setSensors(loadedSensors)
      }
    } catch (error) {
      console.error('Error loading sensors:', error)
    }
  }

  const runSimulation = () => {
    if (!simulationData) return
    
    const newHour = currentHour + 1
    const newData = simulateHour(simulationData, newHour, weatherForecast, simulationStartTime)
    
    // Generate random sensor readings based on current simulation state
    if (sensors && sensors.length > 0) {
      const updatedSensors = generateSensorReadings(newData, sensors)
      setSensors(updatedSensors)
    }
    
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
    setSimulationStartTime(new Date())
    loadFarmData()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const current = history[history.length - 1] || {}

  // Calculate average soil moisture from sensors at 300cm depth
  const calculateAverageSoilMoisture = () => {
    // First try to get from dashboard data (most accurate, calculated server-side)
    if (dashboardData?.average_soil_moisture !== null && dashboardData?.average_soil_moisture !== undefined) {
      return parseFloat(dashboardData.average_soil_moisture)
    }
    
    // Fallback: Calculate from loaded sensors
    if (sensors && sensors.length > 0) {
      // Filter for soil moisture sensors at 300cm depth
      const soilMoistureSensors = sensors.filter(sensor => 
        sensor.sensor_type?.name?.toLowerCase().includes('soil moisture') &&
        sensor.location?.includes('300cm') &&
        sensor.is_active
      )
      
      if (soilMoistureSensors.length > 0) {
        // Get readings from each sensor
        const readings = soilMoistureSensors
          .map(sensor => {
            if (sensor.latest_reading && sensor.latest_reading.value !== null && sensor.latest_reading.value !== undefined) {
              return parseFloat(sensor.latest_reading.value)
            }
            return null
          })
          .filter(val => val !== null && !isNaN(val))
        
        if (readings.length > 0) {
          // Calculate average
          const average = readings.reduce((sum, val) => sum + val, 0) / readings.length
          return average
        }
      }
    }
    
    // Final fallback: use simulated value
    return current.soilMoisture || null
  }

  const averageSoilMoisture = calculateAverageSoilMoisture()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-green-600 border-b border-green-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-climexa-primary to-climexa-accent rounded-lg flex items-center justify-center shadow-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">System Simulation</h1>
              <p className="text-xs text-green-100">Real-time farm system monitoring</p>
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
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors border border-green-700 bg-white"
              >
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => navigate('/farmer')}
              className="px-4 py-2 text-sm font-medium text-white hover:text-green-100 hover:bg-green-700 rounded-lg transition-colors border border-green-500"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white hover:text-green-100 hover:bg-green-700 rounded-lg transition-colors border border-green-500"
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
              <div className="space-y-1">
              <p className="text-sm text-gray-500">
                {selectedFarm?.name || 'No farm selected'} • Simulating hour {currentHour}
                  {current.hourOfDay !== undefined && ` • ${String(current.hourOfDay).padStart(2, '0')}:00 (Day ${Math.floor(currentHour / 24) + 1})`}
                </p>
                {simulationStartTime && (
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Start:</span> {simulationStartTime.toLocaleString()}
                    {current.timestamp && (
                      <>
                        {' • '}
                        <span className="font-medium">Simulated:</span> {new Date(current.timestamp).toLocaleString()}
                      </>
                    )}
                  </div>
                )}
              </div>
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
                    (current.soilMoisture ?? 0) < 30 ? 'text-red-500' :
                    (current.soilMoisture ?? 0) < 50 ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                </div>
                <div className={`text-3xl font-bold ${
                  (current.soilMoisture ?? 0) < 30 ? 'text-red-600' :
                  (current.soilMoisture ?? 0) < 50 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {current.soilMoisture?.toFixed(1) || 'N/A'}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {weatherForecast && weatherForecast.hourly && (weatherForecast.hourly.soil_moisture_3_9cm || weatherForecast.hourly.soil_moisture_1_3cm || weatherForecast.hourly.soil_moisture_0_1cm)
                    ? 'From Open-Meteo'
                    : 'Simulated'}
                  {' • '}
                  {(current.soilMoisture ?? 0) < 30 ? 'Critical' : 
                   (current.soilMoisture ?? 0) < 50 ? 'Low' : 
                   'Optimal'}
                </p>
              </div>
            </div>

            {/* Sensor Network Display */}
            {sensors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Sensor Network ({sensors.length} sensors)</h3>
                
                {['soil', 'water', 'weather', 'solar'].map(category => {
                  const categorySensors = sensors.filter(s => s.sensor_type?.category === category)
                  if (categorySensors.length === 0) return null
                  
                  const categoryLabels = {
                    soil: 'Soil Sensors',
                    water: 'Water Sensors',
                    weather: 'Weather Sensors',
                    solar: 'Solar Sensors'
                  }
                  
                  const categoryColors = {
                    soil: 'bg-amber-50 border-amber-200',
                    water: 'bg-blue-50 border-blue-200',
                    weather: 'bg-cyan-50 border-cyan-200',
                    solar: 'bg-yellow-50 border-yellow-200'
                  }
                  
                  return (
                    <div key={category} className={`mb-6 rounded-lg border-2 ${categoryColors[category]} p-4`}>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">{categoryLabels[category]}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categorySensors.map(sensor => {
                          const getSensorIcon = () => {
                            const sensorName = sensor.sensor_type?.name?.toLowerCase() || ''
                            if (sensorName.includes('moisture')) return <Gauge className="w-5 h-5 text-amber-600" />
                            if (sensorName.includes('temperature')) return <Thermometer className="w-5 h-5 text-red-500" />
                            if (sensorName.includes('conductivity') || sensorName.includes('ec')) return <GaugeCircle className="w-5 h-5 text-purple-500" />
                            if (sensorName.includes('flow')) return <Waves className="w-5 h-5 text-blue-500" />
                            if (sensorName.includes('quality') || sensorName.includes('salinity')) return <Droplets className="w-5 h-5 text-cyan-500" />
                            if (sensorName.includes('humidity')) return <Droplet className="w-5 h-5 text-blue-400" />
                            if (sensorName.includes('rain')) return <Cloud className="w-5 h-5 text-gray-500" />
                            if (sensorName.includes('irradiance') || sensorName.includes('radiation') || sensorName.includes('par')) return <Sun className="w-5 h-5 text-yellow-500" />
                            return <Activity className="w-5 h-5 text-gray-400" />
                          }
                          
                          return (
                            <div 
                              key={sensor.id} 
                              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-2 flex-1">
                                  <div className="mt-0.5">
                                    {getSensorIcon()}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="text-sm font-semibold text-gray-900 mb-1">
                                      {sensor.name}
                                    </h5>
                                    {sensor.location && (
                                      <p className="text-xs text-gray-500 mb-2">{sensor.location}</p>
                                    )}
                                  </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  sensor.is_active 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {sensor.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {sensor.latest_reading ? (
                                  <div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-gray-900">
                                        {typeof sensor.latest_reading.value === 'number' 
                                          ? sensor.latest_reading.value.toFixed(2)
                                          : parseFloat(sensor.latest_reading.value || 0).toFixed(2)
                                        }
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {sensor.sensor_type?.unit || ''}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(sensor.latest_reading.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400 italic">
                                    No readings available
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

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

