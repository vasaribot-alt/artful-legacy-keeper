
-- Add foundation to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'foundation';

-- Create founding artist tier enum
CREATE TYPE public.founding_artist_tier AS ENUM ('internationally_established', 'mid_career', 'emerging');
