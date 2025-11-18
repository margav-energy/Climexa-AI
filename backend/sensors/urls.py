from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SensorTypeViewSet, SensorViewSet, SensorReadingViewSet

router = DefaultRouter()
router.register(r'types', SensorTypeViewSet, basename='sensortype')
router.register(r'sensors', SensorViewSet, basename='sensor')
router.register(r'readings', SensorReadingViewSet, basename='reading')

urlpatterns = [
    path('', include(router.urls)),
]

