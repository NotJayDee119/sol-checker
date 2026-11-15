-- SOL schema (spec §7). Each teacher reads and writes only their own rows;
-- the owner (a Master Teacher) can read every teacher's rows but not change them.

-- ── Teachers ────────────────────────────────────────────────────────────────
create table public.teachers (
  id           uuid primary key references auth.users (id) on delete cascade,
  teacher_name text not null default '' check (char_length(teacher_name) <= 80),
  subject      text not null default '' check (char_length(subject) <= 60),
  is_owner     boolean not null default false,
  last_active  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

comment on table public.teachers is 'Teacher profile (spec §7.3). Names are typed by the teacher, never copied from auth.';
comment on column public.teachers.is_owner is 'Set manually in SQL. Owners can read every teacher''s items and papers.';

-- A profile row is created for every new auth user, so clients never insert one.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teachers (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owner check used by policies. SECURITY DEFINER avoids recursive RLS on teachers.
create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select t.is_owner from public.teachers t where t.id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Items ───────────────────────────────────────────────────────────────────
create table public.items (
  id          text primary key check (char_length(id) between 1 and 64),
  teacher_id  uuid not null default auth.uid() references public.teachers (id) on delete cascade,
  kind        text not null check (kind in ('essay', 'math')),
  title       text not null check (char_length(title) between 1 and 200),
  q           text not null default '' check (char_length(q) <= 5000),
  grade       text not null default '' check (char_length(grade) <= 100),
  key         text not null default '' check (char_length(key) <= 5000),
  words       integer not null default 0 check (words between 0 and 5000),
  lang        text not null default 'English' check (char_length(lang) <= 60),
  strict      text not null default 'balanced' check (strict in ('lenient', 'balanced', 'strict')),
  rubric      jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index items_teacher_updated_idx on public.items (teacher_id, updated_at desc);

-- ── Papers ──────────────────────────────────────────────────────────────────
-- Photos are never stored (spec §7.3, §9); only results.
create table public.papers (
  id             text primary key check (char_length(id) between 1 and 64),
  teacher_id     uuid not null default auth.uid() references public.teachers (id) on delete cascade,
  item_id        text references public.items (id) on delete set null,
  kind           text not null check (kind in ('essay', 'math')),
  learner        text not null default '' check (char_length(learner) <= 120),
  section        text not null default '' check (char_length(section) <= 60),
  item_title     text not null default '',
  question       text not null default '',
  readable       boolean not null default true,
  issue          text not null default '',
  transcription  text not null default '',
  criteria       jsonb not null default '[]'::jsonb check (jsonb_typeof(criteria) = 'array'),
  total          integer not null default 0 check (total >= 0),
  max            integer not null default 0 check (max >= 0),
  pct            integer not null default 0 check (pct between 0 and 100),
  strengths      jsonb not null default '[]'::jsonb,
  improvements   jsonb not null default '[]'::jsonb,
  feedback       text not null default '',
  note           text not null default '',
  legibility     text not null default '' check (legibility in ('good', 'fair', 'poor', '')),
  -- Kind-specific fields: essay {word_count, minWords, found, missing, errors};
  -- math {steps, firstError, finalAnswer, finalCorrect, correctAnswer, misconceptions}.
  details        jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  demo           boolean not null default false,
  edited         boolean not null default false,
  edited_at      timestamptz,
  checked_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index papers_teacher_checked_idx on public.papers (teacher_id, checked_at desc);
create index papers_item_idx on public.papers (item_id);

-- ── Privileges ──────────────────────────────────────────────────────────────
-- Teachers may only edit their own name/subject/activity; never is_owner or id.
revoke all on public.teachers from anon, authenticated;
grant select on public.teachers to authenticated;
grant update (teacher_name, subject, last_active) on public.teachers to authenticated;

revoke all on public.items, public.papers from anon;
grant select, insert, update, delete on public.items, public.papers to authenticated;

-- ── Row level security ──────────────────────────────────────────────────────
alter table public.teachers enable row level security;
alter table public.items enable row level security;
alter table public.papers enable row level security;

create policy "Teachers read own profile; owner reads all"
  on public.teachers for select to authenticated
  using (id = (select auth.uid()) or (select public.is_owner()));

create policy "Teachers update own profile"
  on public.teachers for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Teachers read own items; owner reads all"
  on public.items for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_owner()));

create policy "Teachers insert own items"
  on public.items for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy "Teachers update own items"
  on public.items for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "Teachers delete own items"
  on public.items for delete to authenticated
  using (teacher_id = (select auth.uid()));

create policy "Teachers read own papers; owner reads all"
  on public.papers for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_owner()));

create policy "Teachers insert own papers"
  on public.papers for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and (item_id is null or exists (
      select 1 from public.items i where i.id = item_id and i.teacher_id = (select auth.uid())
    ))
  );

create policy "Teachers update own papers"
  on public.papers for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and (item_id is null or exists (
      select 1 from public.items i where i.id = item_id and i.teacher_id = (select auth.uid())
    ))
  );

create policy "Teachers delete own papers"
  on public.papers for delete to authenticated
  using (teacher_id = (select auth.uid()));
