#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'climexa.settings')
django.setup()

from farms.models import User
from django.contrib.auth import authenticate

# Get user
try:
    user = User.objects.get(username='JohnD')
    print(f"User exists: {user.username}")
    print(f"Has usable password: {user.has_usable_password()}")
    
    # Test password check
    pwd = 'password123'
    password_check = user.check_password(pwd)
    print(f"Password check result: {password_check}")
    
    # Test authentication
    auth_user = authenticate(username='JohnD', password=pwd)
    print(f"Authentication result: {auth_user}")
    
    if not password_check:
        print("\nPassword is incorrect! Resetting password...")
        user.set_password(pwd)
        user.save()
        print("Password reset. Testing again...")
        password_check = user.check_password(pwd)
        auth_user = authenticate(username='JohnD', password=pwd)
        print(f"New password check: {password_check}")
        print(f"New auth result: {auth_user}")
        
except User.DoesNotExist:
    print("User 'JohnD' does not exist!")

