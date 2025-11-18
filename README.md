# Climexa AI - Smart Farming Systems

A comprehensive platform for managing smart, sustainable farming systems with AI-powered automation, renewable energy, and precision irrigation.

## Features

- **Farmer Dashboard**: Real-time monitoring of farm systems, battery levels, PV generation, and irrigation status
- **Climexa Company Dashboard**: Multi-farm monitoring and management for Climexa staff
- **Automated Irrigation**: AI-driven irrigation based on weather forecasts, soil conditions, and battery levels
- **Solar Energy Management**: PV generation tracking and battery optimization
- **Sensor Integration**: Real-time sensor data collection and visualization
- **Weather Integration**: Open-Meteo API for weather forecasting

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- PostgreSQL
- Python 3.8+

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts (for data visualization)

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Create PostgreSQL database:
```sql
CREATE DATABASE climexa_db;
```

5. Run migrations:
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

7. Create initial sensor types (optional):
```bash
python manage.py shell
# Then run:
# from sensors.models import SensorType
# SensorType.objects.create(name="Soil Moisture", category="soil", unit="%")
# SensorType.objects.create(name="Temperature", category="weather", unit="°C")
# ... etc
```

8. Start the Django server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Farmer Endpoints (`/api/farmer/`)
- `GET /farms/` - List all farms for the logged-in farmer
- `GET /farms/{id}/` - Get farm details
- `GET /farms/{id}/status/` - Get current system status
- `GET /farms/{id}/dashboard/` - Get complete dashboard data

### Climexa Endpoints (`/api/climexa/`)
- `GET /dashboard/` - Company dashboard overview
- `GET /farms/{id}/` - Get detailed farm information
- `GET /alerts/` - Get alerts for all farms

### Sensor Endpoints (`/api/sensors/`)
- `GET /sensors/` - List sensors
- `GET /sensors/{id}/readings/` - Get sensor readings
- `POST /readings/` - Create new sensor reading

### Automation Endpoints (`/api/automation/`)
- `POST /update/{farm_id}/` - Update status for a specific farm
- `POST /update-all/` - Update status for all farms

## Brand Colors

- Primary: `#22553A` (Dark Green)
- Secondary: `#AED581` (Light Green)
- Accent: `#059669` (Emerald)
- Background: `#FAFAFA` (Off White)
- Text: `#37474F` (Dark Gray)

## Project Structure

```
Climexa/
├── backend/
│   ├── climexa/          # Django project settings
│   ├── farms/            # Farm management app
│   ├── sensors/         # Sensor data app
│   └── automation/       # Automation logic
├── frontend/
│   ├── src/
│   │   ├── pages/        # React pages
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API services
│   ├── package.json
│   └── vite.config.js
├── requirements.txt
└── README.md
```

## Development

### Running Tests
```bash
cd backend
python manage.py test
```

### Building for Production
```bash
# Frontend
npm run build

# Backend
# Use gunicorn or similar WSGI server
```

## Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [AI & Weather Features](AI_WEATHER_FEATURES.md) - AI suggestions and weather forecast
- [System Specifications](SYSTEM_SPECS.md) - Updated system specs and migration notes
- [System Documentation](SYSTEM_DOCUMENTATION.md) - Complete system architecture and automation logic
- [Simulation Guide](SIMULATION_GUIDE.md) - How to use the simulation feature

## License

Copyright © Climexa AI™

