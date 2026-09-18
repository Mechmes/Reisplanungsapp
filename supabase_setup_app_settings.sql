-- Speichert das App-Passwort in der Datenbank, damit es über die
-- Einstellungen in der App geändert werden kann (statt fest im JS-Code
-- zu stehen) und die Änderung für alle Geräte gilt.
-- Einmalig im Supabase SQL-Editor ausführen.

create table app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "public read" on app_settings for select using (true);
create policy "public insert" on app_settings for insert with check (true);
create policy "public update" on app_settings for update using (true);

insert into app_settings (key, value) values ('password', 'reise2027');

-- Dev-Umgebung: eigene Tabelle, analog zu trips / trips_dev.
create table app_settings_dev (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings_dev enable row level security;

create policy "public read" on app_settings_dev for select using (true);
create policy "public insert" on app_settings_dev for insert with check (true);
create policy "public update" on app_settings_dev for update using (true);

insert into app_settings_dev (key, value) values ('password', 'reise2027');
