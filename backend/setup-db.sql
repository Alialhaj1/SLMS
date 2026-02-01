-- Setup PostgreSQL database for SLMS
-- Run this script to create the required database user and database

-- Create the slms user with password
CREATE USER slms WITH PASSWORD 'slms_pass';

-- Create the slms_db database
CREATE DATABASE slms_db WITH OWNER slms;

-- Grant all privileges on the database to the slms user
GRANT ALL PRIVILEGES ON DATABASE slms_db TO slms;

-- Connect to the slms_db database
\c slms_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO slms;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO slms;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO slms;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO slms;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO slms;

-- Display confirmation
SELECT 'Database setup complete!' AS status;
