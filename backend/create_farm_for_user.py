"""
Create a farm for the currently logged-in user
Run this in Django shell: python manage.py shell
Then copy-paste the code below
"""

from farms.models import User, Farm, SystemStatus

# Get all users to see who exists
print("Available users:")
for user in User.objects.all():
    print(f"  - {user.username} (role: {user.role})")

# Create a farm for farmer1 (or change username as needed)
username = input("\nEnter username to create farm for (or press Enter for 'farmer1'): ").strip() or 'farmer1'

try:
    user = User.objects.get(username=username)
    
    # Create farm
    farm, created = Farm.objects.get_or_create(
        name=f'{user.username}\'s Farm',
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
        # Create initial system status
        SystemStatus.objects.create(
            farm=farm,
            battery_level=70.0,
            battery_kwh=14.0,
            pv_output_kw=0.0
        )
        print(f"\n✓ Created farm '{farm.name}' for user '{user.username}'")
        print(f"  Farm ID: {farm.id}")
    else:
        print(f"\n✓ Farm '{farm.name}' already exists for user '{user.username}'")
        print(f"  Farm ID: {farm.id}")
        
except User.DoesNotExist:
    print(f"\n✗ User '{username}' not found!")
    print("Available users:")
    for u in User.objects.all():
        print(f"  - {u.username}")

