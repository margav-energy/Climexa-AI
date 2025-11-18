"""
Management command to create initial sensor types
"""
from django.core.management.base import BaseCommand
from sensors.models import SensorType


class Command(BaseCommand):
    help = 'Create initial sensor types'

    def handle(self, *args, **options):
        sensor_types = [
            {'name': 'Soil Moisture', 'category': 'soil', 'unit': '%'},
            {'name': 'Soil Temperature', 'category': 'soil', 'unit': '°C'},
            {'name': 'Soil Electrical Conductivity', 'category': 'soil', 'unit': 'mS/cm'},
            {'name': 'Water Quality/Salinity', 'category': 'water', 'unit': 'ppm'},
            {'name': 'Water Flow', 'category': 'water', 'unit': 'L/min'},
            {'name': 'Air Temperature', 'category': 'weather', 'unit': '°C'},
            {'name': 'Air Humidity', 'category': 'weather', 'unit': '%'},
            {'name': 'Rain Gauge', 'category': 'weather', 'unit': 'mm'},
            {'name': 'Photosynthetic Active Radiation', 'category': 'solar', 'unit': 'µmol/m²/s'},
            {'name': 'Solar Irradiance', 'category': 'solar', 'unit': 'W/m²'},
        ]

        created_count = 0
        for sensor_data in sensor_types:
            sensor_type, created = SensorType.objects.get_or_create(
                name=sensor_data['name'],
                defaults=sensor_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created sensor type: {sensor_data["name"]}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Sensor type already exists: {sensor_data["name"]}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nCreated {created_count} new sensor types.')
        )

