-- Incremental migration for the existing Overload database.
-- The public schema before this migration is documented in docs/supabase-schema-snapshot-2026-10-14.json.

create table public.food_catalog (
  id uuid primary key default gen_random_uuid(),
  source_code text not null unique,
  name text not null,
  synonyms text[] not null default '{}',
  calories_per_100g numeric(10, 3) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(10, 3) not null check (protein_per_100g >= 0),
  carb_per_100g numeric(10, 3) not null check (carb_per_100g >= 0),
  fat_per_100g numeric(10, 3) not null check (fat_per_100g >= 0),
  source_name text not null,
  source_url text not null,
  source_version text not null,
  created_at timestamptz not null default now()
);

alter table public.food_catalog enable row level security;
create policy "authenticated users read food catalog"
  on public.food_catalog for select to authenticated using (true);
grant select on public.food_catalog to authenticated;

-- No duplicate (user_id, eaten_on, meal_type) groups existed in the 2026-10-14
-- read-only inspection. Recheck this before applying to another database.
alter table public.meals
  add constraint meals_user_day_type_key unique (user_id, eaten_on, meal_type);

alter table public.meal_items
  add column food_catalog_id uuid references public.food_catalog(id),
  add column entry_source text not null default 'manual'
    check (entry_source in ('manual', 'photo_catalog', 'photo_manual'));
create index meal_items_food_catalog_idx on public.meal_items (food_catalog_id)
  where food_catalog_id is not null;

create table public.photo_meal_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  meal_id uuid not null references public.meals(id) on delete cascade,
  eaten_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index photo_meal_submissions_user_idx
  on public.photo_meal_submissions (user_id, created_at desc);
alter table public.photo_meal_submissions enable row level security;
create policy "users read own photo submissions"
  on public.photo_meal_submissions for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.photo_meal_submissions to authenticated;

create table public.photo_analysis_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index photo_analysis_requests_user_time_idx
  on public.photo_analysis_requests (user_id, created_at desc);
alter table public.photo_analysis_requests enable row level security;

create or replace function public.reserve_photo_analysis()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select count(*) into v_count
  from public.photo_analysis_requests
  where user_id = v_user_id and created_at >= now() - interval '24 hours';

  if v_count >= 10 then
    return false;
  end if;

  insert into public.photo_analysis_requests (user_id) values (v_user_id);
  return true;
end;
$$;
revoke all on function public.reserve_photo_analysis() from public;
grant execute on function public.reserve_photo_analysis() to authenticated;

create or replace function public.save_photo_meal(
  p_request_id uuid,
  p_eaten_on date,
  p_meal_type public.meal_type,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_meal_id uuid;
  v_item jsonb;
  v_catalog public.food_catalog%rowtype;
  v_catalog_id uuid;
  v_quantity numeric;
  v_name text;
  v_calories numeric;
  v_protein numeric;
  v_carb numeric;
  v_fat numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_request_id is null or p_meal_type is null or
     p_eaten_on is distinct from (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Invalid submission';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or
     jsonb_array_length(p_items) not between 1 and 12 then
    raise exception 'Invalid items';
  end if;

  -- Serializes retries of the same request, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || p_request_id::text, 0));
  select meal_id into v_meal_id
  from public.photo_meal_submissions
  where user_id = v_user_id and request_id = p_request_id;
  if found then
    return v_meal_id;
  end if;

  insert into public.meals (user_id, eaten_on, meal_type)
  values (v_user_id, p_eaten_on, p_meal_type)
  on conflict (user_id, eaten_on, meal_type) do nothing;

  select id into v_meal_id
  from public.meals
  where user_id = v_user_id and eaten_on = p_eaten_on and meal_type = p_meal_type;
  if v_meal_id is null then
    raise exception 'Meal unavailable';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_catalog_id := nullif(v_item->>'food_catalog_id', '')::uuid;
    v_quantity := nullif(v_item->>'quantity_g', '')::numeric;
    if v_quantity is null or v_quantity <= 0 or v_quantity > 3000 then
      raise exception 'Invalid quantity';
    end if;

    if v_catalog_id is not null then
      select * into v_catalog from public.food_catalog where id = v_catalog_id;
      if not found then
        raise exception 'Food not found';
      end if;
      v_name := left(v_catalog.name, 80);
      v_calories := round(v_catalog.calories_per_100g * v_quantity / 100, 1);
      v_protein := round(v_catalog.protein_per_100g * v_quantity / 100, 1);
      v_carb := round(v_catalog.carb_per_100g * v_quantity / 100, 1);
      v_fat := round(v_catalog.fat_per_100g * v_quantity / 100, 1);
    else
      v_name := trim(v_item->>'name');
      if v_name is null or length(v_name) not between 1 and 80 then
        raise exception 'Invalid food name';
      end if;
      v_calories := nullif(v_item->>'calories', '')::numeric;
      v_protein := nullif(v_item->>'protein_g', '')::numeric;
      v_carb := nullif(v_item->>'carb_g', '')::numeric;
      v_fat := nullif(v_item->>'fat_g', '')::numeric;
      if v_calories is null or v_protein is null or v_carb is null or v_fat is null or
         v_calories < 0 or v_calories > 10000 or
         v_protein < 0 or v_protein > 1000 or
         v_carb < 0 or v_carb > 1000 or v_fat < 0 or v_fat > 1000 then
        raise exception 'Invalid manual nutrition';
      end if;
    end if;

    insert into public.meal_items
      (meal_id, name, quantity_g, calories, protein_g, carb_g, fat_g,
       food_catalog_id, entry_source)
    values
      (v_meal_id, v_name, v_quantity, v_calories, v_protein, v_carb, v_fat,
       v_catalog_id, case when v_catalog_id is null then 'photo_manual' else 'photo_catalog' end);
  end loop;

  insert into public.photo_meal_submissions (user_id, request_id, meal_id, eaten_on)
  values (v_user_id, p_request_id, v_meal_id, p_eaten_on);
  return v_meal_id;
end;
$$;
revoke all on function public.save_photo_meal(uuid, date, public.meal_type, jsonb) from public;
grant execute on function public.save_photo_meal(uuid, date, public.meal_type, jsonb) to authenticated;
