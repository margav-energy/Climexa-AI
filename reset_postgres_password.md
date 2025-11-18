# Reset PostgreSQL Password

## Method 1: Using pgAdmin (GUI)
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Login/Group Roles" → "postgres" → "Properties"
4. Go to "Definition" tab
5. Enter new password
6. Save

## Method 2: Using psql (Command Line)
1. Find your PostgreSQL installation directory (usually `C:\Program Files\PostgreSQL\[version]\`)
2. Open Command Prompt as Administrator
3. Navigate to bin folder:
   ```
   cd "C:\Program Files\PostgreSQL\[version]\bin"
   ```
4. Connect as postgres user (might not require password if using trust authentication):
   ```
   psql -U postgres
   ```
5. Once connected, change password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'newpassword';
   ```
6. Exit: `\q`

## Method 3: Edit pg_hba.conf (Temporary - for reset only)
1. Find `pg_hba.conf` file (usually in `C:\Program Files\PostgreSQL\[version]\data\`)
2. Open as Administrator
3. Find line with `postgres` user and change `md5` or `scram-sha-256` to `trust`:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             postgres        127.0.0.1/32            trust
   ```
4. Restart PostgreSQL service
5. Connect without password: `psql -U postgres`
6. Change password: `ALTER USER postgres WITH PASSWORD 'newpassword';`
7. **IMPORTANT**: Change `pg_hba.conf` back to `md5` or `scram-sha-256` for security
8. Restart PostgreSQL service again

## Method 4: Create a new user for the project
Instead of using postgres user, create a dedicated user:

```sql
CREATE USER climexa_user WITH PASSWORD 'climexa_password';
CREATE DATABASE climexa_db OWNER climexa_user;
GRANT ALL PRIVILEGES ON DATABASE climexa_db TO climexa_user;
```

Then update your .env file:
```
DB_USER=climexa_user
DB_PASSWORD=climexa_password
DB_NAME=climexa_db
```

