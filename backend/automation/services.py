"""
Automation service for Climexa AI system
Handles Open-Meteo API calls, PV calculations, and irrigation logic
"""
import requests
from decimal import Decimal
from django.utils import timezone
from farms.models import Farm, SystemStatus


# Configuration constants
MIN_BATTERY = 20  # % limit to protect battery (but irrigation can override if critical)
MAX_BATTERY = 80  # % where we allow heavy usage
CLOUD_THRESHOLD = 60  # Cloud cover threshold
SOIL_MOISTURE_LOW = 30  # % - below this, irrigation is critical
SOIL_MOISTURE_OPTIMAL = 50  # % - target moisture level
SOIL_MOISTURE_HIGH = 70  # % - above this, irrigation not needed

# Load Categories and Priorities
DOMESTIC_LOAD_BASE = 1.0  # Essential load (kW)
IRRIGATION_LOAD = 2.0  # Critical load (kW)
WATER_TREATMENT_LOAD = 1.5  # Non-essential load (kW)
GRID_LOAD = 0.0  # Non-essential (export to grid, not a load)

# Load Priorities
LOAD_PRIORITY_ESSENTIAL = "essential"  # Domestic
LOAD_PRIORITY_CRITICAL = "critical"  # Irrigation
LOAD_PRIORITY_NON_ESSENTIAL = "non_essential"  # Water treatment, Grid


def fetch_weather_data(farm, forecast_days=7):
    """Fetch current and forecast weather data from Open-Meteo"""
    # Open Meteo API documentation: https://open-meteo.com/en/docs
    # Use /v1/forecast endpoint with solar parameters
    # timezone="auto" is supported and will auto-resolve to local timezone
    
    # Hourly data for detailed forecast
    hourly_url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={farm.latitude}&longitude={farm.longitude}"
        "&hourly=temperature_2m,precipitation,cloud_cover,"
        "shortwave_radiation,direct_radiation,diffuse_radiation,"
        "direct_normal_irradiance,global_tilted_irradiance,relative_humidity_2m,"
        "soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,"
        "soil_temperature_6cm"
        f"&tilt={farm.tilt}&azimuth={farm.azimuth}"
        f"&timezone={farm.timezone}"
        f"&forecast_days={forecast_days}"
    )
    
    # Daily aggregated data for 7-day forecast
    daily_url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={farm.latitude}&longitude={farm.longitude}"
        "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
        "precipitation_sum,precipitation_probability_max,weather_code,"
        "sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant"
        f"&timezone={farm.timezone}"
        f"&forecast_days={forecast_days}"
    )
    
    return hourly_url, daily_url


def get_full_weather_forecast(farm, forecast_days=7):
    """Get full 7-day weather forecast with hourly and daily data"""
    hourly_url, daily_url = fetch_weather_data(farm, forecast_days)
    
    try:
        # Get hourly and daily data
        hourly_response = requests.get(hourly_url, timeout=10)
        hourly_response.raise_for_status()
        hourly_data = hourly_response.json()
        
        daily_response = requests.get(daily_url, timeout=10)
        daily_response.raise_for_status()
        daily_data = daily_response.json()
        
        # Get current conditions from hourly data
        hourly = hourly_data.get("hourly", {})
        now = 0
        tomorrow = 24
        
        gti_values = hourly.get("global_tilted_irradiance", [0])
        cloud_values = hourly.get("cloud_cover", [0])
        rain_values = hourly.get("precipitation", [0])
        temp_values = hourly.get("temperature_2m", [0])
        
        current_weather = {
            "gti": Decimal(str(gti_values[now] if gti_values and len(gti_values) > now else 0)),
            "clouds": Decimal(str(cloud_values[now] if cloud_values and len(cloud_values) > now else 0)),
            "rain": Decimal(str(rain_values[now] if rain_values and len(rain_values) > now else 0)),
            "temperature": Decimal(str(temp_values[now] if temp_values and len(temp_values) > now else 0)),
        }
        
        forecast_tomorrow = {
            "clouds": Decimal(str(cloud_values[tomorrow] if cloud_values and len(cloud_values) > tomorrow else 0)),
            "rain": Decimal(str(rain_values[tomorrow] if rain_values and len(rain_values) > tomorrow else 0)),
        }
        
        # Combine hourly and daily data for full forecast
        full_forecast = {
            "hourly": hourly,
            "daily": daily_data.get("daily", {}),
            "timezone": hourly_data.get("timezone", farm.timezone),
            "latitude": hourly_data.get("latitude", farm.latitude),
            "longitude": hourly_data.get("longitude", farm.longitude),
        }
        
        return current_weather, forecast_tomorrow, full_forecast
    except Exception as e:
        # Log error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Open Meteo API error for farm {farm.name}: {str(e)}")
        
        # Return default values on error
        return {
            "gti": Decimal('0'),
            "clouds": Decimal('0'),
            "rain": Decimal('0'),
            "temperature": Decimal('0'),
        }, {
            "clouds": Decimal('0'),
            "rain": Decimal('0'),
        }, {
            "hourly": {},
            "daily": {},
            "timezone": farm.timezone,
            "latitude": farm.latitude,
            "longitude": farm.longitude,
        }


