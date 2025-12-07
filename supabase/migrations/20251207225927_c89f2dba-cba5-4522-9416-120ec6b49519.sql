-- Create payment reminders table to track sent reminders
CREATE TABLE public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '7_days_before', '3_days_before', '1_day_late'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_via TEXT NOT NULL, -- 'email', 'sms', 'both'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed'
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_reminders
CREATE POLICY "Users can view their own reminders"
ON public.payment_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_accounts ca
    WHERE ca.id = account_id AND ca.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all reminders"
ON public.payment_reminders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert reminders"
ON public.payment_reminders
FOR INSERT
WITH CHECK (true);

-- Add address field to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;