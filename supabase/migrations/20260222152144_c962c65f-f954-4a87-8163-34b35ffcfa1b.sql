-- Create a function to assign role on signup, callable by authenticated users for themselves only
CREATE OR REPLACE FUNCTION public.assign_role_on_signup(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow assigning student or teacher roles (not admin)
  IF _role NOT IN ('student', 'teacher') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  
  -- Only insert if user has no role yet
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role);
  END IF;
END;
$$;