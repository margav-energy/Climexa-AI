from rest_framework import serializers
from .models import SensorType, Sensor, SensorReading


class SensorTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorType
        fields = ['id', 'name', 'category', 'unit', 'description']


class SensorSerializer(serializers.ModelSerializer):
    sensor_type = SensorTypeSerializer(read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    latest_reading = serializers.SerializerMethodField()
    
    class Meta:
        model = Sensor
        fields = [
            'id', 'farm', 'farm_name', 'sensor_type', 'name',
            'location', 'is_active', 'created_at', 'latest_reading'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_latest_reading(self, obj):
        latest = obj.readings.first()
        if latest:
            return {
                'value': float(latest.value),
                'timestamp': latest.timestamp
            }
        return None


class SensorReadingSerializer(serializers.ModelSerializer):
    sensor_name = serializers.CharField(source='sensor.name', read_only=True)
    sensor_type = serializers.CharField(source='sensor.sensor_type.name', read_only=True)
    unit = serializers.CharField(source='sensor.sensor_type.unit', read_only=True)
    farm_name = serializers.CharField(source='sensor.farm.name', read_only=True)
    
    class Meta:
        model = SensorReading
        fields = [
            'id', 'sensor', 'sensor_name', 'sensor_type', 'unit',
            'farm_name', 'value', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

