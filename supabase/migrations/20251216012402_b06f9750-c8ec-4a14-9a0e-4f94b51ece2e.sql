-- Add vehicle_type column to injury_claims table
ALTER TABLE public.injury_claims
ADD COLUMN vehicle_type text;