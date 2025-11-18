from farms.models import User, Farm, SystemStatus

# Get JohnD user
try:
    user = User.objects.get(username='JohnD')
    print(f"Found user: {user.username} (role: {user.role})")
except User.DoesNotExist:
    print("User 'JohnD' not found!")
    exit()

# Create farm
farm, created = Farm.objects.get_or_create(
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

if created:
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
    print(f"  Farm ID: {farm.id}")

