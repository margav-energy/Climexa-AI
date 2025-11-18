# Quick Fix: Create Farm for Current User

The API is working! Your user just doesn't have any farms yet. Here's how to create one:

## Method 1: Using Django Shell (Easiest)

1. **Open a new terminal** and run:
   ```bash
   cd backend
   python manage.py shell
   ```

2. **Copy and paste this code:**
   ```python
   from farms.models import User, Farm, SystemStatus
   
   # Get the first farmer user (or change username)
   user = User.objects.filter(role='farmer').first()
   if not user:
       # Create a farmer if none exists
       user = User.objects.create_user(
           username='farmer1',
           password='password123',
           email='farmer@example.com',
           role='farmer'
       )
       print(f"Created user: {user.username}")
   
   # Create farm
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
       azimuth=180
   )
   
   # Create system status
   SystemStatus.objects.create(
       farm=farm,
       battery_level=70.0,
       battery_kwh=14.0
   )
   
   print(f"✓ Created farm '{farm.name}' for {user.username}")
   ```

3. **Refresh your browser** - the farm should now appear!

## Method 2: Using Django Admin

1. Go to `http://localhost:8000/admin`
2. Login with your admin credentials
3. Go to "Farms" → "Add Farm"
4. Select a farmer user and fill in the details
5. Save

## Method 3: Check Which User You're Logged In As

Check the browser console - you should see which user is authenticated. Then create a farm for that specific user.

