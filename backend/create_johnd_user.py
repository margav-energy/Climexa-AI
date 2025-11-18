#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'climexa.settings')
django.setup()

from farms.models import User, Farm, SystemStatus

# Create or get JohnD user
user, created = User.objects.get_or_create(
    username='JohnD',
    defaults={
        'email': 'johnd@example.com',
        'role': 'farmer'
    }
)

# Set password
user.set_password('password123')
user.save()

if created:
    print(f"Created user: {user.username}")
else:
    print(f"Updated user: {user.username}")

print(f"Password set to: password123")

# Assign existing farms to JohnD
farms = Farm.objects.filter(farmer__username__in=['John', 'JohnD'])
for farm in farms:
    farm.farmer = user
    farm.save()
    print(f"Assigned farm '{farm.name}' to {user.username}")

# Create a farm if none exist
if not Farm.objects.filter(farmer=user).exists():
    farm = Farm.objects.create(
        name=f"{user.username}'s Farm",
        farmer=user,
        latitude=-19.858523,
        longitude=28.214192,
        system_size_kw=5.0,
        battery_capacity_kwh=20.0,
        panel_efficiency=0.18,
        load_kw=2.0,
        tilt=23,
        azimuth=180,
        timezone='auto',
    )
    SystemStatus.objects.create(
        farm=farm,
        battery_level=70.0,
        battery_kwh=14.0,
        pv_output_kw=0.0
    )
    print(f"Created farm: {farm.name}")

print(f"\n✓ User '{user.username}' is ready!")
print(f"  Username: JohnD")
print(f"  Password: password123")

