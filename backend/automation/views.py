from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from farms.models import Farm, SystemStatus
from .services import update_farm_status, get_full_weather_forecast
from .ai_service import generate_farmer_suggestions


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_status(request, farm_id):
    """Manually trigger status update for a farm using Open Meteo"""
    farm = get_object_or_404(Farm, id=farm_id)
    
    # Check permissions
    if request.user.role == 'farmer' and farm.farmer != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    
    status = update_farm_status(farm)
    
    from farms.serializers import SystemStatusSerializer
    return Response(SystemStatusSerializer(status).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_all_statuses(request):
    """Update status for all active farms using Open Meteo (Climexa staff only)"""
    if request.user.role not in ['climexa_staff', 'admin']:
        return Response({'error': 'Unauthorized'}, status=403)
    
    farms = Farm.objects.filter(is_active=True)
    updated = []
    
    for farm in farms:
        try:
            status = update_farm_status(farm)
            updated.append({
                'farm_id': farm.id,
                'farm_name': farm.name,
                'status': 'updated',
                'battery_level': float(status.battery_level),
                'pv_output_kw': float(status.pv_output_kw),
                'irrigation_on': status.irrigation_on
            })
        except Exception as e:
            updated.append({
                'farm_id': farm.id,
                'farm_name': farm.name,
                'status': 'error',
                'error': str(e)
            })
    
    return Response({'updated_farms': updated})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weather_forecast(request, farm_id):
    """Get 7-day weather forecast for a farm from Open Meteo"""
    farm = get_object_or_404(Farm, id=farm_id)
    
    # Check permissions
    if request.user.role == 'farmer' and farm.farmer != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        current, forecast, full_forecast = get_full_weather_forecast(farm, forecast_days=7)
        
        # Convert Decimal to float for JSON serialization
        def decimal_to_float(obj):
            if isinstance(obj, dict):
                return {k: decimal_to_float(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [decimal_to_float(item) for item in obj]
            elif isinstance(obj, Decimal):
                return float(obj)
            return obj
        
        return Response({
            'current': {
                'gti': float(current['gti']),
                'clouds': float(current['clouds']),
                'rain': float(current['rain']),
                'temperature': float(current.get('temperature', 0))
            },
            'forecast_tomorrow': {
                'clouds': float(forecast['clouds']),
                'rain': float(forecast['rain'])
            },
            'forecast': decimal_to_float(full_forecast)
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_suggestions(request, farm_id):
    """Get AI-powered suggestions for a farm"""
    farm = get_object_or_404(Farm, id=farm_id)
    
    # Check permissions
    if request.user.role == 'farmer' and farm.farmer != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        # Get farm status
        status = SystemStatus.objects.filter(farm=farm).first()
        
        # Get full weather forecast
        current, forecast, full_forecast = get_full_weather_forecast(farm, forecast_days=7)
        
        # Generate AI suggestions
        suggestions = generate_farmer_suggestions(farm, status, full_forecast)
        
        return Response({
            'suggestions': suggestions,
            'generated_at': timezone.now().isoformat()
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)