def calculate_pv_power(gti, panel_efficiency, system_size_kw):
    """
    Calculate PV output from GTI (Global Tilted Irradiance)
    
    Formula: kWh = irradiance (W/m²) * panel_eff * system_kw / 1000
    
    For hourly calculations: kW output = kWh produced in that hour
    (since power * 1 hour = energy)
    
    Args:
        gti: Global Tilted Irradiance in W/m²
        panel_efficiency: Panel efficiency (e.g., 0.18 for 18%)
        system_size_kw: Total system size in kW (e.g., 130kW)
    
    Returns:
        PV output in kW (which equals kWh for that hour)
    """
    # Convert GTI (W/m²) to kWh produced in that hour
    # Formula: kWh = irradiance (W/m²) * panel_eff * system_kw / 1000
    pv_output_kw = (gti * Decimal(str(panel_efficiency)) * Decimal(str(system_size_kw))) / Decimal('1000')
    return round(pv_output_kw, 2)


def get_current_soil_moisture(farm):
    """
    Get the most recent soil moisture reading from sensors
    Returns average soil moisture percentage, or None if no sensors
    """
    from sensors.models import Sensor, SensorReading, SensorType
    
    try:
        # Get soil moisture sensor type
        soil_moisture_type = SensorType.objects.filter(
            name__icontains='Soil Moisture',
            category='soil'
        ).first()
        
        if not soil_moisture_type:
            return None
        
        # Get all active soil moisture sensors for this farm
        sensors = Sensor.objects.filter(
            farm=farm,
            sensor_type=soil_moisture_type,
            is_active=True
        )
        
        if not sensors.exists():
            return None
        
        # Get most recent reading from each sensor and average them
        moisture_values = []
        for sensor in sensors:
            latest_reading = SensorReading.objects.filter(
                sensor=sensor
            ).order_by('-timestamp').first()
            
            if latest_reading:
                moisture_values.append(float(latest_reading.value))
        
        if moisture_values:
            return sum(moisture_values) / len(moisture_values)
        
        return None
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error getting soil moisture for {farm.name}: {str(e)}")
        return None


def forecast_battery_next_hour(current_pv, forecast_pv, current_battery_level, battery_capacity_kwh, current_load):
    """
    Forecast if battery can reach 20% in the next hour
    
    Args:
        current_pv: Current PV output (kW)
        forecast_pv: Forecasted PV output for next hour (kW)
        current_battery_level: Current battery percentage
        battery_capacity_kwh: Battery capacity in kWh
        current_load: Current system load (kW)
    
    Returns:
        (can_reach_20: bool, forecasted_level: float)
    """
    # Calculate net power for next hour
    net_power = forecast_pv - current_load
    
    # Calculate battery change
    battery_kwh = (battery_capacity_kwh * Decimal(str(current_battery_level))) / Decimal('100')
    battery_kwh += net_power  # Add net power for next hour
    
    # Clamp to capacity
    battery_kwh = max(Decimal('0'), min(battery_kwh, battery_capacity_kwh))
    forecasted_level = float((battery_kwh / battery_capacity_kwh) * Decimal('100'))
    
    can_reach_20 = forecasted_level >= MIN_BATTERY
    
    return can_reach_20, forecasted_level


