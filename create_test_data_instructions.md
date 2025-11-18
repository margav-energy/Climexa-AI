# Create Test Data Instructions

## Quick Method: Using Django Shell

1. **Open Django shell:**
   ```bash
   cd backend
   python manage.py shell
   ```

2. **Copy and paste this code:**
   ```python
   from farms.models import User, Farm, SystemStatus

   # Create or get farmer
   farmer, created = User.objects.get_or_create(
       username='farmer1',
       defaults={'email': 'farmer@example.com', 'role': 'farmer'}
   )
   if created:
       farmer.set_password('password123')
       farmer.save()
       print("Created farmer: farmer1")

   # Create farm for farmer
   farm, created = Farm.objects.get_or_create(
       name='Test Farm',
       farmer=farmer,
       defaults={
           'latitude': -19.858523,
           'longitude': 28.214192,
           'system_size_kw': 5.0,
           'battery_capacity_kwh': 20.0,
       }
   )
   if created:
       SystemStatus.objects.create(farm=farm, battery_level=70.0, battery_kwh=14.0)
       print("Created farm: Test Farm")

   # Create Climexa staff
   staff, created = User.objects.get_or_create(
       username='climexa_staff',
       defaults={'email': 'staff@climexa.com', 'role': 'climexa_staff'}
   )
   if created:
       staff.set_password('password123')
       staff.save()
       print("Created staff: climexa_staff")
   ```

3. **Exit shell:** Type `exit()` or press Ctrl+D

## Test Credentials

- **Farmer:** username=`farmer1`, password=`password123`
- **Climexa Staff:** username=`climexa_staff`, password=`password123`

## Verify

1. **Check if backend is running:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Login at:** `http://localhost:3000/login`
   - Use `farmer1` / `password123` to see the farmer dashboard
   - Use `climexa_staff` / `password123` to see the company dashboard

