-- Grade levels the teacher handles, typed on Create account (step 1, "About you") and in Settings.
-- Free text such as 'Grade 7, Grade 8' or 'Kinder'; empty when skipped.
--
-- Safe to run more than once.

alter table public.teachers add column if not exists grade_level text not null default '';

alter table public.teachers drop constraint if exists teachers_grade_level_check;
alter table public.teachers add constraint teachers_grade_level_check check (char_length(grade_level) <= 200);

comment on column public.teachers.grade_level is 'Grade levels the teacher handles, e.g. ''Grade 7, Grade 8''. Typed by the teacher.';

grant update (grade_level) on public.teachers to authenticated;
