-- Prevent users from editing their email or subscription tier through the Data API.
revoke update on public.profiles from authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;
