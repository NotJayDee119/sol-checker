-- Admin dashboard support (admin/ web app).
--   * teachers.suspended: the owner can pause an account; suspended teachers keep read
--     access to their own records but cannot add, change or delete anything.
--   * public.heartbeat(): the app calls this every minute or so while open, so the
--     dashboard can count who is online (last_active within the last few minutes).
--   * public.admin_*(): owner-only reads and maintenance. Each one checks
--     private.is_owner() first and raises 42501 for anyone else.
-- Papers stay read-only for the owner (spec §2, §11) except the quarterly purge (spec §7.5).
--
-- Safe to run more than once (e.g. pasted into the SQL editor again): every statement
-- skips or replaces what already exists.

-- ── Suspension ──────────────────────────────────────────────────────────────
alter table public.teachers add column if not exists suspended boolean not null default false;
comment on column public.teachers.suspended is 'Set from the admin dashboard. Suspended teachers can read but not write their items and papers.';

create or replace function private.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select t.suspended from public.teachers t where t.id = (select auth.uid())),
    false
  );
$$;

revoke execute on function private.is_suspended() from public, anon;
grant execute on function private.is_suspended() to authenticated;

-- Restrictive policies are AND-ed with the existing permissive ones.
drop policy if exists "Suspended teachers cannot add items" on public.items;
create policy "Suspended teachers cannot add items"
  on public.items as restrictive for insert to authenticated
  with check (not (select private.is_suspended()));
drop policy if exists "Suspended teachers cannot change items" on public.items;
create policy "Suspended teachers cannot change items"
  on public.items as restrictive for update to authenticated
  using (not (select private.is_suspended()));
drop policy if exists "Suspended teachers cannot delete items" on public.items;
create policy "Suspended teachers cannot delete items"
  on public.items as restrictive for delete to authenticated
  using (not (select private.is_suspended()));

drop policy if exists "Suspended teachers cannot add papers" on public.papers;
create policy "Suspended teachers cannot add papers"
  on public.papers as restrictive for insert to authenticated
  with check (not (select private.is_suspended()));
drop policy if exists "Suspended teachers cannot change papers" on public.papers;
create policy "Suspended teachers cannot change papers"
  on public.papers as restrictive for update to authenticated
  using (not (select private.is_suspended()));
drop policy if exists "Suspended teachers cannot delete papers" on public.papers;
create policy "Suspended teachers cannot delete papers"
  on public.papers as restrictive for delete to authenticated
  using (not (select private.is_suspended()));

-- ── Presence ────────────────────────────────────────────────────────────────
-- Server clock, so a device with a wrong clock can't appear online forever.
create or replace function public.heartbeat()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.teachers set last_active = now() where id = (select auth.uid());
$$;

revoke execute on function public.heartbeat() from public, anon;
grant execute on function public.heartbeat() to authenticated;

create index if not exists teachers_last_active_idx on public.teachers (last_active desc);