def automation_logic(current, forecast, battery_level, soil_moisture=None, hourly_forecast=None, current_hour=None):
    """
    Determine irrigation status based on:
    - Soil moisture content (primary driver)
    - Weather conditions (rain detection)
    - Battery level (with prioritization for critical irrigation)
    - Solar forecast (if battery can charge to 20% in next hour)
    
    Args:
        current: Current weather conditions
        forecast: Tomorrow's forecast
        battery_level: Current battery percentage
        soil_moisture: Current soil moisture percentage (None if unavailable)
        hourly_forecast: Hourly forecast data for next few hours
        current_hour: Current hour index in forecast (0 = current hour)
    
    Returns:
        (irrigation: bool, reason: str, priority: str)
        priority: 'critical', 'normal', or 'optional'
    """
    reason = ""
    irrigation = False
    priority = "optional"
    
    cloud_threshold = CLOUD_THRESHOLD
    
    # Determine irrigation need based on soil moisture
    irrigation_needed = False
    irrigation_critical = False
    
    if soil_moisture is not None:
        if soil_moisture < SOIL_MOISTURE_LOW:
            irrigation_needed = True
            irrigation_critical = True  # Very low moisture = critical
            priority = "critical"
        elif soil_moisture < SOIL_MOISTURE_OPTIMAL:
            irrigation_needed = True
            priority = "normal"
        elif soil_moisture >= SOIL_MOISTURE_HIGH:
            irrigation_needed = False
            priority = "optional"
    else:
        # If no soil moisture data, use weather-based heuristics
        # Assume irrigation might be needed if it's been dry
        irrigation_needed = current["rain"] == 0 and current["clouds"] < cloud_threshold
        priority = "normal"
    
    # Logic 1: If it's raining now, irrigation is not needed (nature is doing the job)
    if current["rain"] > 0.5:  # More than 0.5mm of rain
        irrigation = False
        reason = "Rain detected. Irrigation not needed."
        priority = "optional"
        return irrigation, reason, priority
    
    # Logic 2: If irrigation is needed (based on soil moisture)
    if irrigation_needed:
        # Check if battery is too low
        if battery_level < MIN_BATTERY:
            if irrigation_critical:
                # Logic: Battery is low AND soil moisture is low - keep irrigation ON (critical priority)
                irrigation = True
                reason = f"Critical: Low soil moisture ({soil_moisture:.1f}%) and low battery ({battery_level:.1f}%). Irrigation maintained as critical priority."
                priority = "critical"
            else:
                # Check if we can charge to 20% in next hour
                # This will be handled in update_farm_status with actual farm config
                irrigation = False
                reason = f"Battery low ({battery_level:.1f}%) and soil moisture ({soil_moisture:.1f}%) acceptable. Checking forecast..."
                priority = "normal"
        else:
            # Battery is sufficient
            if forecast["clouds"] > cloud_threshold:
                # Tomorrow will be cloudy - might want to conserve
                if irrigation_critical:
                    # But if critical, still irrigate
                    irrigation = True
                    reason = f"Critical: Low soil moisture ({soil_moisture:.1f}%) requires irrigation despite cloudy forecast."
                    priority = "critical"
                else:
                    irrigation = False
                    reason = "Cloudy tomorrow forecast. Conserving battery for critical needs."
                    priority = "normal"
            else:
                # Good conditions - allow irrigation
                irrigation = True
                if irrigation_critical:
                    reason = f"Critical: Low soil moisture ({soil_moisture:.1f}%). Irrigation activated."
                    priority = "critical"
                else:
                    reason = f"Soil moisture ({soil_moisture:.1f}%) below optimal. Irrigation activated."
                    priority = "normal"
    else:
        # Irrigation not needed (soil moisture is adequate)
        irrigation = False
        if soil_moisture is not None:
            reason = f"Soil moisture ({soil_moisture:.1f}%) is adequate. Irrigation not needed."
        else:
            reason = "Normal operation. No irrigation required."
        priority = "optional"
    
    return irrigation, reason, priority


