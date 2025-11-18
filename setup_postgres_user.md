# Setup PostgreSQL User for Climexa

## Option 1: Using pgAdmin (Easiest - GUI)

1. **Open pgAdmin** (usually in Start Menu → PostgreSQL folder)

2. **Connect to PostgreSQL Server**
   - If not already connected, right-click "Servers" → "Create" → "Server"
   - Or expand existing server connection
   - You may need to enter the postgres password here

3. **Open Query Tool**
   - Right-click on "postgres" database → "Query Tool"

4. **Run the SQL Script**
   - Open `create_postgres_user.sql` file
   - Copy and paste the contents into Query Tool
   - Click "Execute" (or press F5)

5. **Verify the user was created**
   - In pgAdmin, expand "Login/Group Roles"
   - You should see `climexa_user` listed

## Option 2: Using psql Command Line

### Step 1: Connect to PostgreSQL
You'll need to know the postgres password. Try:

```bash
psql -U postgres -h localhost
```

If that doesn't work, try connecting to a specific database:

```bash
psql -U postgres -d postgres
```

### Step 2: Run the SQL commands
Once connected, run:

```sql
CREATE USER climexa_user WITH PASSWORD 'climexa123';
CREATE DATABASE climexa_db OWNER climexa_user;
GRANT ALL PRIVILEGES ON DATABASE climexa_db TO climexa_user;
\c climexa_db
GRANT ALL ON SCHEMA public TO climexa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO climexa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO climexa_user;
\q
```

### Step 3: Test the connection
```bash
psql -U climexa_user -d climexa_db -h localhost
```
Password: `climexa123`

## Option 3: If you forgot postgres password

### Reset via pg_hba.conf (Temporary - for setup only)

1. Find `pg_hba.conf` file:
   - Usually in: `C:\Program Files\PostgreSQL\[version]\data\pg_hba.conf`
   - Or search for it in File Explorer

2. **Open as Administrator** in a text editor

3. Find the line with `postgres` user authentication:
   ```
   host    all             postgres        127.0.0.1/32            md5
   ```

4. **Temporarily change** `md5` to `trust`:
   ```
   host    all             postgres        127.0.0.1/32            trust
   ```

5. **Save the file**

6. **Restart PostgreSQL service**:
   ```powershell
   Restart-Service postgresql-x64-[version]
   ```
   Or use Services app (services.msc) and restart PostgreSQL service

7. **Connect without password**:
   ```bash
   psql -U postgres
   ```

8. **Create the new user** (run the SQL commands from Option 2)

9. **IMPORTANT: Change pg_hba.conf back to `md5`** for security

10. **Restart PostgreSQL service again**

## After Creating User

1. **Create .env file** in project root:
   ```
   SECRET_KEY=django-insecure-change-me-in-production
   DEBUG=True
   DB_NAME=climexa_db
   DB_USER=climexa_user
   DB_PASSWORD=climexa123
   DB_HOST=localhost
   DB_PORT=5432
   ```

2. **Test Django connection**:
   ```bash
   cd backend
   python manage.py dbshell
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

