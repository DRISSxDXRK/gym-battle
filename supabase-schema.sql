-- Gym Battle schema — run this in your Supabase project's SQL editor.
-- It's a 2-person fun app: RLS is enabled with permissive anon policies.

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  elo int not null default 1200,
  goal text not null default 'maintain',           -- gain | lose | maintain
  goal_weight numeric,
  calorie_target int,
  start_weight numeric,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise text not null,
  set_no int not null,
  reps int not null,
  weight_kg numeric not null
);

create table if not exists bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  unique (user_id, date)
);

create table if not exists calorie_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  calories int not null,
  target int not null default 0,
  unique (user_id, date)
);

create table if not exists elo_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  elo_before int not null,
  elo_after int not null,
  week_points int not null default 0
);

-- ---------- indexes ----------
create index if not exists idx_sessions_user_date on sessions (user_id, date desc);
create index if not exists idx_sets_session on sets (session_id);
create index if not exists idx_bw_user_date on bodyweight_logs (user_id, date);
create index if not exists idx_cal_user_date on calorie_logs (user_id, date);
create index if not exists idx_elo_user_week on elo_history (user_id, week_start);

-- ---------- RLS: permissive anon access (2-person fun app) ----------
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table sets enable row level security;
alter table bodyweight_logs enable row level security;
alter table calorie_logs enable row level security;
alter table elo_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','sessions','sets','bodyweight_logs','calorie_logs','elo_history'] loop
    execute format('drop policy if exists anon_all on %I', t);
    execute format('create policy anon_all on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;
