#!/usr/bin/env python
"""
Script to update existing farms to new system specifications
Run with: python manage.py shell < update_existing_farms.py
Or: python manage.py shell, then copy-paste the code
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'climexa.settings')
django.setup()

from farms.models import Farm, SystemStatus

print("Updating farms to new system specifications...")
print("  System Size: 130 kW")
print("  Battery Capacity: 1,320 kWh")
print()

updated_count = 0
for farm in Farm.objects.all():
    print(f"Updating farm: {farm.name}")
    
    # Update system specifications
    farm.system_size_kw = 130.0
    farm.battery_capacity_kwh = 1320.0
    farm.save()
    print(f"  ✓ Updated system size to 130 kW, battery to 1,320 kWh")
    
    # Update system status
    status = SystemStatus.objects.filter(farm=farm).first()
    if status:
        # Recalculate battery_kwh based on battery_level percentage
        new_battery_kwh = (float(status.battery_level) / 100.0) * 1320.0
        status.battery_kwh = new_battery_kwh
        status.save()
        print(f"  ✓ Updated battery_kwh to {new_battery_kwh:.2f} kWh ({status.battery_level}%)")
    else:
        print(f"  ⚠ No system status found for {farm.name}")
    
    updated_count += 1
    print()

print(f"\n✓ Successfully updated {updated_count} farm(s)")

