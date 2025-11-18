from django.urls import path
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Farm, SystemStatus
from .serializers import FarmListSerializer, SystemStatusSerializer
from sensors.models import SensorReading


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """Climexa company dashboard - overview of all farms"""
    if request.user.role not in ['climexa_staff', 'admin']:
        return Response({'error': 'Unauthorized'}, status=403)
    
    farms = Farm.objects.filter(is_active=True)
    
    # Get summary statistics
    total_farms = farms.count()
    active_irrigation = farms.filter(status__irrigation_on=True).count()
    
    # Average battery level
    avg_battery = farms.aggregate(
        avg_battery=Avg('status__battery_level')
    )['avg_battery'] or 0
    
    # Get all farms with status
    farms_data = FarmListSerializer(farms, many=True).data
    
    return Response({
        'summary': {
            'total_farms': total_farms,
            'active_irrigation': active_irrigation,
            'average_battery_level': round(float(avg_battery), 2) if avg_battery else 0
        },
        'farms': farms_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_detail(request, farm_id):
    """Get detailed information about a specific farm"""
    if request.user.role not in ['climexa_staff', 'admin']:
        return Response({'error': 'Unauthorized'}, status=403)
    
    farm = get_object_or_404(Farm, id=farm_id)
    status_obj, created = SystemStatus.objects.get_or_create(farm=farm)
    
    from farms.serializers import FarmSerializer
    from sensors.models import SensorReading
    from sensors.serializers import SensorReadingSerializer
    
    # Get latest sensor readings
    latest_readings = SensorReading.objects.filter(
        sensor__farm=farm
    ).order_by('-timestamp')[:20]
    
    return Response({
        'farm': FarmSerializer(farm).data,
        'status': SystemStatusSerializer(status_obj).data,
        'recent_sensor_readings': SensorReadingSerializer(latest_readings, many=True).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alerts(request):
    """Get alerts for farms that need attention"""
    if request.user.role not in ['climexa_staff', 'admin']:
        return Response({'error': 'Unauthorized'}, status=403)
    
    farms = Farm.objects.filter(is_active=True)
    alerts_list = []
    
    for farm in farms:
        status_obj, created = SystemStatus.objects.get_or_create(farm=farm)
        farm_alerts = []
        
        # Low battery alert
        if status_obj.battery_level < 20:
            farm_alerts.append({
                'type': 'low_battery',
                'message': f'Battery level is {status_obj.battery_level}%',
                'severity': 'high'
            })
        
        # No PV generation during day
        if status_obj.pv_output_kw < 0.1 and status_obj.gti > 100:
            farm_alerts.append({
                'type': 'pv_issue',
                'message': 'Low PV output despite good irradiance',
                'severity': 'medium'
            })
        
        if farm_alerts:
            alerts_list.append({
                'farm_id': farm.id,
                'farm_name': farm.name,
                'alerts': farm_alerts
            })
    
    return Response({'alerts': alerts_list})


urlpatterns = [
    path('dashboard/', dashboard, name='climexa-dashboard'),
    path('farms/<int:farm_id>/', farm_detail, name='climexa-farm-detail'),
    path('alerts/', alerts, name='climexa-alerts'),
]

