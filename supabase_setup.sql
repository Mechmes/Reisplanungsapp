create table trips (
  id text primary key,
  title text not null default 'Neue Reise',
  start date,
  "end" date,
  days jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trips enable row level security;

-- Kein Login vorgesehen: jeder mit dem Link darf lesen/schreiben/löschen.
create policy "public read" on trips for select using (true);
create policy "public insert" on trips for insert with check (true);
create policy "public update" on trips for update using (true);
create policy "public delete" on trips for delete using (true);
