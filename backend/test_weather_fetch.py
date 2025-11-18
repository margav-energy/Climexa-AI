#!/usr/bin/env python
"""Test script to check Open Meteo API and PV calculation"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'climexa.settings')
django.setup()

from farms.models import Farm
from automation.services import update_farm_status, calculate_pv_power
from decimal import Decimal

# Get a farm
farm = Farm.objects.first()
if not farm:
    print("No farms found!")
    exit(1)

print(f"Testing weather fetch for: {farm.name}")
print(f"  Location: {farm.latitude}, {farm.longitude}")
print(f"  System Size: {farm.system_size_kw} kW")
print(f"  Panel Efficiency: {farm.panel_efficiency * 100}%")
print(f"  Tilt: {farm.tilt}°, Azimuth: {farm.azimuth}°")
print()

# Update status
print("Updating farm status...")
try:
    status = update_farm_status(farm)
    print(f"\n✓ Status updated successfully!")
    print(f"  GTI: {status.gti} W/m²")
    print(f"  PV Output: {status.pv_output_kw} kW")
    print(f"  Temperature: {status.current_temperature}°C")
    print(f"  Clouds: {status.current_clouds}%")
    print(f"  Rain: {status.current_rain} mm")
    print(f"  Battery: {status.battery_level}% ({status.battery_kwh} kWh)")
    print(f"  Irrigation: {'ON' if status.irrigation_on else 'OFF'}")
    print(f"  Last Updated: {status.last_updated}")
    
    # Test calculation
    print(f"\nCalculation check:")
    print(f"  Formula: kWh = GTI (W/m²) * efficiency * system_kw / 1000")
    print(f"  Calculation: {status.gti} * {farm.panel_efficiency} * {farm.system_size_kw} / 1000")
    expected = calculate_pv_power(status.gti, farm.panel_efficiency, farm.system_size_kw)
    print(f"  Expected PV Output: {expected} kW")
    print(f"  Actual PV Output: {status.pv_output_kw} kW")
    
    if status.gti == 0:
        print(f"\n⚠ WARNING: GTI is 0. This could mean:")
        print(f"  - It's nighttime (no solar irradiance)")
        print(f"  - API returned no data")
        print(f"  - Check the API response manually")
        
except Exception as e:
    print(f"\n✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()

