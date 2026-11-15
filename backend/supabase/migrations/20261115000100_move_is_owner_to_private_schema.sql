-- Keep the owner check usable by RLS policies but out of the exposed REST/RPC API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_owner() set schema private;
