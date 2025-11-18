from django.contrib import admin
from .models import User, Farm, SystemStatus


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'phone', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['username', 'email', 'phone']


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ['name', 'farmer', 'latitude', 'longitude', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'farmer__username']


@admin.register(SystemStatus)
class SystemStatusAdmin(admin.ModelAdmin):
    list_display = ['farm', 'battery_level', 'pv_output_kw', 'irrigation_on', 'last_updated']
    list_filter = ['irrigation_on', 'last_updated']
    search_fields = ['farm__name']

