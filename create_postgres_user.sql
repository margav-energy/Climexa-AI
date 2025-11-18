-- SQL script to create a new PostgreSQL user and database for Climexa
-- Run this script after connecting to PostgreSQL

-- Create a new user for Climexa
CREATE USER climexa_user WITH PASSWORD 'climexa123';

-- Create the database
CREATE DATABASE climexa_db OWNER climexa_user;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE climexa_db TO climexa_user;

-- Connect to the new database and grant schema privileges
\c climexa_db
GRANT ALL ON SCHEMA public TO climexa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO climexa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO climexa_user;

