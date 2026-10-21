begin;

create or replace function private.enforce_nexo_auth_user_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_accounts integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(1886351987, 6);

  select count(*)::integer
  into existing_accounts
  from auth.users;

  if existing_accounts >= 6 then
    raise exception using
      errcode = 'P0001',
      message = 'NEXO_TEAM_ACCOUNT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_nexo_auth_user_limit() from public, anon, authenticated;

drop trigger if exists enforce_nexo_auth_user_limit on auth.users;

create trigger enforce_nexo_auth_user_limit
before insert on auth.users
for each row
execute function private.enforce_nexo_auth_user_limit();

commit;
