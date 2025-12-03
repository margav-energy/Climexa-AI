# Sensors Implementation for Climexa Simulation

## Overview

All sensors have been successfully installed for all farms in the system. Each farm now has a comprehensive sensor network for monitoring and simulation.

## Installed Sensors

### Per Farm: 19 Sensors

#### Soil Sensors (8 sensors)
1. **Soil Moisture** - Plot A, 10cm depth
2. **Soil Moisture** - Plot A, 30cm depth
3. **Soil Moisture** - Plot B, 10cm depth
4. **Soil Moisture** - Plot B, 30cm depth
5. **Soil Temperature** - Plot A, 10cm depth
6. **Soil Temperature** - Plot A, 30cm depth
7. **Soil Electrical Conductivity** - Plot A, root zone
8. **Soil Electrical Conductivity** - Plot B, root zone

#### Water Sensors (4 sensors)
9. **Water Quality/Salinity** - Main Line, entry point
10. **Water Flow** - Main Line, flow meter
11. **Water Flow** - Plot A irrigation zone
12. **Water Flow** - Plot B irrigation zone

#### Weather Sensors (3 sensors)
13. **Air Temperature** - Weather station, 2m height
14. **Air Humidity** - Weather station, 2m height
15. **Rain Gauge** - Weather station, open area

#### Solar Sensors (4 sensors)
16. **Solar Irradiance** - PV Array 1, panel surface
17. **Solar Irradiance** - PV Array 2, panel surface
18. **Photosynthetic Active Radiation (PAR)** - Crop Canopy, Plot A
19. **Photosynthetic Active Radiation (PAR)** - Open Field, reference level

## Total Sensors Installed

- **3 Farms** × **19 Sensors** = **57 Sensors Total**

## Farms with Sensors

1. **Green Valley Farm** (farmer1) - 19 sensors
2. **Sunset Fields** (farmer1) - 19 sensors
3. **Harvest Hills** (farmer2) - 19 sensors

## Sensor Categories

### Soil Sensors
- Monitor soil conditions at multiple depths
- Track moisture levels for irrigation decisions
- Measure temperature and electrical conductivity

### Water Sensors
- Monitor irrigation water quality
- Track water flow rates for irrigation zones
- Ensure efficient water distribution

### Weather Sensors
- Environmental monitoring
- Temperature and humidity tracking
- Rainfall measurement

### Solar Sensors
- PV system performance monitoring
- Solar irradiance measurement
- Photosynthetic Active Radiation for crop growth

## Management Commands

### Install Sensors
```bash
cd backend
python manage.py install_farm_sensors
```

### Install Sensors for Specific Farm
```bash
python manage.py install_farm_sensors --farm-id 1
```

### Clear and Reinstall Sensors
```bash
python manage.py install_farm_sensors --clear-existing
```

## API Endpoints

### Get All Sensors for a Farm
```
GET /api/sensors/sensors/by_farm/?farm_id=1
```

### Get Sensor Details
```
GET /api/sensors/sensors/{sensor_id}/
```

### Get Sensor Readings
```
GET /api/sensors/sensors/{sensor_id}/readings/?hours=24
```

### Get All Sensor Types
```
GET /api/sensors/types/
```

## Sensor Data Structure

Each sensor has:
- **ID**: Unique identifier
- **Farm**: Associated farm
- **Sensor Type**: Type of sensor (moisture, temperature, etc.)
- **Name**: Descriptive name
- **Location**: Physical location description
- **Status**: Active/Inactive
- **Readings**: Historical sensor readings

## Next Steps for Simulation

1. **Generate Sensor Readings**: Create readings for all sensors based on:
   - Current weather conditions
   - Time of day
   - Soil conditions
   - Irrigation status

2. **Real-time Updates**: Update sensor readings during simulation runs

3. **Historical Data**: Maintain historical sensor data for analysis

4. **Integration**: Use sensor data in irrigation automation decisions

## Sensor Types Available

1. Soil Moisture (%)
2. Soil Temperature (°C)
3. Soil Electrical Conductivity (mS/cm)
4. Water Quality/Salinity (ppm)
5. Water Flow (L/min)
6. Air Temperature (°C)
7. Air Humidity (%)
8. Rain Gauge (mm)
9. Photosynthetic Active Radiation (µmol/m²/s)
10. Solar Irradiance (W/m²)

## Usage in Automation

These sensors provide critical data for:
- **Irrigation Automation**: Soil moisture levels trigger irrigation
- **Energy Management**: Solar irradiance affects PV output
- **Weather Monitoring**: Temperature and humidity affect crop conditions
- **Water Management**: Flow sensors track irrigation efficiency

