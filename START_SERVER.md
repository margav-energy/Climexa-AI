# Start Django Server

The 404 errors indicate the Django backend server is not running!

## To start the Django server:

1. **Open a new terminal window**

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Activate virtual environment (if not already active):**
   ```bash
   # On Windows Git Bash:
   source venv/Scripts/activate
   
   # On Windows PowerShell:
   venv\Scripts\Activate.ps1
   ```

4. **Start the Django server:**
   ```bash
   python manage.py runserver
   ```

5. **You should see:**
   ```
   Starting development server at http://127.0.0.1:8000/
   Quit the server with CTRL-BREAK.
   ```

6. **Keep this terminal open** - the server needs to keep running

## Verify it's working:

- Open browser to: `http://localhost:8000/admin/`
- Or test API: `http://localhost:8000/api/auth/user/`

Once the server is running, refresh your frontend at `http://localhost:3000` and the errors should be gone!