def calculate_hourly_load(irrigation, hour_of_day, domestic_base=DOMESTIC_LOAD_BASE, 
                          water_treatment=False, use_battery=True, pv_output=Decimal('0')):
    """
    Calculate variable load based on:
    - Irrigation status (Critical priority)
    - Time of day (domestic usage patterns - Essential priority)
    - Water treatment (Non-essential priority)
    - Battery usage strategy (use solar directly at peak hours)
    
    Load varies throughout the day:
    - Night (22:00-06:00): Lower domestic usage
    - Morning (06:00-09:00): Higher domestic usage
    - Day (09:00-17:00): Moderate domestic usage
    - Evening (17:00-22:00): Higher domestic usage
    
    Load Prioritization:
    - Essential (Domestic): Always on
    - Critical (Irrigation): On when needed
    - Non-essential (Water treatment, Grid): Only when excess power available
    """
    # Base domestic load varies by time of day (Essential - always on)
    if 22 <= hour_of_day or hour_of_day < 6:
        # Night: minimal usage
        domestic_load = domestic_base * Decimal('0.5')
    elif 6 <= hour_of_day < 9:
        # Morning: higher usage (cooking, heating, etc.)
        domestic_load = domestic_base * Decimal('1.5')
    elif 9 <= hour_of_day < 17:
        # Day: moderate usage
        domestic_load = domestic_base * Decimal('1.0')
    else:  # 17 <= hour_of_day < 22
        # Evening: higher usage
        domestic_load = domestic_base * Decimal('1.3')
    
    # Critical load: Irrigation (if needed)
    irrigation_load = Decimal(str(IRRIGATION_LOAD)) if irrigation else Decimal('0')
    
    # Non-essential load: Water treatment (only if excess power)
    water_treatment_load = Decimal('0')
    if water_treatment:
        # Only run water treatment if PV output exceeds essential + critical loads
        essential_critical_load = domestic_load + irrigation_load
        if pv_output > essential_critical_load:
            # Use excess solar for water treatment
            excess_power = pv_output - essential_critical_load
            water_treatment_load = min(excess_power, Decimal(str(WATER_TREATMENT_LOAD)))
    
    # Total load
    total_load = domestic_load + irrigation_load + water_treatment_load
    
    # At peak hours, use solar directly instead of battery
    # This means if PV > Load, we should use PV directly and charge battery with excess
    # If PV < Load, we discharge battery
    # The battery should have inverse relationship with solar (discharge at night, charge during day)
    
    return total_load, domestic_load, irrigation_load, water_treatment_load


def simulate_energy_flow(pv_kw, irrigation, battery_level, battery_capacity_kwh, hour_of_day=12, 
                          priority="normal", water_treatment=False):
    """
    Simulate battery charge/discharge with variable loads and smart battery management
    
    Strategy:
    - At peak solar hours: Use solar directly, charge battery with excess
    - At night/low solar: Discharge battery to power loads
    - Battery should have inverse relationship with solar (discharge when no sun, charge when sun available)
    - Battery should charge to 100% by end of day
    
    Args:
        pv_kw: PV output in kW
        irrigation: Whether irrigation is on
        battery_level: Current battery percentage
        battery_capacity_kwh: Battery capacity in kWh
        hour_of_day: Current hour (0-23) for load calculation
        priority: Irrigation priority ('critical', 'normal', 'optional')
        water_treatment: Whether to run water treatment (non-essential)
    
    Returns:
        (new_battery_level, battery_kwh, total_load, domestic_load, irrigation_load, water_treatment_load)
    """
    # Calculate variable load with prioritization
    total_load, domestic_load, irrigation_load, water_treatment_load = calculate_hourly_load(
        irrigation, hour_of_day, use_battery=True, pv_output=pv_kw, water_treatment=water_treatment
    )
    
    # If irrigation is critical and battery is very low, reduce domestic load
    if priority == "critical" and battery_level < MIN_BATTERY:
        # Reduce domestic load to prioritize irrigation (but keep essential minimum)
        domestic_reduction = Decimal('0.3')  # Reduce domestic by 30% (keep 70% essential)
        domestic_load = domestic_load * Decimal('0.7')
        total_load = domestic_load + irrigation_load + water_treatment_load
    
    # Energy flow calculation
    # Net power = PV output - total load
    net = pv_kw - total_load
    
    # Current battery state
    battery_kwh = (battery_capacity_kwh * Decimal(str(battery_level))) / Decimal('100')
    
    # Smart battery management:
    # - If PV > Load: Charge battery (use solar directly for loads, excess charges battery)
    # - If PV < Load: Discharge battery (battery powers the deficit)
    # - At peak hours (high PV), prioritize using solar directly
    # - Battery should discharge at night (inverse of solar)
    
    # Determine if we're in peak solar hours (typically 10:00-15:00)
    is_peak_solar = 10 <= hour_of_day <= 15
    
    # Smart battery management:
    # - At peak hours: Use solar directly for loads, charge battery with excess
    # - This ensures battery charges efficiently and reaches 100% by end of day
    # - Battery should have inverse relationship with solar (discharge at night, charge during day)
    
    if is_peak_solar and pv_kw > total_load:
        # Peak solar hours: Use solar directly, charge battery with excess
        # This maximizes battery charging during peak hours
        excess_power = pv_kw - total_load
        battery_kwh += excess_power
    elif pv_kw > total_load:
        # Any time PV > Load: Charge battery with excess
        excess_power = pv_kw - total_load
        battery_kwh += excess_power
    else:
        # PV < Load: Discharge battery to power the deficit
        # This happens at night or during low solar periods
        battery_kwh += net  # net is negative, so battery discharges
    
    # Clamp to capacity limits (0% to 100%)
    battery_kwh = max(Decimal('0'), min(battery_kwh, battery_capacity_kwh))
    new_level = round((battery_kwh / battery_capacity_kwh) * Decimal('100'), 2)
    
    return new_level, float(battery_kwh), float(total_load), float(domestic_load), float(irrigation_load), float(water_treatment_load)


