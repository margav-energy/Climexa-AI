from django.contrib import admin
from .models import SensorType, Sensor, SensorReading


@admin.register(SensorType)
class SensorTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'unit']
    list_filter = ['category']


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ['name', 'farm', 'sensor_type', 'is_active', 'created_at']
    list_filter = ['is_active', 'sensor_type', 'created_at']
    search_fields = ['name', 'farm__name']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['sensor', 'value', 'timestamp']
    list_filter = ['timestamp', 'sensor__sensor_type']
    search_fields = ['sensor__name']
    readonly_fields = ['timestamp']

