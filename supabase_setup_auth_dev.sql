-- Echtes Login für die Dev-Umgebung (ersetzt den Passwortschirm aus
-- supabase_setup_app_settings.sql). Zugriff auf trips_dev nur noch für
-- angemeldete Supabase-Benutzer, die zusätzlich in app_users freigeschaltet
-- sind. Die Freischaltliste schützt auch dann, wenn in Supabase versehentlich
-- die Selbst-Registrierung ("Allow new users to sign up") aktiv ist.

-- Freischaltliste. Pflege nur über den SQL-Editor, z. B.:
--   insert into app_users (user_id)
--   select id from auth.users where email = 'name@example.com';
create table public.app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
revoke all on public.app_users from anon;

-- Jeder Benutzer darf nur seine eigene Zeile sehen (reicht für die Policies
-- unten und für die Prüfung "bin ich freigeschaltet?" im Frontend).
create policy "read own membership" on public.app_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- trips_dev: offene Policies durch "nur freigeschaltete Benutzer" ersetzen.
drop policy "public read" on public.trips_dev;
drop policy "public insert" on public.trips_dev;
drop policy "public update" on public.trips_dev;
drop policy "public delete" on public.trips_dev;

revoke all on public.trips_dev from anon;

create policy "members read" on public.trips_dev
  for select to authenticated
  using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid())));

create policy "members insert" on public.trips_dev
  for insert to authenticated
  with check (exists (select 1 from public.app_users u where u.user_id = (select auth.uid())));

create policy "members update" on public.trips_dev
  for update to authenticated
  using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_users u where u.user_id = (select auth.uid())));

create policy "members delete" on public.trips_dev
  for delete to authenticated
  using (exists (select 1 from public.app_users u where u.user_id = (select auth.uid())));

-- app_settings_dev (altes App-Passwort im Klartext) wird nicht mehr gebraucht:
-- komplett sperren. Kann gelöscht werden, sobald auch die Produktion umgestellt ist.
drop policy "public read" on public.app_settings_dev;
drop policy "public insert" on public.app_settings_dev;
drop policy "public update" on public.app_settings_dev;
revoke all on public.app_settings_dev from anon, authenticated;
