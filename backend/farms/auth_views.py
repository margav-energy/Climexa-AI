from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .serializers import UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Logout endpoint"""
    logout(request)
    return Response({'message': 'Logout successful'})


@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    """Get current user info"""
    if request.user.is_authenticated:
        return Response({
            'user': UserSerializer(request.user).data
        })
    return Response({
        'user': None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    """Get CSRF token"""
    from django.middleware.csrf import get_token
    
    # Get or create CSRF token
    token = get_token(request)
    
    response = Response({
        'csrfToken': token
    })
    
    # Ensure CSRF cookie is set in response
    response.set_cookie(
        'csrftoken',
        token,
        max_age=31449600,  # 1 year
        httponly=False,
        samesite='Lax',
        secure=False  # Set to True in production with HTTPS
    )
    
    return response

