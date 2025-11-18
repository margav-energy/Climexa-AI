from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Extended user model for farmers and Climexa staff"""
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('climexa_staff', 'Climexa Staff'),
        ('admin', 'Admin'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Farm(models.Model):
    """Farm model representing a farm installation"""
    name = models.CharField(max_length=200)
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='farms')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    # System Configuration
    panel_efficiency = models.DecimalField(max_digits=5, decimal_places=2, default=0.18)
    system_size_kw = models.DecimalField(max_digits=6, decimal_places=2, default=130.0)  # 130kW system
    battery_capacity_kwh = models.DecimalField(max_digits=6, decimal_places=2, default=1320.0)  # 1,320kWh battery
    load_kw = models.DecimalField(max_digits=5, decimal_places=2, default=2.0)
    
    # Panel Orientation
    tilt = models.IntegerField(default=23)
    azimuth = models.IntegerField(default=180)
    timezone = models.CharField(max_length=50, default='auto')
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.farmer.username}"


class SystemStatus(models.Model):
    """Current system status for a farm"""
    farm = models.OneToOneField(Farm, on_delete=models.CASCADE, related_name='status')
    
    # Battery
    battery_level = models.DecimalField(max_digits=5, decimal_places=2, default=70.0)
    battery_kwh = models.DecimalField(max_digits=6, decimal_places=2, default=924.0)  # 70% of 1,320kWh
    
    # PV Generation
    pv_output_kw = models.DecimalField(max_digits=7, decimal_places=2, default=0.0)  # Can handle up to 99999.99 kW
    gti = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    
    # Irrigation
    irrigation_on = models.BooleanField(default=False)
    irrigation_reason = models.TextField(blank=True)
    irrigation_priority = models.CharField(
        max_length=20,
        choices=[('critical', 'Critical'), ('normal', 'Normal'), ('optional', 'Optional')],
        default='optional'
    )
    
    # System Load
    current_load_kw = models.DecimalField(max_digits=6, decimal_places=2, default=1.0)
    
    # Soil Moisture (from sensors)
    current_soil_moisture = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Weather
    current_temperature = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    current_humidity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    current_rain = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    current_clouds = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Status for {self.farm.name}"

