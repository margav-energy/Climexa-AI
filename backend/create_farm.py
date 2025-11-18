#!/usr/bin/env python
"""
Quick script to create a farm for a farmer user
Run: python manage.py shell < create_farm.py
Or: python manage.py shell, then copy-paste the code
"""
from farms.models import User, Farm, SystemStatus

# Get or create a farmer user
user, created = User.objects.get_or_create(
    username='farmer1',
    defaults={
        'email': 'farmer@example.com',
        'role': 'farmer'
    }
)

if created:
    user.set_password('password123')
    user.save()
    print(f"✓ Created user: {user.username} (password: password123)")
else:
    print(f"✓ Using existing user: {user.username}")

# Create farm
farm, farm_created = Farm.objects.get_or_create(
    name=f"{user.username}'s Farm",
    farmer=user,
    defaults={
        'latitude': -19.858523,
        'longitude': 28.214192,
        'system_size_kw': 5.0,
        'battery_capacity_kwh': 20.0,
        'panel_efficiency': 0.18,
        'load_kw': 2.0,
        'tilt': 23,
        'azimuth': 180,
        'timezone': 'auto',
    }
)

if farm_created:
    # Create system status
    SystemStatus.objects.create(
        farm=farm,
        battery_level=70.0,
        battery_kwh=14.0,
        pv_output_kw=0.0
    )
    print(f"✓ Created farm: {farm.name}")
    print(f"  Farm ID: {farm.id}")
else:
    print(f"✓ Farm already exists: {farm.name}")

print(f"\nYou can now login as:")
print(f"  Username: {user.username}")
print(f"  Password: password123")

