-- Harden existing project helper functions without changing application data.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
