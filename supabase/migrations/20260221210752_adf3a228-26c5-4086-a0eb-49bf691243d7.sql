ALTER TABLE public.customer_accounts DROP CONSTRAINT customer_accounts_status_check;

ALTER TABLE public.customer_accounts ADD CONSTRAINT customer_accounts_status_check CHECK (status IN ('active', 'paid_off', 'delinquent', 'repossessed', 'completed'));