-- Fix search_path for log_activity function
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;