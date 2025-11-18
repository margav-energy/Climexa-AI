# Open Meteo Integration Guide

## Current Integration

Open Meteo is **already integrated** and working! Here's how it works:

### Backend Integration

1. **Location**: `backend/automation/services.py`
   - `fetch_weather_data(farm)` - Fetches weather from Open Meteo API
   - Uses farm's latitude, longitude, tilt, and azimuth
   - Gets: GTI, temperature, clouds, precipitation, and forecast

2. **Automation Logic**: 
   - PV power calculation from GTI
   - Irrigation decisions based on weather and battery
   - Energy flow simulation

3. **API Endpoints**:
   - `POST /api/automation/update/<farm_id>/` - Update single farm
   - `POST /api/automation/update-all/` - Update all farms
   - `GET /api/automation/weather/<farm_id>/` - Get weather forecast

### How to Use

#### 1. Manual Update (via Frontend)
- Click "Refresh Status" button in Farmer Dashboard
- Or use "Refresh All" in Climexa Dashboard

#### 2. Manual Update (via API)
```bash
curl -X POST http://localhost:8000/api/automation/update/1/ \
  -H "Cookie: sessionid=YOUR_SESSION"
```

#### 3. Automatic Updates (Scheduled)

**Option A: Using Django Management Command**
```bash
# Run manually
cd backend
python manage.py update_all_farms

# Schedule with Windows Task Scheduler or cron
# Every 30 minutes: */30 * * * * cd /path/to/project/backend && python manage.py update_all_farms
```

**Option B: Using Celery (Recommended for Production)**
```python
# Already in requirements.txt
# Set up Celery beat for periodic tasks
```

#### 4. Get Weather Forecast
```bash
curl http://localhost:8000/api/automation/weather/1/ \
  -H "Cookie: sessionid=YOUR_SESSION"
```

### What Open Meteo Provides

- **Global Tilted Irradiance (GTI)** - Solar energy on panels
- **Temperature** - Current air temperature
- **Cloud Cover** - Percentage of cloud coverage
- **Precipitation** - Rainfall amount
- **Forecast** - Tomorrow's weather for planning

### Automation Rules

The system uses Open Meteo data to:
1. **Calculate PV Output** - From GTI and panel specs
2. **Control Irrigation** - Based on rain, clouds, and battery
3. **Manage Energy** - Optimize battery usage based on forecast

### Testing

1. **Test Open Meteo connection**:
   ```bash
   cd backend
   python manage.py shell
   ```
   ```python
   from farms.models import Farm
   from automation.services import fetch_weather_data
   farm = Farm.objects.first()
   current, forecast = fetch_weather_data(farm)
   print(f"Current GTI: {current['gti']} W/m²")
   print(f"Temperature: {current['temperature']}°C")
   print(f"Clouds: {current['clouds']}%")
   ```

2. **Update a farm**:
   ```python
   from automation.services import update_farm_status
   status = update_farm_status(farm)
   print(f"PV Output: {status.pv_output_kw} kW")
   print(f"Irrigation: {status.irrigation_on}")
   ```

### Frontend Display

The weather data is already displayed in:
- **Farmer Dashboard**: Weather card shows temperature, rain, clouds
- **Status Cards**: PV generation uses GTI from Open Meteo
- **Irrigation Status**: Shows reason based on weather forecast

### Next Steps (Optional Enhancements)

1. **Add Weather Forecast Chart** - Show 7-day forecast
2. **Historical Weather Data** - Track trends
3. **Weather Alerts** - Notify about extreme weather
4. **Multi-location Support** - Different forecasts for different farm areas


