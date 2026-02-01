-- Fix admin account
-- Reset status, unlock account, reset failed attempts

UPDATE users 
SET 
  status = 'active',
  locked_until = NULL,
  failed_login_count = 0,
  last_failed_login_at = NULL
WHERE email = 'ali@alhajco.com';

-- Verify update
SELECT id, email, status, failed_login_count, locked_until 
FROM users 
WHERE email = 'ali@alhajco.com';
