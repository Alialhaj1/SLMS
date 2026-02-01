-- Migration 025: Add cover_image column to users table
-- Purpose: Allow users to have profile image and cover image

-- Add cover_image column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.profile_image IS 'User profile/avatar image path';
COMMENT ON COLUMN users.cover_image IS 'User profile cover/banner image path';

-- Create index for faster lookups (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_users_has_profile_image ON users ((profile_image IS NOT NULL));