-- ── Owner analytics ─────────────────────────────────────────────────────────
-- One round trip for the Overview page. Security invoker: the owner's RLS already
-- allows reading every row. Demo (simulated) papers are counted but kept out of scores.
create or replace function public.admin_overview(
  p_days integer default 30,
  p_tz text default 'Asia/Manila',
  p_online_minutes integer default 5
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today timestamptz;
  v_since timestamptz;
  v_result jsonb;
begin
  if not private.is_owner() then
    raise exception 'Only the owner can open the admin dashboard.' using errcode = '42501';
  end if;

  p_days := least(greatest(coalesce(p_days, 30), 1), 365);
  p_online_minutes := least(greatest(coalesce(p_online_minutes, 5), 1), 120);
  v_today := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
  v_since := v_today - make_interval(days => p_days - 1);

  select jsonb_build_object(
    'generated_at', now(),
    'days', p_days,
    'online_minutes', p_online_minutes,
    'teachers', (
      select jsonb_build_object(
        'total', count(*),
        'online', count(*) filter (where t.last_active > now() - make_interval(mins => p_online_minutes)),
        'active_today', count(*) filter (where t.last_active >= v_today),
        'active_7d', count(*) filter (where t.last_active > now() - interval '7 days'),
        'new_period', count(*) filter (where t.created_at >= v_since),
        'suspended', count(*) filter (where t.suspended),
        'owners', count(*) filter (where t.is_owner)
      )
      from public.teachers t
    ),
    'items', (select count(*) from public.items),
    'papers', (
      select jsonb_build_object(
        'total', count(*),
        'period', count(*) filter (where p.checked_at >= v_since),
        'today', count(*) filter (where p.checked_at >= v_today),
        'scored', count(*) filter (where p.checked_at >= v_since and p.readable and p.max > 0 and not p.demo),
        'passing', count(*) filter (where p.checked_at >= v_since and p.readable and p.max > 0 and not p.demo and p.pct >= 75),
        'avg_pct', round(avg(p.pct) filter (where p.checked_at >= v_since and p.readable and p.max > 0 and not p.demo)),
        'unreadable', count(*) filter (where p.checked_at >= v_since and not p.readable),
        'edited', count(*) filter (where p.checked_at >= v_since and p.edited),
        'demo', count(*) filter (where p.demo)
      )
      from public.papers p
    ),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'papers', coalesce(c.n, 0)) order by d.day), '[]'::jsonb)
      from generate_series(
        (v_since at time zone p_tz)::date,
        (v_today at time zone p_tz)::date,
        interval '1 day'
      ) as d(day)
      left join (
        select (p.checked_at at time zone p_tz)::date as day, count(*) as n
        from public.papers p
        where p.checked_at >= v_since
        group by 1
      ) c on c.day = d.day::date
    ),
    'by_kind', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', k.kind, 'papers', k.n, 'avg_pct', k.avg_pct) order by k.kind), '[]'::jsonb)
      from (
        select p.kind, count(*) as n,
               round(avg(p.pct) filter (where p.readable and p.max > 0 and not p.demo)) as avg_pct
        from public.papers p
        where p.checked_at >= v_since
        group by p.kind
      ) k
    ),
    'bands', (
      select jsonb_build_object(
        'outstanding', count(*) filter (where p.pct >= 90),
        'very_satisfactory', count(*) filter (where p.pct between 85 and 89),
        'satisfactory', count(*) filter (where p.pct between 80 and 84),
        'fairly_satisfactory', count(*) filter (where p.pct between 75 and 79),
        'did_not_meet', count(*) filter (where p.pct < 75)
      )
      from public.papers p
      where p.checked_at >= v_since and p.readable and p.max > 0 and not p.demo
    ),
    'top_teachers', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'papers', x.n) order by x.n desc, x.name), '[]'::jsonb)
      from (
        select t.id, t.teacher_name as name, count(*) as n
        from public.papers p
        join public.teachers t on t.id = p.teacher_id
        where p.checked_at >= v_since
        group by t.id, t.teacher_name
        order by n desc, t.teacher_name
        limit 8
      ) x
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Security definer only to read the sign-in email and last sign-in from auth.users.
create or replace function public.admin_teachers(p_online_minutes integer default 5)
returns table (
  id uuid,
  teacher_name text,
  subject text,
  email text,
  is_owner boolean,
  suspended boolean,
  online boolean,
  last_active timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  items bigint,
  papers bigint,
  papers_7d bigint,
  avg_pct integer,
  last_paper_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.is_owner() then
    raise exception 'Only the owner can open the admin dashboard.' using errcode = '42501';
  end if;

  p_online_minutes := least(greatest(coalesce(p_online_minutes, 5), 1), 120);

  return query
  select
    t.id,
    t.teacher_name,
    t.subject,
    u.email::text,
    t.is_owner,
    t.suspended,
    t.last_active > now() - make_interval(mins => p_online_minutes),
    t.last_active,
    u.last_sign_in_at,
    t.created_at,
    coalesce(i.n, 0)::bigint,
    coalesce(pp.n, 0)::bigint,
    coalesce(pp.n7, 0)::bigint,
    pp.avg_pct::integer,
    pp.last_at
  from public.teachers t
  left join auth.users u on u.id = t.id
  left join lateral (
    select count(*) as n from public.items it where it.teacher_id = t.id
  ) i on true
  left join lateral (
    select count(*) as n,
           count(*) filter (where p.checked_at > now() - interval '7 days') as n7,
           round(avg(p.pct) filter (where p.readable and p.max > 0 and not p.demo)) as avg_pct,
           max(p.checked_at) as last_at
    from public.papers p
    where p.teacher_id = t.id
  ) pp on true
  order by t.last_active desc;
end;
$$;

-- ── Owner maintenance ───────────────────────────────────────────────────────
-- Grant/revoke owner access and suspend/restore accounts. Pass null to leave a field as is.
create or replace function public.admin_update_teacher(
  p_teacher uuid,
  p_is_owner boolean default null,
  p_suspended boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner boolean;
  v_suspended boolean;
begin
  if not private.is_owner() then
    raise exception 'Only the owner can manage teachers.' using errcode = '42501';
  end if;

  select t.is_owner, t.suspended into v_owner, v_suspended
  from public.teachers t where t.id = p_teacher
  for update;
  if not found then
    raise exception 'Teacher not found.' using errcode = 'P0002';
  end if;

  v_owner := coalesce(p_is_owner, v_owner);
  v_suspended := coalesce(p_suspended, v_suspended);

  if p_teacher = (select auth.uid()) and (not v_owner or v_suspended) then
    raise exception 'You can''t remove your own owner access or suspend yourself.' using errcode = '42501';
  end if;
  if v_owner and v_suspended then
    raise exception 'An owner can''t be suspended. Remove owner access first.' using errcode = '22023';
  end if;

  update public.teachers
  set is_owner = v_owner, suspended = v_suspended
  where id = p_teacher;
end;
$$;

-- Quarterly clean-up (spec §7.5): delete papers checked before a date, or only demo papers.
-- Dry run (the default) returns the count without deleting. Export a CSV first.
create or replace function public.admin_purge_papers(
  p_before timestamptz,
  p_demo_only boolean default false,
  p_dry_run boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_owner() then
    raise exception 'Only the owner can delete papers.' using errcode = '42501';
  end if;
  if p_before is null or p_before > now() then
    raise exception 'Pick a cut-off date that is not in the future.' using errcode = '22023';
  end if;

  if p_dry_run then
    select count(*) into v_count from public.papers p
    where p.checked_at < p_before and (not p_demo_only or p.demo);
  else
    delete from public.papers p
    where p.checked_at < p_before and (not p_demo_only or p.demo);
    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;

revoke execute on function
  public.admin_overview(integer, text, integer),
  public.admin_teachers(integer),
  public.admin_update_teacher(uuid, boolean, boolean),
  public.admin_purge_papers(timestamptz, boolean, boolean)
from public, anon;

grant execute on function
  public.admin_overview(integer, text, integer),
  public.admin_teachers(integer),
  public.admin_update_teacher(uuid, boolean, boolean),
  public.admin_purge_papers(timestamptz, boolean, boolean)
to authenticated;

-- ── Dummy owner account (development) ───────────────────────────────────────
-- Sign in to the admin dashboard with username "admin" (= admin@sol.local), password "admin".
-- CHANGE THE PASSWORD before real student data goes in:
--   update auth.users set encrypted_password = extensions.crypt('new-password', extensions.gen_salt('bf'))
--   where email = 'admin@sol.local';
-- Skipped if the account already exists, so this block is safe to run again.
do $$
declare
  v_email    text := 'admin@sol.local';
  v_password text := 'admin';
  v_uid      uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  -- Token columns must be '' not NULL, or the auth server fails to read the row.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- on_auth_user_created already made the teachers row; promote it to owner.
  update public.teachers set is_owner = true, teacher_name = 'Admin' where id = v_uid;
end;
$$;
