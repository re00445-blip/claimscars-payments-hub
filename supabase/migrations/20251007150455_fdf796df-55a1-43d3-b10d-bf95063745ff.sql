-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Assign customer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  mileage INTEGER,
  color TEXT,
  description TEXT,
  images TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vehicles"
  ON public.vehicles FOR SELECT
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Customer accounts table
CREATE TABLE public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  principal_amount DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly')),
  payment_amount DECIMAL(10,2) NOT NULL,
  next_payment_date DATE NOT NULL,
  late_fee_amount DECIMAL(10,2) DEFAULT 25.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON public.customer_accounts FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage accounts"
  ON public.customer_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.customer_accounts(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT,
  principal_paid DECIMAL(10,2) NOT NULL,
  interest_paid DECIMAL(10,2) NOT NULL,
  late_fee_paid DECIMAL(10,2) DEFAULT 0,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_accounts
      WHERE id = payments.account_id AND user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_accounts_updated_at
  BEFORE UPDATE ON public.customer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for vehicle images
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true);

-- Storage policies
CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "Admins can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vehicle images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vehicle-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vehicle images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-images' AND public.has_role(auth.uid(), 'admin'));