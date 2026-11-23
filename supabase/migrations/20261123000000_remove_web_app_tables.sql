-- Remove the tables the retired web app used. The iOS app reads only
-- public.profiles (the tier column, and only with accounts turned on), so
-- profiles is the one table kept.

-- New sign-ups must stop writing to alert_configs before it is dropped.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (NEW.id, NEW.email, 'free');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Children before parents; CASCADE also removes their policies, indexes and
-- triggers (update_alert_configs_updated_at).
DROP TABLE IF EXISTS
  public.satellite_anomalies,
  public.satellites,
  public.org_members,
  public.alert_configs,
  public.user_locations,
  public.alert_log,
  public.push_subscriptions,
  public.gnss_regions,
  public.kp_history,
  public.solar_wind_history,
  public.proton_flux_history,
  public.electron_flux_history,
  public.tec_history,
  public.scintillation_history,
  public.gnss_constellation_status,
  public.organizations
CASCADE;

-- Organizations are gone, so the profile's link to one goes too.
DROP INDEX IF EXISTS public.idx_profiles_org_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS org_id;
