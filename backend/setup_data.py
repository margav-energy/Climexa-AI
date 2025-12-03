"""
Script to create superuser, users, and farms
Run with: python manage.py shell < setup_data.py
Or: python manage.py shell, then copy-paste the code
"""
from farms.models import User, Farm, SystemStatus

print("=" * 60)
print("Setting up Climexa Data")
print("=" * 60)

# Create superuser (admin)
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@climexa.com',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True
    }
)
if created:
    admin_user.set_password('admin123')
    admin_user.save()
    print(f"✓ Created superuser: {admin_user.username} (password: admin123)")
else:
    if not admin_user.is_superuser:
        admin_user.is_superuser = True
        admin_user.is_staff = True
        admin_user.role = 'admin'
        admin_user.save()
        print(f"✓ Updated existing user to superuser: {admin_user.username}")
    else:
        print(f"✓ Superuser already exists: {admin_user.username}")

# Create farmer 1
farmer1, created = User.objects.get_or_create(
    username='farmer1',
    defaults={
        'email': 'farmer1@example.com',
        'role': 'farmer'
    }
)
if created:
    farmer1.set_password('password123')
    farmer1.save()
    print(f"✓ Created farmer: {farmer1.username} (password: password123)")
else:
    print(f"✓ Farmer already exists: {farmer1.username}")

# Create farm 1 for farmer1
farm1, created = Farm.objects.get_or_create(
    name='Green Valley Farm',
    farmer=farmer1,
    defaults={
        'latitude': -19.858523,
        'longitude': 28.214192,
        'system_size_kw': 130.0,
        'battery_capacity_kwh': 1320.0,
        'panel_efficiency': 0.18,
        'load_kw': 2.0,
        'tilt': 23,
        'azimuth': 180,
    }
)
if created:
    SystemStatus.objects.create(
        farm=farm1,
        battery_level=70.0,
        battery_kwh=924.0
    )
    print(f"✓ Created farm: {farm1.name} for {farmer1.username}")
else:
    print(f"✓ Farm already exists: {farm1.name}")

# Create farm 2 for farmer1
farm2, created = Farm.objects.get_or_create(
    name='Sunset Fields',
    farmer=farmer1,
    defaults={
        'latitude': -19.900000,
        'longitude': 28.250000,
        'system_size_kw': 100.0,
        'battery_capacity_kwh': 1000.0,
        'panel_efficiency': 0.18,
        'load_kw': 1.5,
        'tilt': 25,
        'azimuth': 180,
    }
)
if created:
    SystemStatus.objects.create(
        farm=farm2,
        battery_level=65.0,
        battery_kwh=650.0
    )
    print(f"✓ Created farm: {farm2.name} for {farmer1.username}")
else:
    print(f"✓ Farm already exists: {farm2.name}")

# Create farmer 2
farmer2, created = User.objects.get_or_create(
    username='farmer2',
    defaults={
        'email': 'farmer2@example.com',
        'role': 'farmer'
    }
)
if created:
    farmer2.set_password('password123')
    farmer2.save()
    print(f"✓ Created farmer: {farmer2.username} (password: password123)")
else:
    print(f"✓ Farmer already exists: {farmer2.username}")

# Create farm for farmer2
farm3, created = Farm.objects.get_or_create(
    name='Harvest Hills',
    farmer=farmer2,
    defaults={
        'latitude': -19.920000,
        'longitude': 28.300000,
        'system_size_kw': 80.0,
        'battery_capacity_kwh': 800.0,
        'panel_efficiency': 0.18,
        'load_kw': 1.8,
        'tilt': 22,
        'azimuth': 180,
    }
)
if created:
    SystemStatus.objects.create(
        farm=farm3,
        battery_level=75.0,
        battery_kwh=600.0
    )
    print(f"✓ Created farm: {farm3.name} for {farmer2.username}")
else:
    print(f"✓ Farm already exists: {farm3.name}")

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
    print(f"✓ Created Climexa staff: {staff.username} (password: password123)")
else:
    print(f"✓ Climexa staff already exists: {staff.username}")

print("\n" + "=" * 60)
print("Setup Complete!")
print("=" * 60)
print("\nCredentials:")
print(f"  Superuser: username='admin', password='admin123'")
print(f"  Farmer 1: username='farmer1', password='password123'")
print(f"  Farmer 2: username='farmer2', password='password123'")
print(f"  Staff: username='climexa_staff', password='password123'")
print("\nFarms created:")
for farm in Farm.objects.all():
    print(f"  - {farm.name} (Owner: {farm.farmer.username})")
print("=" * 60)

