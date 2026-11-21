create table public.persons (
  id uuid primary key,
  email text unique,
  email_domain text,
  domain_kind text,
  first_name text,
  created_at timestamptz not null default now(),
  constraint persons_domain_kind_check check (domain_kind is null or domain_kind in ('work', 'freemail'))
);

grant select on public.persons to authenticated;
grant all on public.persons to service_role;

alter table public.persons enable row level security;

create policy "people can read only their own person"
on public.persons
for select
to authenticated
using ((select auth.uid()) = id);

alter table public.respondents
  add column person_id uuid references public.persons(id) on delete set null;

create index respondents_person_id_idx on public.respondents(person_id);

create or replace function public.classify_email_domain(domain text)
returns text
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select case
    when lower(domain) in (
      'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com',
      'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
      'icloud.com', 'me.com', 'mac.com', 'proton.me',
      'protonmail.com', 'pm.me', 'aol.com', 'gmx.com',
      'mail.com', 'zoho.com', 'hey.com', 'fastmail.com', 'yandex.com'
    ) then 'freemail'
    else 'work'
  end;
$$;

revoke all on function public.classify_email_domain(text) from public, anon, authenticated;
grant execute on function public.classify_email_domain(text) to service_role;

create or replace function public.ensure_person()
returns public.persons
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  account_email text;
  domain text;
  person public.persons;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select email into account_email from auth.users where id = uid;
  if account_email is null then
    raise exception 'No email on this account';
  end if;

  domain := lower(split_part(account_email, '@', 2));

  insert into public.persons (id, email, email_domain, domain_kind)
  values (uid, account_email, domain, public.classify_email_domain(domain))
  on conflict (id) do nothing;

  select * into person from public.persons where id = uid;
  return person;
end;
$$;

revoke all on function public.ensure_person() from public, anon;
grant execute on function public.ensure_person() to authenticated;
grant execute on function public.ensure_person() to service_role;

create or replace function public.claim_respondent(edit_token uuid)
returns table(result text, company_code text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  respondent_row record;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  perform public.ensure_person();

  select r.id, r.person_id, r.first_name, c.code
    into respondent_row
    from public.respondents r
    left join public.companies c on c.id = r.company_id
    where r.edit_token = claim_respondent.edit_token;

  if respondent_row.id is null then
    raise exception 'Profile not found';
  end if;

  if respondent_row.person_id is null then
    update public.respondents
      set person_id = uid
      where id = respondent_row.id and person_id is null;

    update public.persons
      set first_name = nullif(respondent_row.first_name, '')
      where id = uid and (first_name is null or btrim(first_name) = '');

    return query select 'claimed'::text, respondent_row.code::text;
  elsif respondent_row.person_id = uid then
    return query select 'already_yours'::text, respondent_row.code::text;
  else
    return query select 'claimed_by_other'::text, respondent_row.code::text;
  end if;
end;
$$;

revoke all on function public.claim_respondent(uuid) from public, anon;
grant execute on function public.claim_respondent(uuid) to authenticated;
grant execute on function public.claim_respondent(uuid) to service_role;