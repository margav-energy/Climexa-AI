"""
AI Service for Climexa - Provides intelligent suggestions to farmers
based on weather forecasts, farm conditions, and best practices
"""
from decimal import Decimal
from datetime import datetime, timedelta
from farms.models import Farm, SystemStatus


def generate_farmer_suggestions(farm, status, weather_forecast):
    """
    Generate AI-powered suggestions for farmers based on:
    - 7-day weather forecast
    - Current farm conditions (battery, irrigation, etc.)
    - Best farming practices
    """
    suggestions = []
    priority = "info"  # info, warning, success
    
    # Extract forecast data
    daily_forecast = weather_forecast.get("daily", {})
    hourly_forecast = weather_forecast.get("hourly", {})
    
    # Current conditions
    battery_level = float(status.battery_level) if status else 70.0
    irrigation_on = status.irrigation_on if status else False
    current_temp = float(status.current_temperature) if status and status.current_temperature else 25.0
    current_rain = float(status.current_rain) if status else 0.0
    
    # Analyze next 7 days
    if daily_forecast:
        temps = daily_forecast.get("temperature_2m_max", [])
        rains = daily_forecast.get("precipitation_sum", [])
        dates = daily_forecast.get("time", [])
        
        # Check for extreme weather
        if temps:
            max_temp = max(temps[:7]) if len(temps) >= 7 else max(temps)
            min_temp = min(temps[:7]) if len(temps) >= 7 else min(temps)
            
            if max_temp > 35:
                suggestions.append({
                    "type": "warning",
                    "title": "High Temperature Alert",
                    "message": f"Temperatures will reach up to {max_temp:.1f}°C this week. Consider increasing irrigation frequency to prevent crop stress.",
                    "icon": "🌡️",
                    "priority": "high"
                })
            
            if min_temp < 5:
                suggestions.append({
                    "type": "warning",
                    "title": "Frost Warning",
                    "message": f"Temperatures may drop to {min_temp:.1f}°C. Protect sensitive crops from frost damage.",
                    "icon": "❄️",
                    "priority": "high"
                })
        
        # Check for heavy rain
        if rains:
            total_rain = sum(rains[:7]) if len(rains) >= 7 else sum(rains)
            max_daily_rain = max(rains[:7]) if len(rains) >= 7 else max(rains)
            
            if total_rain > 50:
                suggestions.append({
                    "type": "info",
                    "title": "Heavy Rainfall Expected",
                    "message": f"Expect {total_rain:.1f}mm of rain over the next 7 days. Irrigation may not be needed.",
                    "icon": "🌧️",
                    "priority": "medium"
                })
            
            if max_daily_rain > 20:
                suggestions.append({
                    "type": "warning",
                    "title": "Heavy Rain Day",
                    "message": f"One day will have {max_daily_rain:.1f}mm of rain. Ensure proper drainage.",
                    "icon": "⛈️",
                    "priority": "high"
                })
        
        # Check for dry period
        if rains:
            dry_days = sum(1 for r in rains[:7] if r < 1.0)
            if dry_days >= 5 and not irrigation_on:
                suggestions.append({
                    "type": "warning",
                    "title": "Extended Dry Period",
                    "message": f"{dry_days} days with minimal rain expected. Consider activating irrigation system.",
                    "icon": "🌵",
                    "priority": "high"
                })
    
    # Battery management suggestions
    if battery_level < 30:
        suggestions.append({
            "type": "warning",
            "title": "Low Battery",
            "message": f"Battery is at {battery_level:.1f}%. Conserve energy by reducing non-essential loads.",
            "icon": "🔋",
            "priority": "high"
        })
    elif battery_level > 80:
        suggestions.append({
            "type": "success",
            "title": "Battery Fully Charged",
            "message": f"Battery is at {battery_level:.1f}%. You can use more energy-intensive operations.",
            "icon": "⚡",
            "priority": "low"
        })
    
    # Irrigation suggestions
    if current_rain > 5 and irrigation_on:
        suggestions.append({
            "type": "info",
            "title": "Rain Detected",
            "message": "It's currently raining. Irrigation has been automatically paused to save water.",
            "icon": "💧",
            "priority": "medium"
        })
    
    # Optimal planting/harvesting windows
    if daily_forecast:
        temps = daily_forecast.get("temperature_2m_mean", [])
        rains = daily_forecast.get("precipitation_sum", [])
        
        if temps and rains:
            # Find best days for planting (moderate temp, low rain)
            best_days = []
            for i, (temp, rain) in enumerate(zip(temps[:7], rains[:7])):
                if 15 <= temp <= 28 and rain < 5:
                    best_days.append(i + 1)
            
            if best_days:
                suggestions.append({
                    "type": "success",
                    "title": "Optimal Planting Window",
                    "message": f"Days {', '.join(map(str, best_days))} have ideal conditions for planting (moderate temperature, low rain).",
                    "icon": "🌱",
                    "priority": "medium"
                })
    
    # Energy optimization
    if status and status.pv_output_kw:
        pv_output = float(status.pv_output_kw)
        if pv_output < 1.0:
            suggestions.append({
                "type": "info",
                "title": "Low Solar Generation",
                "message": f"Current PV output is {pv_output:.2f}kW. Cloudy conditions detected. Battery charging may be slow.",
                "icon": "☁️",
                "priority": "medium"
            })
        elif pv_output > 3.0:
            suggestions.append({
                "type": "success",
                "title": "Excellent Solar Conditions",
                "message": f"High PV output of {pv_output:.2f}kW. Great time to run energy-intensive tasks.",
                "icon": "☀️",
                "priority": "low"
            })
    
    # Default suggestion if none generated
    if not suggestions:
        suggestions.append({
            "type": "success",
            "title": "All Systems Normal",
            "message": "Your farm systems are operating optimally. Continue monitoring weather forecasts.",
            "icon": "✅",
            "priority": "low"
        })
    
    # Sort by priority (high, medium, low)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))
    
    return suggestions


def get_optimal_irrigation_schedule(weather_forecast):
    """
    Calculate optimal irrigation schedule based on weather forecast
    """
    hourly = weather_forecast.get("hourly", {})
    times = hourly.get("time", [])
    rains = hourly.get("precipitation", [])
    temps = hourly.get("temperature_2m", [])
    
    schedule = []
    
    if times and rains and temps:
        # Analyze next 48 hours
        for i in range(min(48, len(times))):
            if i < len(rains) and i < len(temps):
                rain = rains[i]
                temp = temps[i]
                time_str = times[i]
                
                # Suggest irrigation if: no rain, temp > 20°C, and it's daytime
                if rain < 0.5 and temp > 20:
                    schedule.append({
                        "time": time_str,
                        "recommended": True,
                        "reason": f"Optimal conditions: {temp:.1f}°C, no rain"
                    })
    
    return schedule[:10]  # Return top 10 recommendations


