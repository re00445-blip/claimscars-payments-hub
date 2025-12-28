-- Allow BHPH customers to view the vehicle linked to their financing account (even if vehicle status is 'sold')
CREATE POLICY "Customers can view financed vehicles"
ON public.vehicles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_accounts ca
    WHERE ca.vehicle_id = vehicles.id
      AND ca.user_id = auth.uid()
  )
);
