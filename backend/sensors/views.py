from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import SensorType, Sensor, SensorReading
from .serializers import SensorTypeSerializer, SensorSerializer, SensorReadingSerializer
from farms.models import Farm


class SensorTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for sensor types"""
    queryset = SensorType.objects.all()
    serializer_class = SensorTypeSerializer
    permission_classes = [IsAuthenticated]


class SensorViewSet(viewsets.ModelViewSet):
    """ViewSet for sensors"""
    permission_classes = [IsAuthenticated]
    serializer_class = SensorSerializer
    
    def get_queryset(self):
        """Farmers see only their farm's sensors"""
        if self.request.user.role == 'farmer':
            return Sensor.objects.filter(farm__farmer=self.request.user)
        return Sensor.objects.all()
    
    @action(detail=True, methods=['get'])
    def readings(self, request, pk=None):
        """Get readings for a sensor"""
        sensor = self.get_object()
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timedelta(hours=hours)
        
        readings = SensorReading.objects.filter(
            sensor=sensor,
            timestamp__gte=since
        ).order_by('-timestamp')
        
        serializer = SensorReadingSerializer(readings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_farm(self, request):
        """Get all sensors for a specific farm"""
        farm_id = request.query_params.get('farm_id')
        if not farm_id:
            return Response({'error': 'farm_id required'}, status=400)
        
        farm = Farm.objects.get(id=farm_id)
        if request.user.role == 'farmer' and farm.farmer != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        
        sensors = Sensor.objects.filter(farm=farm, is_active=True)
        serializer = self.get_serializer(sensors, many=True)
        return Response(serializer.data)


class SensorReadingViewSet(viewsets.ModelViewSet):
    """ViewSet for sensor readings"""
    permission_classes = [IsAuthenticated]
    serializer_class = SensorReadingSerializer
    
    def get_queryset(self):
        """Farmers see only their farm's readings"""
        if self.request.user.role == 'farmer':
            return SensorReading.objects.filter(sensor__farm__farmer=self.request.user)
        return SensorReading.objects.all()
    
    def perform_create(self, serializer):
        """Create a new reading"""
        serializer.save()

