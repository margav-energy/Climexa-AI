#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'climexa.settings')
django.setup()

from farms.models import User, Farm, SystemStatus

# Get JohnD user
try:
    user = User.objects.get(username='JohnD')
    print(f"Found user: {user.username} (role: {user.role})")
    
    # Create farm
    farm, created = Farm.objects.get_or_create(
        name=f"{user.username}'s Farm",
        farmer=user,
        defaults={
            'latitude': -19.858523,
            'longitude': 28.214192,
            'system_size_kw': 130.0,  # 130kW system
            'battery_capacity_kwh': 1320.0,  # 1,320kWh battery
            'panel_efficiency': 0.18,
            'load_kw': 2.0,
            'tilt': 23,
            'azimuth': 180,
            'timezone': 'auto',
        }
    )
    
    if created:
        # Create system status
        SystemStatus.objects.create(
            farm=farm,
            battery_level=70.0,
            battery_kwh=924.0,  # 70% of 1,320kWh
            pv_output_kw=0.0
        )
        print(f"Created farm: {farm.name}")
        print(f"  Farm ID: {farm.id}")
    else:
        print(f"Farm already exists: {farm.name}")
        print(f"  Farm ID: {farm.id}")
        
except User.DoesNotExist:
    print("User 'JohnD' not found!")
    print("Available users:")
    for u in User.objects.all():
        print(f"  - {u.username} (role: {u.role})")

