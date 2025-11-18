from django.db import models
from farms.models import Farm


class SensorType(models.Model):
    """Sensor type definitions"""
    SENSOR_CATEGORIES = [
        ('soil', 'Soil'),
        ('water', 'Water'),
        ('weather', 'Weather'),
        ('solar', 'Solar'),
    ]
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=SENSOR_CATEGORIES)
    unit = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class Sensor(models.Model):
    """Sensor device installed on a farm"""
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='sensors')
    sensor_type = models.ForeignKey(SensorType, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)  # e.g., "Plot A, 10cm depth"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['farm', 'sensor_type', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.farm.name}"


class SensorReading(models.Model):
    """Individual sensor reading"""
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='readings')
    value = models.DecimalField(max_digits=10, decimal_places=4)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'sensor']),
        ]
    
    def __str__(self):
        return f"{self.sensor.name}: {self.value} {self.sensor.sensor_type.unit} at {self.timestamp}"

