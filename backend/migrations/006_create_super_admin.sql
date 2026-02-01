-- Create super admin user with hashed password
-- Email: ali@alhajco.com
-- Password: A11A22A33 (hashed with bcrypt)

-- First, get the super_admin role_id
DO $$
DECLARE
  v_role_id INT;
  v_user_id INT;
  v_hashed_password TEXT;
BEGIN
  -- Get Admin role_id (using 'Admin' instead of 'super_admin')
  SELECT id INTO v_role_id FROM roles WHERE name = 'Admin';
  
  -- Hashed password for 'A11A22A33' using bcrypt rounds=10
  v_hashed_password := '$2a$10$sRyzujmaEk.iL2JUZGstEu7k6b.3IddSnOR9qrtWvEfaUpY4Th0gu';
  
  -- Delete existing user roles if exists
  DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = 'ali@alhajco.com');
  
  -- Delete existing user if exists
  DELETE FROM users WHERE email = 'ali@alhajco.com';
  
  -- Insert super admin user
  INSERT INTO users (email, password, created_at)
  VALUES (
    'ali@alhajco.com',
    v_hashed_password,
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  -- Assign super_admin role to user
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_role_id);
  
  RAISE NOTICE 'Super admin user created successfully: ali@alhajco.com with role_id: %', v_role_id;
END $$;
