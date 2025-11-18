from rest_framework import serializers
from .models import User, Farm, SystemStatus


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'created_at']
        read_only_fields = ['id', 'created_at']


class FarmSerializer(serializers.ModelSerializer):
    farmer = UserSerializer(read_only=True)
    farmer_id = serializers.IntegerField(write_only=True, required=False)
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Farm
        fields = [
            'id', 'name', 'farmer', 'farmer_id', 'latitude', 'longitude',
            'panel_efficiency', 'system_size_kw', 'battery_capacity_kwh',
            'load_kw', 'tilt', 'azimuth', 'timezone', 'is_active',
            'created_at', 'updated_at', 'status'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_status(self, obj):
        try:
            status = obj.status
            return SystemStatusSerializer(status).data
        except SystemStatus.DoesNotExist:
            return None


class SystemStatusSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    
    class Meta:
        model = SystemStatus
        fields = [
            'id', 'farm', 'farm_name', 'battery_level', 'battery_kwh',
            'pv_output_kw', 'gti', 'irrigation_on', 'irrigation_reason',
            'irrigation_priority', 'current_load_kw', 'current_soil_moisture',
            'current_temperature', 'current_humidity', 'current_rain',
            'current_clouds', 'last_updated'
        ]
        read_only_fields = ['id', 'last_updated']


class FarmListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    battery_level = serializers.DecimalField(source='status.battery_level', read_only=True, max_digits=5, decimal_places=2)
    irrigation_on = serializers.BooleanField(source='status.irrigation_on', read_only=True)
    
    class Meta:
        model = Farm
        fields = [
            'id', 'name', 'farmer_name', 'latitude', 'longitude',
            'is_active', 'battery_level', 'irrigation_on', 'created_at'
        ]

