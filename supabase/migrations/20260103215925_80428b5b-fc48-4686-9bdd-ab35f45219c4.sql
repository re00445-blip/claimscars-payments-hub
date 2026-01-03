-- Add cost_price column to vehicles table for tracking actual purchase cost
ALTER TABLE public.vehicles 
ADD COLUMN cost_price numeric DEFAULT 0;