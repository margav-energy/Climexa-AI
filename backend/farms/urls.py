from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FarmViewSet
from .auth_views import login_view, logout_view, current_user

router = DefaultRouter()
router.register(r'farms', FarmViewSet, basename='farm')

urlpatterns = [
    path('', include(router.urls)),
]

