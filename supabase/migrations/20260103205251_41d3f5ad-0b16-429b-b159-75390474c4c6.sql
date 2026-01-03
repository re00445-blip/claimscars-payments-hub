-- Create admin_notes table for storing notes with dates
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Admins with passwords permission can manage notes
CREATE POLICY "Admins with permission can view notes"
ON public.admin_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (
    has_permission(auth.uid(), 'passwords'::text) OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = 'ramon@carsandclaims.com')
  )
);

CREATE POLICY "Admins with permission can insert notes"
ON public.admin_notes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND (
    has_permission(auth.uid(), 'passwords'::text) OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = 'ramon@carsandclaims.com')
  )
);

CREATE POLICY "Admins with permission can update notes"
ON public.admin_notes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (
    has_permission(auth.uid(), 'passwords'::text) OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = 'ramon@carsandclaims.com')
  )
);

CREATE POLICY "Admins with permission can delete notes"
ON public.admin_notes
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (
    has_permission(auth.uid(), 'passwords'::text) OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.email = 'ramon@carsandclaims.com')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_notes_updated_at
BEFORE UPDATE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();