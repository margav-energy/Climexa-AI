# Climexa AI System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Automation Logic](#automation-logic)
3. [Simulation Engine](#simulation-engine)
4. [System Components](#system-components)
5. [Decision-Making Process](#decision-making-process)
6. [Configuration Parameters](#configuration-parameters)
7. [Using the Simulation](#using-the-simulation)
8. [API Integration](#api-integration)
9. [Data Flow](#data-flow)

---

## System Overview

The Climexa AI system is an intelligent, autonomous farming platform that combines:
- **Solar Energy Generation** (AgriPV system)
- **Smart Irrigation** (soil moisture-based)
- **Battery Management** (energy storage and prioritization)
- **Weather Integration** (Open-Meteo API)
- **IoT Sensors** (soil moisture, temperature, etc.)

The system makes real-time decisions to optimize crop health while managing energy resources efficiently.

---

## Automation Logic

### Core Principles

1. **Soil Moisture is Primary**: Irrigation decisions are primarily driven by soil moisture content
2. **Energy Prioritization**: Critical irrigation can override battery protection
3. **Weather Awareness**: Rain detection prevents unnecessary irrigation
4. **Variable Load Management**: System load varies based on time of day and irrigation status

### Decision Flow

```
┌─────────────────┐
│  Check Sensors  │
│  (Soil Moisture) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Weather   │
│  (Rain, Clouds)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Battery   │
│     Level        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Make Decision   │
│  (Irrigation ON/ │
│       OFF)       │
└─────────────────┘
```

---

## Simulation Engine

### How the Simulation Works

The simulation engine models the farm system running in real-time, simulating:

1. **Solar Generation**: Based on time of day (solar curve)
2. **Weather Conditions**: Temperature, clouds, rain
3. **Soil Moisture**: Decreases naturally, increases with rain/irrigation
4. **Battery Dynamics**: Charges during day, discharges at night
5. **Load Management**: Variable domestic load + irrigation load
6. **Irrigation Decisions**: Based on soil moisture and conditions

### Time Progression

- **Speed Control**: 1x, 2x, 5x, or 10x real-time
- **Update Interval**: Every 2 seconds (adjusted by speed)
- **Time Step**: 1 hour per update
- **History**: Tracks last 48 hours of data

### Simulated Variables

| Variable | Range | Description |
|----------|-------|-------------|
| GTI (Global Tilted Irradiance) | 0-1000 W/m² | Solar energy on panels |
| PV Output | 0-23.4 kW | Calculated from GTI |
| Temperature | 15-35°C | Varies by time of day |
| Cloud Cover | 0-100% | Random with time patterns |
| Rain | 0-5 mm | Occasional precipitation |
| Soil Moisture | 0-100% | Decreases naturally, increases with rain |
| Battery Level | 0-100% | Based on energy flow |
| System Load | 0.5-3.5 kW | Variable by time and irrigation |

---

## System Components

### 1. Solar PV System

**Configuration:**
- System Size: 130 kW
- Panel Efficiency: 18%
- Tilt Angle: 23° (latitude-optimized)
- Azimuth: 180° (facing north for southern hemisphere)

**PV Output Calculation:**
```
PV Output (kW) = GTI (W/m²) × Panel Efficiency × System Size (kW) / 1000
```

**Example:**
- GTI = 500 W/m²
- PV Output = 500 × 0.18 × 130 / 1000 = 11.7 kW

### 2. Battery System

**Configuration:**
- Capacity: 1,320 kWh
- Default Level: 70% (924 kWh)
- Minimum Threshold: 20% (264 kWh)
- Maximum Threshold: 80% (1,056 kWh)

**Battery Dynamics:**
```
Net Power = PV Output - System Load
Battery Change = Net Power / Battery Capacity × 100%
New Battery Level = Current Level + Battery Change
```

**Charging:**
- Charges when PV Output > System Load
- Maximum charge rate limited by system capacity

**Discharging:**
- Discharges when PV Output < System Load
- Protected from over-discharge (minimum 0%)

### 3. Irrigation System

**Load:** 2.0 kW when active

**Control Logic:**
1. **Primary Driver**: Soil Moisture Content
2. **Rain Detection**: Automatically off if rain > 0.5mm
3. **Battery Protection**: Can be overridden for critical irrigation
4. **Weather Awareness**: Considers cloud forecast

**Irrigation States:**
- **ON**: Actively irrigating (2.0 kW load)
- **OFF**: Not irrigating (0 kW irrigation load)

### 4. Domestic Load

**Variable Load by Time of Day:**

| Time Period | Load Multiplier | Base Load | Total (no irrigation) |
|-------------|----------------|-----------|----------------------|
| Night (22:00-06:00) | 0.5× | 1.0 kW | 0.5 kW |
| Morning (06:00-09:00) | 1.5× | 1.0 kW | 1.5 kW |
| Day (09:00-17:00) | 1.0× | 1.0 kW | 1.0 kW |
| Evening (17:00-22:00) | 1.3× | 1.0 kW | 1.3 kW |

**Total System Load:**
```
Total Load = Domestic Load + Irrigation Load (if active)
```

**Example:**
- Evening with irrigation: 1.3 kW + 2.0 kW = 3.3 kW
- Night without irrigation: 0.5 kW

### 5. Soil Moisture Sensors

**Sensor Integration:**
- Reads from IoT soil moisture sensors
- Averages multiple sensor readings
- Updates in real-time

**Moisture Thresholds:**
- **Critical**: < 30% - Immediate irrigation required
- **Low**: 30-50% - Irrigation needed
- **Optimal**: 50-70% - Target range
- **Adequate**: > 70% - No irrigation needed

**Moisture Dynamics (Simulation):**
- **Natural Decrease**: -0.5% per hour (evaporation, plant uptake)
- **Temperature Effect**: Additional -1% per hour if temp > 25°C
- **Rain Increase**: +2% per mm of rain
- **Irrigation Effect**: Increases when irrigation is active

---

## Decision-Making Process

### Irrigation Decision Logic

#### Step 1: Check for Rain
```python
if rain > 0.5 mm:
    irrigation = OFF
    reason = "Rain detected. Irrigation not needed."
    priority = "optional"
    return
```

#### Step 2: Evaluate Soil Moisture Need
```python
if soil_moisture < 30%:
    irrigation_needed = True
    irrigation_critical = True
    priority = "critical"
elif soil_moisture < 50%:
    irrigation_needed = True
    priority = "normal"
elif soil_moisture >= 70%:
    irrigation_needed = False
    priority = "optional"
```

#### Step 3: Check Battery Level
```python
if battery_level < 20%:
    if irrigation_critical:
        # Logic 3: Prioritize irrigation over domestic load
        irrigation = ON
        reduce_domestic_load_by_50%
        reason = "Critical: Low soil moisture requires irrigation despite low battery. Prioritizing irrigation over domestic load."
        priority = "critical"
    else:
        irrigation = OFF
        reason = "Battery low and soil moisture acceptable. Irrigation paused."
        priority = "normal"
else:
    # Battery sufficient - proceed with normal logic
    ...
```

#### Step 4: Check Weather Forecast
```python
if forecast_clouds > 60%:
    if irrigation_critical:
        irrigation = ON
        reason = "Critical: Low soil moisture requires irrigation despite cloudy forecast."
        priority = "critical"
    else:
        irrigation = OFF
        reason = "Cloudy tomorrow forecast. Conserving battery."
        priority = "normal"
else:
    irrigation = ON
    if irrigation_critical:
        reason = "Critical: Low soil moisture. Irrigation activated."
        priority = "critical"
    else:
        reason = "Soil moisture below optimal. Irrigation activated."
        priority = "normal"
```

### Priority Levels

1. **Critical**: Soil moisture < 30%
   - Irrigation activates regardless of battery/weather
   - Domestic load reduced to prioritize irrigation
   - Visual indicator: Red badge

2. **Normal**: Soil moisture 30-50%
   - Irrigation activates if conditions allow
   - Respects battery protection (unless critical)
   - Visual indicator: Yellow badge

3. **Optional**: Soil moisture ≥ 70% or raining
   - Irrigation not needed
   - System conserves energy
   - Visual indicator: Gray badge

---

## Configuration Parameters

### System Constants

Located in `backend/automation/services.py`:

```python
# Battery Protection
MIN_BATTERY = 20  # % - Minimum battery level
MAX_BATTERY = 80  # % - Maximum battery level for heavy usage

# Cloud Threshold
CLOUD_THRESHOLD = 60  # % - Cloud cover threshold

# Soil Moisture Thresholds
SOIL_MOISTURE_LOW = 30  # % - Critical threshold
SOIL_MOISTURE_OPTIMAL = 50  # % - Target moisture level
SOIL_MOISTURE_HIGH = 70  # % - Adequate moisture level

# Load Configuration
DOMESTIC_LOAD_BASE = 1.0  # kW - Base domestic load
IRRIGATION_LOAD = 2.0  # kW - Irrigation system load
```

### Farm Configuration

Each farm has configurable parameters:

```python
system_size_kw = 130.0  # Solar system size
battery_capacity_kwh = 1320.0  # Battery capacity
panel_efficiency = 0.18  # Panel efficiency (18%)
tilt = 23  # Panel tilt angle
azimuth = 180  # Panel orientation (north for southern hemisphere)
```

---

## Using the Simulation

### Accessing the Simulation

1. **Navigate to Simulation**: Click "Simulation" button in the Farmer Dashboard header
2. **Select Farm**: Choose a farm from the dropdown (if multiple farms)
3. **Start Simulation**: Click "Start Simulation" button

### Simulation Controls

#### Start/Pause
- **Start**: Begins the simulation from current state
- **Pause**: Temporarily stops the simulation (can resume)

#### Speed Control
- **1x**: Real-time speed (1 hour per 2 seconds)
- **2x**: 2× faster
- **5x**: 5× faster
- **10x**: 10× faster

**Note**: Speed can only be changed when simulation is paused

#### Reset
- Resets simulation to initial state
- Clears history
- Reloads current farm data

### Understanding the Display

#### Status Cards

1. **Battery Card**
   - Current battery percentage
   - Battery capacity in kWh
   - Color-coded progress bar:
     - Green: > 50%
     - Yellow: 20-50%
     - Red: < 20%

2. **PV Generation Card**
   - Current PV output in kW
   - GTI (Global Tilted Irradiance) in W/m²

3. **Irrigation Card**
   - ON/OFF status
   - Current reason for status
   - Priority badge (critical/normal/optional)

4. **System Load Card**
   - Total system load in kW
   - Breakdown: Domestic load + Net power

#### Weather & Conditions

- **Temperature**: Current air temperature (°C)
- **Cloud Cover**: Percentage of sky covered
- **Precipitation**: Rainfall in mm
- **Soil Moisture**: Current soil moisture percentage
  - Color coding:
    - Red: < 30% (Critical)
    - Yellow: 30-50% (Low)
    - Green: > 50% (Optimal)

#### Real-Time Graph

Shows system performance over time:
- **Battery %**: Green line (left Y-axis)
- **PV Output (kW)**: Yellow line (left Y-axis)
- **Load (kW)**: Blue line (right Y-axis)

Hover over the graph to see detailed values at each hour.

#### Activity Timeline

Shows the last 10 hours of system activity:
- Hour number
- Timestamp
- PV output
- Battery level
- Irrigation status

---

## API Integration

### Open-Meteo Weather API

**Endpoint**: `https://api.open-meteo.com/v1/forecast`

**Parameters:**
- `latitude`: Farm latitude
- `longitude`: Farm longitude
- `hourly`: Weather parameters
- `tilt`: Solar panel tilt angle
- `azimuth`: Solar panel azimuth
- `timezone`: Auto-detect timezone

**Data Retrieved:**
- Global Tilted Irradiance (GTI)
- Temperature
- Precipitation
- Cloud Cover
- Relative Humidity

**Update Frequency**: Every hour (or on-demand)

### Internal APIs

#### Get Weather Forecast
```
GET /api/automation/weather/<farm_id>/
```

**Response:**
```json
{
  "current": {
    "gti": 182.3,
    "clouds": 100,
    "rain": 0.0,
    "temperature": 18.2
  },
  "forecast_tomorrow": {
    "clouds": 85,
    "rain": 0.0
  },
  "forecast": {
    "hourly": {...},
    "daily": {...}
  }
}
```

#### Get AI Suggestions
```
GET /api/automation/suggestions/<farm_id>/
```

**Response:**
```json
{
  "suggestions": [
    {
      "title": "High Temperature Alert",
      "message": "Current temperature is 35°C...",
      "type": "warning",
      "icon": "🥵",
      "priority": "high"
    }
  ],
  "generated_at": "2025-11-18T10:00:00Z"
}
```

#### Get Farm Status
```
GET /api/farmer/farms/<farm_id>/status/
```

**Response:**
```json
{
  "battery_level": 70.5,
  "battery_kwh": 930.6,
  "pv_output_kw": 4.27,
  "gti": 182.3,
  "irrigation_on": false,
  "irrigation_reason": "Soil moisture (55.2%) is adequate.",
  "irrigation_priority": "optional",
  "current_load_kw": 1.0,
  "current_soil_moisture": 55.2,
  "current_temperature": 18.2,
  "current_rain": 0.0,
  "current_clouds": 100
}
```

---

## Data Flow

### System Update Cycle

```
1. Fetch Weather Data (Open-Meteo API)
   ↓
2. Get Current Soil Moisture (IoT Sensors)
   ↓
3. Calculate PV Output (GTI → kW)
   ↓
4. Determine Irrigation Status (Automation Logic)
   ↓
5. Calculate System Load (Variable by time + irrigation)
   ↓
6. Update Battery Level (Energy flow calculation)
   ↓
7. Save Status to Database
   ↓
8. Return Updated Status
```

### Simulation Data Flow

```
User Starts Simulation
   ↓
Load Farm Data (Battery, System Config)
   ↓
Initialize Simulation State
   ↓
Every 2 seconds (adjusted by speed):
   ↓
1. Simulate Hour (Weather, Solar, Soil Moisture)
   ↓
2. Calculate PV Output
   ↓
3. Determine Irrigation (Based on Soil Moisture)
   ↓
4. Calculate Load (Variable by time)
   ↓
5. Update Battery
   ↓
6. Update History
   ↓
7. Update UI
   ↓
Repeat...
```

---

## Example Scenarios

### Scenario 1: Normal Operation

**Conditions:**
- Soil Moisture: 55% (Optimal)
- Battery: 75%
- Weather: Sunny, no rain
- Time: 14:00 (Daytime)

**System Behavior:**
- Irrigation: OFF (moisture adequate)
- Load: 1.0 kW (domestic only)
- PV Output: 15.2 kW (peak sun)
- Battery: Charging (+14.2 kW net)
- Priority: Optional

### Scenario 2: Critical Irrigation

**Conditions:**
- Soil Moisture: 25% (Critical)
- Battery: 15% (Low)
- Weather: Partly cloudy
- Time: 10:00 (Morning)

**System Behavior:**
- Irrigation: ON (critical need)
- Load: 2.5 kW (1.5 kW domestic × 0.5 + 2.0 kW irrigation)
- PV Output: 8.5 kW
- Battery: Charging slowly (+6.0 kW net)
- Priority: Critical
- Reason: "Critical: Low soil moisture (25.0%) requires irrigation despite low battery. Prioritizing irrigation over domestic load."

### Scenario 3: Rain Detection

**Conditions:**
- Soil Moisture: 40% (Low)
- Battery: 60%
- Weather: Raining (2.5 mm)
- Time: 16:00 (Afternoon)

**System Behavior:**
- Irrigation: OFF (rain detected)
- Load: 1.3 kW (domestic only)
- PV Output: 3.2 kW (cloudy)
- Battery: Charging slowly (+1.9 kW net)
- Priority: Optional
- Reason: "Rain detected. Irrigation not needed."
- Soil Moisture: Increases due to rain

### Scenario 4: Night Operation

**Conditions:**
- Soil Moisture: 35% (Low)
- Battery: 45%
- Weather: Clear
- Time: 02:00 (Night)

**System Behavior:**
- Irrigation: ON (if critical) or OFF (if not critical)
- Load: 0.5 kW (night domestic) + 2.0 kW (if irrigation)
- PV Output: 0 kW (night)
- Battery: Discharging (-2.5 kW net if irrigating)
- Priority: Normal or Critical (depending on moisture level)

---

## Troubleshooting

### Common Issues

1. **Simulation Not Starting**
   - Check if farm is selected
   - Verify farm data is loaded
   - Check browser console for errors

2. **Battery Not Charging**
   - Verify PV output is > 0 (not nighttime)
   - Check system load is less than PV output
   - Ensure battery is not already at 100%

3. **Irrigation Not Activating**
   - Check soil moisture level (should be < 50%)
   - Verify no rain is detected
   - Check battery level (may be too low for non-critical irrigation)

4. **Data Not Updating**
   - Refresh the page
   - Check network connection
   - Verify backend server is running

---

## Technical Details

### Backend Implementation

**Main Files:**
- `backend/automation/services.py`: Core automation logic
- `backend/farms/models.py`: Database models
- `backend/automation/views.py`: API endpoints

**Key Functions:**
- `get_current_soil_moisture()`: Fetches sensor data
- `automation_logic()`: Makes irrigation decisions
- `calculate_hourly_load()`: Calculates variable load
- `simulate_energy_flow()`: Updates battery level
- `update_farm_status()`: Main update function

### Frontend Implementation

**Main Files:**
- `frontend/src/pages/SimulationView.jsx`: Simulation UI
- `frontend/src/components/HourlyForecastGraph.jsx`: Forecast graph

**Key Features:**
- Real-time updates via React state
- Chart visualization with Recharts
- Responsive design with Tailwind CSS

---

## Future Enhancements

Potential improvements:
1. **Multi-zone Irrigation**: Different moisture thresholds per crop zone
2. **Predictive Analytics**: Machine learning for irrigation timing
3. **Energy Trading**: Sell excess energy to grid
4. **Mobile App**: Native mobile application
5. **Historical Analysis**: Long-term trend analysis
6. **Alert System**: SMS/Email notifications for critical events

---

## Support

For questions or issues:
- Check the code comments in `backend/automation/services.py`
- Review the API documentation in `README.md`
- Check system logs for error messages

---

**Last Updated**: November 2025
**Version**: 1.0.0

