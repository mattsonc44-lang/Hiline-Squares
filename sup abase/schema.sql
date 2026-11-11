-- Hi-Line Squares — Supabase schema
-- Runs in the SAME Supabase project as The 28 Board (HiLine28), so it reuses
-- your existing organizer login (public.admins + public.is_admin()).
-- SQL Editor → New query → paste this whole file → Run. Safe to run more than once.

-- Make sure the shared admin pieces exist (they already do if HiLine28 is set up).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- one row per board / game ----------
create table if not exists public.sq_boards (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  title text not null default 'New board',
  top_team text not null default 'Team A',        -- across the top (columns)
  side_team text not null default 'Team B',       -- down the side (rows)
  top_color text not null default '#1f4e9c',
  side_color text not null default '#b3203a',
  game_note text not null default '',             -- e.g. "Thu Nov 26 · 2:30 PM"
  price int not null default 12,                  -- per square
  half_pay int not null default 300,
  final_pay int not null default 900,
  names jsonb not null default to_jsonb(array_fill(''::text, array[100])),  -- 100 names, square 1..100, row by row
  top_digits jsonb,                               -- [3,7,0,...] once drawn
  side_digits jsonb,
  half_top int, half_side int,
  final_top int, final_side int,
  espn_event text, espn_league text,              -- 'nfl' or 'college-football'
  espn_top_id text, espn_side_id text,
  live jsonb,                                     -- {"top":14,"side":10,"state":"in","detail":"Q3 8:12"}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- private: who has paid for their squares (organizer only) ----------
create table if not exists public.sq_paid (
  board_id uuid not null references public.sq_boards(id) on delete cascade,
  name text not null,
  paid boolean not null default false,
  how text not null default '',
  updated_at timestamptz not null default now(),
  primary key (board_id, name)
);

alter table public.sq_boards enable row level security;
alter table public.sq_paid enable row level security;

drop policy if exists "public reads sq_boards" on public.sq_boards;
create policy "public reads sq_boards" on public.sq_boards for select to anon, authenticated using (true);
drop policy if exists "admin writes sq_boards" on public.sq_boards;
create policy "admin writes sq_boards" on public.sq_boards for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only sq_paid" on public.sq_paid;
create policy "admin only sq_paid" on public.sq_paid for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.sq_boards to anon;
grant select, insert, update, delete on public.sq_boards, public.sq_paid to authenticated;

-- ---------- set one square without overwriting the others ----------
create or replace function public.sq_set_name(p_board uuid, p_idx int, p_name text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_idx < 0 or p_idx > 99 then raise exception 'bad square'; end if;
  update public.sq_boards
     set names = jsonb_set(names, array[p_idx::text], to_jsonb(coalesce(trim(p_name), ''))),
         updated_at = now()
   where id = p_board;
end $$;
grant execute on function public.sq_set_name(uuid, int, text) to authenticated;

-- ---------- live updates for viewers ----------
do $$ begin
  begin alter publication supabase_realtime add table public.sq_boards; exception when others then null; end;
end $$;
