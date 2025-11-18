"""
URL configuration for climexa project.
"""
from django.contrib import admin
from django.urls import path, include
from farms.auth_views import login_view, logout_view, current_user, csrf_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/csrf/', csrf_token, name='csrf-token'),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/user/', current_user, name='current-user'),
    path('api/farmer/', include('farms.urls')),
    path('api/climexa/', include('farms.climexa_urls')),
    path('api/sensors/', include('sensors.urls')),
    path('api/automation/', include('automation.urls')),
]

