-- is_allowed() is only needed by row-level security for signed-in users
revoke execute on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;
