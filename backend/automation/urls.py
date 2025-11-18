from django.urls import path
from .views import update_status, update_all_statuses, weather_forecast, ai_suggestions

urlpatterns = [
    path('update/<int:farm_id>/', update_status, name='update-status'),
    path('update-all/', update_all_statuses, name='update-all-statuses'),
    path('weather/<int:farm_id>/', weather_forecast, name='weather-forecast'),
    path('suggestions/<int:farm_id>/', ai_suggestions, name='ai-suggestions'),
]