def update_farm_status(farm):
    """Update system status for a farm"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Get or create status
    status, created = SystemStatus.objects.get_or_create(farm=farm)
    
    # Fetch weather data (returns current, tomorrow, and full forecast)
    hourly_url, daily_url = fetch_weather_data(farm, forecast_days=7)
    
    logger.info(f"Fetching weather for {farm.name} from Open Meteo")
    logger.debug(f"Hourly URL: {hourly_url}")
    
    try:
        # Get hourly and daily data
        hourly_response = requests.get(hourly_url, timeout=10)
        hourly_response.raise_for_status()
        hourly_data = hourly_response.json()
        
        daily_response = requests.get(daily_url, timeout=10)
        daily_response.raise_for_status()
        daily_data = daily_response.json()
        
        hourly = hourly_data.get("hourly", {})
        
        # Check if we have the required data
        if not hourly:
            logger.warning(f"No hourly data returned for {farm.name}")
            raise ValueError("No hourly data in API response")
        
        # Get current hour index
        # Open Meteo returns data starting from 00:00 of current day, not current hour
        # We need to find the index that matches the current hour
        times = hourly.get("time", [])
        if times:
            from datetime import datetime
            # Get current UTC hour
            current_utc = datetime.utcnow()
            current_time_str = current_utc.strftime('%Y-%m-%dT%H:00')
            
            # Find the index of current hour
            try:
                if current_time_str in times:
                    now = times.index(current_time_str)
                else:
                    # If exact match not found, use the hour that's closest (should be 0 or 1)
                    # Calculate hours since midnight
                    hours_since_midnight = current_utc.hour
                    now = min(hours_since_midnight, len(times) - 1)
                    logger.info(f"Current hour not in times, using index {now} (hour {hours_since_midnight})")
            except Exception as e:
                logger.warning(f"Error finding current hour index: {e}, using 0")
                now = 0
        else:
            now = 0
        
        # Tomorrow is 24 hours from now
        if times:
            tomorrow = min(now + 24, len(times) - 1)
        else:
            tomorrow = now + 24
        
        # Get current weather - handle None values properly
        gti_values = hourly.get("global_tilted_irradiance")
        cloud_values = hourly.get("cloud_cover")
        rain_values = hourly.get("precipitation")
        temp_values = hourly.get("temperature_2m")
        
        # Safely extract values
        gti_val = gti_values[now] if gti_values and len(gti_values) > now and gti_values[now] is not None else 0
        cloud_val = cloud_values[now] if cloud_values and len(cloud_values) > now and cloud_values[now] is not None else 0
        rain_val = rain_values[now] if rain_values and len(rain_values) > now and rain_values[now] is not None else 0
        temp_val = temp_values[now] if temp_values and len(temp_values) > now and temp_values[now] is not None else 0
        
        current = {
            "gti": Decimal(str(gti_val)),
            "clouds": Decimal(str(cloud_val)),
            "rain": Decimal(str(rain_val)),
            "temperature": Decimal(str(temp_val)),
        }
        
        # Get tomorrow's forecast
        cloud_tomorrow = cloud_values[tomorrow] if cloud_values and len(cloud_values) > tomorrow and cloud_values[tomorrow] is not None else 0
        rain_tomorrow = rain_values[tomorrow] if rain_values and len(rain_values) > tomorrow and rain_values[tomorrow] is not None else 0
        
        forecast = {
            "clouds": Decimal(str(cloud_tomorrow)),
            "rain": Decimal(str(rain_tomorrow)),
        }
        
        logger.info(f"Weather data fetched: GTI={current['gti']} W/m², Temp={current['temperature']}°C, Clouds={current['clouds']}%")
        
    except Exception as e:
        logger.error(f"Error fetching weather for {farm.name}: {str(e)}", exc_info=True)
        # Use default values
        current = {
            "gti": Decimal('0'),
            "clouds": Decimal('0'),
            "rain": Decimal('0'),
            "temperature": Decimal('0'),
        }
        forecast = {
            "clouds": Decimal('0'),
            "rain": Decimal('0'),
        }
    
    # Calculate PV output
    pv_kw = calculate_pv_power(
        current["gti"],
        farm.panel_efficiency,
        farm.system_size_kw
    )
    
    # Get current soil moisture from sensors
    soil_moisture = get_current_soil_moisture(farm)
    
    # Get current hour for load calculation
    from datetime import datetime
    current_hour = datetime.utcnow().hour
    
    # Get hourly forecast for next hour prediction
    hourly_forecast = full_forecast.get('hourly', {})
    # Find current hour index in forecast
    times = hourly_forecast.get('time', [])
    current_hour_index = None
    if times:
        current_time_str = datetime.utcnow().strftime('%Y-%m-%dT%H:00')
        try:
            if current_time_str in times:
                current_hour_index = times.index(current_time_str)
            else:
                # Fallback: calculate hours since midnight
                current_hour_index = datetime.utcnow().hour
        except:
            current_hour_index = datetime.utcnow().hour
    
    # Pre-check: If battery is low and irrigation is needed (but not critical), check forecast
    irrigation_pre_check = None
    if current_hour_index is not None and hourly_forecast:
        forecast_gti = hourly_forecast.get("global_tilted_irradiance", [])
        if current_hour_index + 1 < len(forecast_gti):
            next_hour_gti = Decimal(str(forecast_gti[current_hour_index + 1]))
            forecast_pv = calculate_pv_power(next_hour_gti, farm.panel_efficiency, farm.system_size_kw)
            current_load_estimate = DOMESTIC_LOAD_BASE  # Without irrigation
            can_reach_20, forecasted_level = forecast_battery_next_hour(
                pv_kw, forecast_pv, float(status.battery_level),
                farm.battery_capacity_kwh, current_load_estimate
            )
            irrigation_pre_check = (can_reach_20, forecasted_level)
    
    # Determine irrigation status (now includes soil moisture and forecast)
    irrigation, reason, priority = automation_logic(
        current,
        forecast,
        float(status.battery_level),
        soil_moisture=float(soil_moisture) if soil_moisture is not None else None,
        hourly_forecast=hourly_forecast,
        current_hour=current_hour_index
    )
    
    # Override: If forecast shows we can reach 20% in next hour, turn on irrigation
    if not irrigation and irrigation_pre_check and irrigation_pre_check[0]:
        # Check if soil moisture needs irrigation
        if soil_moisture is not None and soil_moisture < SOIL_MOISTURE_OPTIMAL:
            irrigation = True
            reason = f"Forecast shows battery can reach {irrigation_pre_check[1]:.1f}% in next hour. Irrigation activated."
            priority = "normal"
    
    # Determine water treatment (non-essential, only if excess power)
    # For now, we'll calculate this in simulate_energy_flow
    water_treatment = False  # Can be made configurable or based on water quality sensors
    
    # Simulate energy flow with variable load and smart battery management
    new_battery_level, battery_kwh, total_load, domestic_load, irrigation_load, water_treatment_load = simulate_energy_flow(
        pv_kw,
        irrigation,
        float(status.battery_level),
        farm.battery_capacity_kwh,
        hour_of_day=current_hour,
        priority=priority,
        water_treatment=water_treatment
    )
    
    # Update status
    status.pv_output_kw = pv_kw
    status.gti = current["gti"]
    status.irrigation_on = irrigation
    status.irrigation_reason = reason
    status.irrigation_priority = priority
    status.battery_level = Decimal(str(new_battery_level))
    status.battery_kwh = Decimal(str(battery_kwh))
    status.current_temperature = current.get("temperature")
    status.current_rain = current["rain"]
    status.current_clouds = current["clouds"]
    status.current_load_kw = Decimal(str(total_load))
    
    # Store soil moisture if available
    if soil_moisture is not None:
        status.current_soil_moisture = Decimal(str(soil_moisture))
    else:
        status.current_soil_moisture = None
    
    status.last_updated = timezone.now()
    status.save()
    
    logger.info(
        f"Status updated: PV={pv_kw}kW, Battery={new_battery_level}%, "
        f"Irrigation={'ON' if irrigation else 'OFF'}, "
        f"Soil Moisture={soil_moisture:.1f}% if available, "
        f"Load={total_load:.2f}kW (Domestic:{domestic_load:.2f}, Irrigation:{irrigation_load:.2f}, Water:{water_treatment_load:.2f})"
    )
    
    return status

