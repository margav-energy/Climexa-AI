# Climexa AI - Setup Guide

## Quick Start

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Create database (in PostgreSQL)
createdb climexa_db

# Run migrations
cd backend
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Create sensor types
python manage.py create_sensor_types

# Start server
python manage.py runserver
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Creating Test Users

### Create a Farmer User

```python
python manage.py shell
```

```python
from farms.models import User
farmer = User.objects.create_user(
    username='farmer1',
    password='password123',
    email='farmer@example.com',
    role='farmer'
)
```

### Create a Climexa Staff User

```python
staff = User.objects.create_user(
    username='climexa_staff',
    password='password123',
    email='staff@climexa.com',
    role='climexa_staff'
)
```

### Create a Farm

```python
from farms.models import Farm, SystemStatus

farm = Farm.objects.create(
    name='Test Farm',
    farmer=farmer,
    latitude=-19.858523,
    longitude=28.214192,
    system_size_kw=5.0,
    battery_capacity_kwh=20.0
)

# Create initial status
SystemStatus.objects.create(
    farm=farm,
    battery_level=70.0
)
```

## Testing the System

1. **Login as Farmer**: Go to `http://localhost:3000/login` and login with farmer credentials
2. **View Dashboard**: You'll see the farmer dashboard with farm status
3. **Login as Climexa Staff**: Logout and login with staff credentials
4. **View Company Dashboard**: See all farms and alerts

## API Testing

### Update Farm Status (Triggers Open-Meteo API call)

```bash
curl -X POST http://localhost:8000/api/automation/update/1/ \
  -H "Cookie: sessionid=YOUR_SESSION_ID"
```

### Get Farmer Dashboard

```bash
curl http://localhost:8000/api/farmer/farms/1/dashboard/ \
  -H "Cookie: sessionid=YOUR_SESSION_ID"
```

## Environment Variables

Create a `.env` file in the project root:

```
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=climexa_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l | grep climexa_db`

### CORS Issues
- Ensure `CORS_ALLOWED_ORIGINS` in `settings.py` includes your frontend URL
- Check that frontend is running on `http://localhost:3000`

### Authentication Issues
- Ensure cookies are enabled in browser
- Check that `withCredentials: true` is set in API calls
- Verify session middleware is enabled in Django

