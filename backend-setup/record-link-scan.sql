begin;

create or replace function public.record_link_scan(p_slug text)
returns table (destination_url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.links as link
  set scans = link.scans + 1
  where link.slug = p_slug
    and link.active = true
    and p_slug ~ '^[a-z0-9-]{2,64}$'
  returning link.destination_url;
end;
$$;

revoke all on function public.record_link_scan(text) from public;
grant execute on function public.record_link_scan(text) to anon, authenticated;

commit;
