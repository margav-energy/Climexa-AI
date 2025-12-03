"""
Management command to install all sensors for farms
This creates sensors for simulation purposes
Run with: python manage.py install_farm_sensors
"""
from django.core.management.base import BaseCommand
from farms.models import Farm
from sensors.models import SensorType, Sensor


class Command(BaseCommand):
    help = 'Install all sensor types for all farms (or specific farm)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--farm-id',
            type=int,
            help='Install sensors for a specific farm ID only',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Remove existing sensors before installing new ones',
        )

    def handle(self, *args, **options):
        farm_id = options.get('farm_id')
        clear_existing = options.get('clear_existing', False)

        # Get all sensor types
        sensor_types = SensorType.objects.all()
        if not sensor_types.exists():
            self.stdout.write(
                self.style.ERROR('No sensor types found. Please run: python manage.py create_sensor_types')
            )
            return

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
                self.style.ERROR('No farms found. Please create farms first.')
            )
            return

        total_installed = 0
        total_skipped = 0

        for farm in farms:
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Processing: {farm.name} (ID: {farm.id})')
            self.stdout.write(f'{"="*60}')

            # Clear existing sensors if requested
            if clear_existing:
                existing_count = farm.sensors.count()
                farm.sensors.all().delete()
                self.stdout.write(
                    self.style.WARNING(f'Removed {existing_count} existing sensors.')
                )

            # Define sensor configurations with locations
            sensor_configs = self._get_sensor_configurations(farm)

            installed_count = 0
            skipped_count = 0

            for config in sensor_configs:
                sensor_type_name = config['sensor_type']
                sensor_name = config['name']
                location = config['location']

                # Find sensor type
                try:
                    sensor_type = SensorType.objects.get(name=sensor_type_name)
                except SensorType.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠ Sensor type "{sensor_type_name}" not found. Skipping.'
                        )
                    )
                    skipped_count += 1
                    continue

                # Create or get sensor
                sensor, created = Sensor.objects.get_or_create(
                    farm=farm,
                    sensor_type=sensor_type,
                    name=sensor_name,
                    defaults={
                        'location': location,
                        'is_active': True,
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ Installed: {sensor_name} ({sensor_type.name}) - {location}'
                        )
                    )
                    installed_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ○ Already exists: {sensor_name} ({sensor_type.name})'
                        )
                    )
                    skipped_count += 1

            total_installed += installed_count
            total_skipped += skipped_count

            self.stdout.write(
                f'\n  Installed: {installed_count} | Skipped: {skipped_count}'
            )

        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(
            self.style.SUCCESS(
                f'\nComplete! Total installed: {total_installed} | Total skipped: {total_skipped}'
            )
        )

    def _get_sensor_configurations(self, farm):
        """
        Get sensor configurations for a farm
        Returns list of dicts with sensor_type, name, and location
        """
        farm_name_short = farm.name.split()[0]  # First word of farm name

        configs = [
            # Soil Sensors - 300cm depth for comprehensive monitoring
            {
                'sensor_type': 'Soil Moisture',
                'name': f'{farm_name_short} Soil Moisture - Plot A (300cm)',
                'location': 'Plot A, 300cm depth'
            },
            {
                'sensor_type': 'Soil Moisture',
                'name': f'{farm_name_short} Soil Moisture - Plot B (300cm)',
                'location': 'Plot B, 300cm depth'
            },
            {
                'sensor_type': 'Soil Moisture',
                'name': f'{farm_name_short} Soil Moisture - Plot C (300cm)',
                'location': 'Plot C, 300cm depth'
            },
            {
                'sensor_type': 'Soil Temperature',
                'name': f'{farm_name_short} Soil Temperature - Plot A (300cm)',
                'location': 'Plot A, 300cm depth'
            },
            {
                'sensor_type': 'Soil Temperature',
                'name': f'{farm_name_short} Soil Temperature - Plot B (300cm)',
                'location': 'Plot B, 300cm depth'
            },
            {
                'sensor_type': 'Soil Electrical Conductivity',
                'name': f'{farm_name_short} Soil EC - Plot A',
                'location': 'Plot A, root zone'
            },
            {
                'sensor_type': 'Soil Electrical Conductivity',
                'name': f'{farm_name_short} Soil EC - Plot B',
                'location': 'Plot B, root zone'
            },
            
            # Water Sensors - For irrigation system monitoring
            {
                'sensor_type': 'Water Quality/Salinity',
                'name': f'{farm_name_short} Water Quality - Main Line',
                'location': 'Irrigation main line, entry point'
            },
            {
                'sensor_type': 'Water Flow',
                'name': f'{farm_name_short} Water Flow - Main Line',
                'location': 'Irrigation main line, flow meter'
            },
            {
                'sensor_type': 'Water Flow',
                'name': f'{farm_name_short} Water Flow - Plot A',
                'location': 'Plot A irrigation zone'
            },
            {
                'sensor_type': 'Water Flow',
                'name': f'{farm_name_short} Water Flow - Plot B',
                'location': 'Plot B irrigation zone'
            },
            
            # Weather Sensors - Environmental monitoring
            {
                'sensor_type': 'Air Temperature',
                'name': f'{farm_name_short} Air Temperature - Station 1',
                'location': 'Weather station, 2m height'
            },
            {
                'sensor_type': 'Air Humidity',
                'name': f'{farm_name_short} Air Humidity - Station 1',
                'location': 'Weather station, 2m height'
            },
            {
                'sensor_type': 'Rain Gauge',
                'name': f'{farm_name_short} Rain Gauge',
                'location': 'Weather station, open area'
            },
            
            # Solar Sensors - PV system monitoring
            {
                'sensor_type': 'Solar Irradiance',
                'name': f'{farm_name_short} Solar Irradiance - Array 1',
                'location': 'PV Array 1, panel surface'
            },
            {
                'sensor_type': 'Solar Irradiance',
                'name': f'{farm_name_short} Solar Irradiance - Array 2',
                'location': 'PV Array 2, panel surface'
            },
            {
                'sensor_type': 'Photosynthetic Active Radiation',
                'name': f'{farm_name_short} PAR - Crop Canopy',
                'location': 'Plot A, crop canopy level'
            },
            {
                'sensor_type': 'Photosynthetic Active Radiation',
                'name': f'{farm_name_short} PAR - Open Field',
                'location': 'Weather station, reference level'
            },
        ]

        return configs

