"""
Management command to generate sample sensor readings for simulation
Run with: python manage.py generate_sensor_readings --farm-id 1 --hours 24
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal
from farms.models import Farm, SystemStatus
from sensors.models import Sensor, SensorReading, SensorType


class Command(BaseCommand):
    help = 'Generate sample sensor readings for farms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--farm-id',
            type=int,
            help='Generate readings for a specific farm ID only',
        )
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Number of hours of data to generate (default: 24)',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=1,
            help='Interval in hours between readings (default: 1)',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing readings before generating new ones',
        )

    def handle(self, *args, **options):
        farm_id = options.get('farm_id')
        hours = options.get('hours', 24)
        interval = options.get('interval', 1)
        clear_existing = options.get('clear_existing', False)

        # Get farms
        if farm_id:
            try:
                farms = [Farm.objects.get(id=farm_id)]
            except Farm.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Farm with ID {farm_id} not found.')
                )
                return
        else:
            farms = Farm.objects.all()

        if not farms:
            self.stdout.write(
                self.style.ERROR('No farms found.')
            )
            return

        total_readings = 0

        for farm in farms:
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Generating readings for: {farm.name} (ID: {farm.id})')
            self.stdout.write(f'{"="*60}')

            # Get all active sensors for this farm
            sensors = Sensor.objects.filter(farm=farm, is_active=True)
            if not sensors.exists():
                self.stdout.write(
                    self.style.WARNING(f'  No sensors found for {farm.name}. Skipping.')
                )
                continue

            # Clear existing readings if requested
            if clear_existing:
                count = SensorReading.objects.filter(sensor__farm=farm).count()
                SensorReading.objects.filter(sensor__farm=farm).delete()
                self.stdout.write(
                    self.style.WARNING(f'  Removed {count} existing readings.')
                )

            # Get system status for context
            try:
                status = farm.status
            except SystemStatus.DoesNotExist:
                status = None

            # Generate readings for each sensor
            now = timezone.now()
            readings_created = 0

            for hour in range(0, hours, interval):
                timestamp = now - timedelta(hours=hours - hour)
                hour_of_day = timestamp.hour

                for sensor in sensors:
                    value = self._generate_reading_value(
                        sensor.sensor_type,
                        hour_of_day,
                        status,
                        timestamp
                    )

                    # Check if reading already exists (within 1 minute)
                    existing = SensorReading.objects.filter(
                        sensor=sensor,
                        timestamp__gte=timestamp - timedelta(minutes=1),
                        timestamp__lte=timestamp + timedelta(minutes=1)
                    ).first()

                    if not existing:
                        SensorReading.objects.create(
                            sensor=sensor,
                            value=Decimal(str(value)),
                            timestamp=timestamp
                        )
                        readings_created += 1

            total_readings += readings_created
            self.stdout.write(
                self.style.SUCCESS(f'  Created {readings_created} sensor readings.')
            )

        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(
            self.style.SUCCESS(f'\nComplete! Total readings created: {total_readings}')
        )

    def _generate_reading_value(self, sensor_type, hour_of_day, status, timestamp):
        """Generate realistic sensor reading based on sensor type and context"""
        sensor_name = sensor_type.name.lower()

        # Soil Moisture (varies by depth, decreases during day, increases with rain)
        if 'soil moisture' in sensor_name:
            base = 45.0
            if '30cm' in sensor_type.name.lower() or 'Plot B' in sensor_type.name.lower():
                base += 5.0  # Deeper soils retain more moisture
            if status and status.current_rain and status.current_rain > 0:
                base += min(20.0, float(status.current_rain) * 3)
            # Decrease slightly during day due to evaporation
            if 10 <= hour_of_day <= 16:
                base -= 2.0
            return max(20.0, min(85.0, base + random.uniform(-5, 5)))

        # Soil Temperature (varies by depth, follows air temp with lag)
        if 'soil temperature' in sensor_name:
            base_temp = 18.0
            if status and status.current_temperature:
                base_temp = float(status.current_temperature) - 2.0  # Soil is cooler
            if '30cm' in sensor_type.name.lower():
                base_temp -= 1.0  # Deeper is cooler
            # Varies less than air temperature
            daily_variation = 3.0 * abs(hour_of_day - 12) / 12
            return max(10.0, min(35.0, base_temp - daily_variation + random.uniform(-1, 1)))

        # Soil Electrical Conductivity
        if 'soil electrical conductivity' in sensor_name or 'soil ec' in sensor_name:
            return round(random.uniform(0.1, 2.5), 2)

        # Water Quality/Salinity
        if 'water quality' in sensor_name or 'salinity' in sensor_name:
            return round(random.uniform(200, 800), 1)  # ppm

        # Water Flow (0 if no irrigation, active during irrigation periods)
        if 'water flow' in sensor_name:
            if status and status.irrigation_on:
                if 'main line' in sensor_type.name.lower():
                    return round(random.uniform(50, 100), 1)  # L/min
                else:
                    return round(random.uniform(20, 50), 1)  # L/min per zone
            return 0.0

        # Air Temperature (follows diurnal cycle)
        if 'air temperature' in sensor_name:
            base = 20.0
            if status and status.current_temperature:
                base = float(status.current_temperature)
            else:
                # Simulate diurnal cycle
                if 6 <= hour_of_day <= 18:
                    base = 20 + 10 * abs(hour_of_day - 12) / 6
                else:
                    base = 15 + 5 * (1 - abs(hour_of_day - 3) / 12)
            return round(max(10.0, min(40.0, base + random.uniform(-2, 2))), 1)

        # Air Humidity (inverse of temperature)
        if 'air humidity' in sensor_name:
            base = 60.0
            if status and status.current_humidity:
                base = float(status.current_humidity)
            else:
                # Higher at night, lower during day
                if 6 <= hour_of_day <= 18:
                    base = 50 + 10 * abs(hour_of_day - 12) / 6
                else:
                    base = 75 - 10 * abs(hour_of_day - 3) / 12
            if status and status.current_rain and status.current_rain > 0:
                base += 15.0
            return round(max(30.0, min(95.0, base + random.uniform(-5, 5))), 1)

        # Rain Gauge (cumulative, resets daily)
        if 'rain gauge' in sensor_name:
            if status and status.current_rain:
                return round(float(status.current_rain), 1)
            # Occasional rain
            if random.random() < 0.05:  # 5% chance
                return round(random.uniform(0.5, 5.0), 1)
            return 0.0

        # Solar Irradiance (follows solar curve)
        if 'solar irradiance' in sensor_name:
            # Solar curve: 0 at night, peaks at noon
            if 6 <= hour_of_day <= 18:
                # Calculate solar intensity based on hour
                hours_from_noon = abs(hour_of_day - 12)
                max_intensity = 900.0
                intensity = max_intensity * (1 - (hours_from_noon / 6))
                # Add some cloud variation
                if status and status.current_clouds:
                    intensity *= (1 - float(status.current_clouds) / 100 * 0.5)
                return round(max(0.0, min(1000.0, intensity + random.uniform(-50, 50))), 1)
            return 0.0

        # Photosynthetic Active Radiation (PAR) - similar to solar but different units
        if 'photosynthetic active radiation' in sensor_name or 'par' in sensor_name:
            if 6 <= hour_of_day <= 18:
                hours_from_noon = abs(hour_of_day - 12)
                max_par = 1800.0  # µmol/m²/s
                par = max_par * (1 - (hours_from_noon / 6))
                if status and status.current_clouds:
                    par *= (1 - float(status.current_clouds) / 100 * 0.5)
                return round(max(0.0, min(2000.0, par + random.uniform(-100, 100))), 0)
            return 0.0

        # Default: random value based on unit
        return round(random.uniform(0, 100), 2)
