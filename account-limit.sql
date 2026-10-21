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

create or replace function private.create_nexo_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_name text;
begin
  member_name := pg_catalog.left(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    80
  );

  if member_name is null then
    member_name := pg_catalog.left(pg_catalog.split_part(new.email, '@', 1), 80);
  end if;

  insert into public.team_members (user_id, email, display_name, role)
  values (new.id, pg_catalog.lower(new.email), member_name, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_nexo_member_profile() from public, anon, authenticated;

drop trigger if exists create_nexo_member_profile on auth.users;

create trigger create_nexo_member_profile
after insert on auth.users
for each row
execute function private.create_nexo_member_profile();

commit;
