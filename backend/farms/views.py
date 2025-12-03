from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Farm, SystemStatus
from .serializers import FarmSerializer, SystemStatusSerializer, FarmListSerializer


class FarmViewSet(viewsets.ModelViewSet):
    """ViewSet for farmer's farm management"""
    permission_classes = [IsAuthenticated]
    serializer_class = FarmSerializer
    
    def get_queryset(self):
        """Farmers can only see their own farms"""
        if self.request.user.role == 'farmer':
            queryset = Farm.objects.filter(farmer=self.request.user)
            # Debug logging
            print(f"DEBUG: User {self.request.user.username} (ID: {self.request.user.id}) requesting farms")
            print(f"DEBUG: Found {queryset.count()} farms")
            return queryset
        return Farm.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return FarmListSerializer
        return FarmSerializer
    
    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get current system status for a farm"""
        farm = self.get_object()
        status_obj, created = SystemStatus.objects.get_or_create(farm=farm)
        serializer = SystemStatusSerializer(status_obj)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Get dashboard data for a farm"""
        farm = self.get_object()
        status_obj, created = SystemStatus.objects.get_or_create(farm=farm)
        
        # Import here to avoid circular imports
        from sensors.models import SensorReading, Sensor, SensorType
        from sensors.serializers import SensorReadingSerializer
        from automation.services import get_current_soil_moisture
        
        # Get latest sensor readings
        latest_readings = SensorReading.objects.filter(
            sensor__farm=farm
        ).order_by('-timestamp')[:10]
        
        # Calculate average soil moisture from all soil moisture sensors
        avg_soil_moisture = get_current_soil_moisture(farm)
        
        data = {
            'farm': FarmSerializer(farm).data,
            'status': SystemStatusSerializer(status_obj).data,
            'recent_sensor_readings': SensorReadingSerializer(latest_readings, many=True).data,
            'average_soil_moisture': float(avg_soil_moisture) if avg_soil_moisture is not None else None
        }
        
        return Response(data)

