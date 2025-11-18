"""
Management command to update all farm statuses using Open Meteo
Run with: python manage.py update_all_farms
Or schedule with cron: */30 * * * * cd /path/to/project && python manage.py update_all_farms
"""
from django.core.management.base import BaseCommand
from farms.models import Farm
from automation.services import update_farm_status


class Command(BaseCommand):
    help = 'Update status for all active farms using Open Meteo data'

    def handle(self, *args, **options):
        farms = Farm.objects.filter(is_active=True)
        updated_count = 0
        error_count = 0
        
        self.stdout.write(f'Updating {farms.count()} active farms...')
        
        for farm in farms:
            try:
                status = update_farm_status(farm)
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ {farm.name}: Battery {status.battery_level}%, '
                        f'PV {status.pv_output_kw}kW, Irrigation: {"ON" if status.irrigation_on else "OFF"}'
                    )
                )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'✗ {farm.name}: Error - {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {updated_count} updated, {error_count} errors'
            )
        )


