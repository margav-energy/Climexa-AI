"""
Script to create test data for Climexa
Run with: python manage.py shell < create_test_data.py
Or: python manage.py shell, then copy-paste the code
"""
from farms.models import User, Farm, SystemStatus

# Create a test farmer if doesn't exist
farmer, created = User.objects.get_or_create(
    username='farmer1',
    defaults={
        'email': 'farmer@example.com',
        'role': 'farmer'
    }
)
if created:
    farmer.set_password('password123')
    farmer.save()
    print(f"Created farmer: {farmer.username}")
else:
    print(f"Farmer already exists: {farmer.username}")

# Create a test farm for the farmer
farm, created = Farm.objects.get_or_create(
    name='Test Farm',
    farmer=farmer,
    defaults={
        'latitude': -19.858523,
        'longitude': 28.214192,
        'system_size_kw': 130.0,  # 130kW system
        'battery_capacity_kwh': 1320.0,  # 1,320kWh battery
        'panel_efficiency': 0.18,
        'load_kw': 2.0,
        'tilt': 23,
        'azimuth': 180,
    }
)

if created:
    print(f"Created farm: {farm.name}")
    # Create initial system status
    SystemStatus.objects.create(
        farm=farm,
        battery_level=70.0,
        battery_kwh=924.0  # 70% of 1,320kWh
    )
    print(f"Created system status for {farm.name}")
else:
    print(f"Farm already exists: {farm.name}")

# Create Climexa staff user
staff, created = User.objects.get_or_create(
    username='climexa_staff',
    defaults={
        'email': 'staff@climexa.com',
        'role': 'climexa_staff'
    }
)
if created:
    staff.set_password('password123')
    staff.save()
    print(f"Created Climexa staff: {staff.username}")
else:
    print(f"Climexa staff already exists: {staff.username}")

print("\nTest users created:")
print(f"  Farmer: username='farmer1', password='password123'")
print(f"  Staff: username='climexa_staff', password='password123'")
print(f"\nFarm created: {farm.name} for {farmer.username}")

