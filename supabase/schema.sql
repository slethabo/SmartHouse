-- SmartHouse: run ONCE in a NEW Supabase project's SQL Editor as postgres.
-- Supabase already creates the database and auth.users. No CREATE DATABASE needed.
-- This is a standalone setup script, not a migration for server/src/db/schema.sql.
-- No payments, orders, or checkout. All prices below are construction estimates.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Authentication credentials remain in Supabase Auth, never in these tables.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Set membership using the SQL Editor only. User-editable metadata is NOT a role.
create table private.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.administrators enable row level security;
revoke all on private.administrators from public, anon, authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.administrators where user_id = auth.uid());
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create function public.my_role() returns text
language sql stable security invoker set search_path = '' as $$
  select case when private.is_admin() then 'admin' else 'homeowner' end;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_created_idx on public.projects(owner_id, created_at desc);

create table public.consultation_drafts (
  project_id uuid primary key references public.projects(id) on delete cascade,
  questionnaire_version integer not null default 1 check (questionnaire_version = 1),
  revision integer not null default 0 check (revision >= 0),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.design_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null check (version > 0),
  draft_revision integer not null check (draft_revision >= 0),
  questionnaire_version integer not null check (questionnaire_version = 1),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  site_width_m numeric(8,2) not null check (site_width_m between 5 and 200),
  site_depth_m numeric(8,2) not null check (site_depth_m between 5 and 200),
  budget numeric(14,2) not null check (budget > 0 and budget <= 100000000),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  assumptions text not null default 'Schematic single-storey concept; professional review required.',
  confirmed_at timestamptz not null default now(),
  unique (project_id, version),
  unique (project_id, draft_revision),
  unique (project_id, id)
);

-- Each row is an immutable, complete release. Publish a NEW row to change rates.
create table public.pricing_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (char_length(btrim(version)) between 1 and 80),
  context text not null check (char_length(btrim(context)) > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  basic_rate_per_m2 numeric(12,2) not null check (basic_rate_per_m2 > 0 and basic_rate_per_m2 < 10000000),
  standard_rate_per_m2 numeric(12,2) not null,
  premium_rate_per_m2 numeric(12,2) not null,
  assumptions text not null,
  exclusions text not null,
  effective_on date not null,
  -- Audit UUID retained even if the publisher later deletes their Auth account.
  published_by uuid,
  published_at timestamptz not null default now(),
  check (standard_rate_per_m2 >= basic_rate_per_m2 and premium_rate_per_m2 >= standard_rate_per_m2
    and premium_rate_per_m2 < 10000000)
);

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brief_id uuid not null,
  pricing_release_id uuid not null references public.pricing_releases(id),
  request_key uuid not null,
  generator_version text not null check (char_length(btrim(generator_version)) > 0),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  diagnostics jsonb not null default '{}'::jsonb check (jsonb_typeof(diagnostics) = 'object'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (project_id, brief_id) references public.design_briefs(project_id, id),
  unique (project_id, request_key),
  unique (project_id, brief_id, pricing_release_id, id),
  check ((status in ('completed','failed')) = (finished_at is not null)),
  check (finished_at is null or finished_at >= started_at)
);
create index generation_runs_brief_idx on public.generation_runs(project_id, brief_id);
create index generation_runs_pricing_idx on public.generation_runs(pricing_release_id);

create table public.house_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  brief_id uuid not null,
  generation_run_id uuid not null,
  pricing_release_id uuid not null,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  architectural_style text not null check (architectural_style in ('Modern','Traditional','Minimalist')),
  bedrooms smallint not null check (bedrooms between 1 and 6),
  bathrooms smallint not null check (bathrooms between 1 and 4),
  floors smallint not null default 1 check (floors = 1),
  width_m numeric(8,2) not null check (width_m > 0 and width_m <= 200),
  depth_m numeric(8,2) not null check (depth_m > 0 and depth_m <= 200),
  floor_area_m2 numeric(10,2) not null check (floor_area_m2 > 0 and floor_area_m2 <= 40000),
  geometry_schema_version integer not null default 2 check (geometry_schema_version > 0),
  -- Shared layout.js house object: metre coordinates, rooms, doors and windows.
  -- Store the ACTUAL geometry; do not regenerate historical designs on read.
  geometry jsonb not null check (jsonb_typeof(geometry) = 'object'
    and geometry ?& array['rooms','doors','windows']
    and jsonb_typeof(geometry->'rooms') = 'array'
    and jsonb_typeof(geometry->'doors') = 'array'
    and jsonb_typeof(geometry->'windows') = 'array'),
  specification jsonb not null default '{}'::jsonb check (jsonb_typeof(specification) = 'object'),
  validation jsonb not null check (jsonb_typeof(validation) = 'object'),
  fits_plot boolean not null,
  within_budget boolean not null,
  created_at timestamptz not null default now(),
  unique (project_id, version),
  unique (project_id, id),
  unique (id, pricing_release_id),
  foreign key (project_id, brief_id, pricing_release_id, generation_run_id)
    references public.generation_runs(project_id, brief_id, pricing_release_id, id)
);
create index house_concepts_run_idx on public.house_concepts(project_id, brief_id, pricing_release_id, generation_run_id);

create table public.cost_estimates (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null unique,
  pricing_release_id uuid not null,
  finish_level text not null check (finish_level in ('basic','standard','premium')),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  floor_area_m2 numeric(10,2) not null check (floor_area_m2 > 0 and floor_area_m2 <= 40000),
  rate_per_m2 numeric(12,2) not null check (rate_per_m2 > 0 and rate_per_m2 < 10000000),
  budget_snapshot numeric(14,2) not null check (budget_snapshot > 0 and budget_snapshot <= 100000000),
  -- Contingency is an explicit line INCLUDED in total, not added twice.
  total numeric(16,2) not null check (total > 0 and total < 10000000000000),
  assumptions text not null,
  exclusions text not null,
  created_at timestamptz not null default now(),
  foreign key (concept_id, pricing_release_id) references public.house_concepts(id, pricing_release_id) on delete cascade
);
create index cost_estimates_pricing_idx on public.cost_estimates(pricing_release_id);

create table public.cost_estimate_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.cost_estimates(id) on delete cascade,
  category text not null check (category in ('structure','finishes','services','professional_fees','contingency')),
  description text not null,
  amount numeric(16,2) not null check (amount >= 0 and amount < 10000000000000),
  unique (estimate_id, category)
);

create table public.concept_assets (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.house_concepts(id) on delete cascade,
  kind text not null check (kind in ('front','side','perspective','floor_plan','model_3d')),
  storage_bucket text not null default 'concept-assets' check (storage_bucket = 'concept-assets'),
  storage_path text not null unique check (char_length(btrim(storage_path)) > 0),
  alt_text text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create index concept_assets_concept_idx on public.concept_assets(concept_id, sort_order);

create table public.project_selections (
  project_id uuid primary key references public.projects(id) on delete cascade,
  concept_id uuid not null,
  selected_at timestamptz not null default now(),
  foreign key (project_id, concept_id) references public.house_concepts(project_id, id)
);
create index project_selections_concept_idx on public.project_selections(project_id, concept_id);

create table public.concept_exports (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.house_concepts(id) on delete cascade,
  format text not null check (format in ('svg','json','pdf')),
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  storage_bucket text not null default 'concept-exports' check (storage_bucket = 'concept-exports'),
  storage_path text unique,
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest) = 'object'),
  failure_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'ready') = (storage_path is not null)),
  check ((status in ('ready','failed')) = (completed_at is not null)),
  check (completed_at is null or completed_at >= created_at),
  check (storage_path is null or char_length(btrim(storage_path)) > 0)
);
create index concept_exports_concept_idx on public.concept_exports(concept_id, created_at desc);

-- Internal trigger functions are not exposed as Data API RPCs.
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger projects_touch before update on public.projects
for each row execute function private.touch_updated_at();

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name',''),120));
  return new;
end;
$$;
create trigger smarthouse_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();
-- Also support users who registered before this schema was installed.
insert into public.profiles(id, full_name)
select id, left(coalesce(raw_user_meta_data->>'full_name',''),120) from auth.users;

create function private.create_draft() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.consultation_drafts(project_id) values (new.id);
  return new;
end;
$$;
create trigger project_draft_created after insert on public.projects
for each row execute function private.create_draft();

-- Serialize saves against a row revision; clients cannot UPDATE drafts directly.
create function private.save_draft(p_project_id uuid, p_expected_revision integer, p_answers jsonb)
returns public.consultation_drafts
language plpgsql security definer set search_path = '' as $$
declare result public.consultation_drafts;
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects where id=p_project_id and owner_id=auth.uid() and status='active'
  ) then raise exception 'Active project not found' using errcode='42501'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 100000
  then raise exception 'Answers must be a JSON object under 100 KB' using errcode='22023'; end if;
  update public.consultation_drafts
  set answers=p_answers, revision=revision+1, updated_at=now()
  where project_id=p_project_id and revision=p_expected_revision returning * into result;
  if not found then raise exception 'Stale draft revision; reload before saving' using errcode='40001'; end if;
  return result;
end;
$$;
create function public.save_consultation_draft(p_project_id uuid, p_expected_revision integer, p_answers jsonb)
returns public.consultation_drafts language sql security invoker set search_path = '' as $$
  select private.save_draft(p_project_id, p_expected_revision, p_answers);
$$;

create function private.confirm_brief(p_project_id uuid, p_draft_revision integer, p_acknowledged boolean)
returns public.design_briefs
language plpgsql security definer set search_path = '' as $$
declare
  draft public.consultation_drafts;
  result public.design_briefs;
  a jsonb;
  k text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects where id=p_project_id and owner_id=auth.uid() and status='active'
  ) then raise exception 'Active project not found' using errcode='42501'; end if;
  if p_acknowledged is distinct from true then raise exception 'Brief acknowledgement required' using errcode='22023'; end if;
  select * into strict draft from public.consultation_drafts where project_id=p_project_id for update;
  if draft.revision is distinct from p_draft_revision then
    raise exception 'Stale draft revision; reload before confirming' using errcode='40001';
  end if;
  select * into result from public.design_briefs where project_id=p_project_id and draft_revision=p_draft_revision;
  if found then return result; end if;
  a := draft.answers;
  foreach k in array array['location','width','length','shape','terrain','access','budget','finish',
    'budgetIncludes','occupants','bedrooms','bathrooms','workFromHome','guests','kitchen','style','privacy','accessibility'] loop
    if a->>k is null or btrim(a->>k) = '' then
      raise exception 'Missing required answer: %', k using errcode='22023';
    end if;
  end loop;
  if a->>'shape' <> 'Rectangular' or a->>'terrain' not in ('Flat','Unknown') then
    raise exception 'Only rectangular plots without stated sloped terrain are supported' using errcode='22023';
  end if;
  if a->>'finish' not in ('Basic','Standard','Premium')
    or a->>'style' not in ('Modern','Traditional','Minimalist')
    or a->>'access' not in ('North','South','East','West','Unknown')
    or a->>'workFromHome' not in ('Yes','No') or a->>'guests' not in ('Rarely','Sometimes','Often')
    or a->>'kitchen' not in ('Open plan','Separate')
    or a->>'privacy' not in ('Separate from entertaining spaces','No preference')
    or a->>'accessibility' not in ('None stated','Step-free access','Other needs') then
    raise exception 'Unsupported consultation choice' using errcode='22023';
  end if;
  if (a->>'workFromHome' = 'Yes' and coalesce(a->>'office','') not in ('Dedicated quiet office','Shared workspace'))
    or (a->>'guests' = 'Often' and coalesce(btrim(a->>'guestNeeds'),'') = '')
    or (a->>'accessibility' = 'Other needs' and coalesce(btrim(a->>'accessibilityNotes'),'') = '') then
    raise exception 'Required follow-up answers are missing' using errcode='22023';
  end if;
  foreach k in array array['width','length','budget','occupants','bedrooms','bathrooms'] loop
    if jsonb_typeof(a->k) <> 'number' then raise exception 'Expected number: %', k using errcode='22023'; end if;
  end loop;
  if (a->>'occupants')::numeric not between 1 and 30
    or (a->>'bedrooms')::numeric not between 1 and 6
    or (a->>'bathrooms')::numeric not between 1 and 4
    or exists(select 1 from unnest(array['occupants','bedrooms','bathrooms']) as f(key)
      where (a->>f.key)::numeric <> trunc((a->>f.key)::numeric)) then
    raise exception 'Unsupported household or room counts' using errcode='22023';
  end if;
  insert into public.design_briefs(project_id,version,draft_revision,questionnaire_version,answers,site_width_m,site_depth_m,budget)
  select p_project_id,coalesce(max(version),0)+1,draft.revision,draft.questionnaire_version,a,
    (a->>'width')::numeric,(a->>'length')::numeric,(a->>'budget')::numeric
  from public.design_briefs where project_id=p_project_id returning * into result;
  return result;
end;
$$;
create function public.confirm_design_brief(p_project_id uuid, p_draft_revision integer, p_acknowledged boolean)
returns public.design_briefs language sql security invoker set search_path = '' as $$
  select private.confirm_brief(p_project_id, p_draft_revision, p_acknowledged);
$$;

-- Historical snapshots may never be edited in place (even by application admins).
create function private.reject_snapshot_update() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'Immutable snapshot: create a new version instead'; end;
$$;
do $$
declare t text;
begin
  foreach t in array array['design_briefs','pricing_releases','house_concepts','cost_estimates','cost_estimate_lines'] loop
    execute format('create trigger immutable_snapshot before update on public.%I for each row execute function private.reject_snapshot_update()',t);
  end loop;
end;
$$;

-- Check the five cost lines and their sum at transaction end, not midway through insertion.
create function private.check_estimate_lines() returns trigger
language plpgsql set search_path = '' as $$
declare estimate uuid; expected numeric; actual numeric; n integer;
begin
  if tg_table_name = 'cost_estimates' then estimate := new.id;
  elsif tg_op = 'DELETE' then estimate := old.estimate_id;
  else estimate := new.estimate_id; end if;
  select total into expected from public.cost_estimates where id=estimate;
  if not found then return null; end if; -- parent cascade deletion
  select coalesce(sum(amount),0),count(*) into actual,n from public.cost_estimate_lines where estimate_id=estimate;
  if n <> 5 or actual <> expected then
    raise exception 'Estimate requires five categories summing to total (expected %, got % across % lines)',expected,actual,n;
  end if;
  return null;
end;
$$;
create constraint trigger estimate_total_checked after insert on public.cost_estimates
deferrable initially deferred for each row execute function private.check_estimate_lines();
create constraint trigger estimate_lines_checked after insert or update or delete on public.cost_estimate_lines
deferrable initially deferred for each row execute function private.check_estimate_lines();

create function private.validate_estimate() returns trigger
language plpgsql set search_path = '' as $$
declare area numeric; budget numeric; finish text; rate numeric; within boolean;
begin
  select c.floor_area_m2,b.budget,lower(b.answers->>'finish'),c.within_budget,
    case new.finish_level when 'basic' then r.basic_rate_per_m2
      when 'standard' then r.standard_rate_per_m2 when 'premium' then r.premium_rate_per_m2 end
  into area,budget,finish,within,rate
  from public.house_concepts c join public.design_briefs b on b.id=c.brief_id
  join public.pricing_releases r on r.id=c.pricing_release_id where c.id=new.concept_id;
  if not found or new.floor_area_m2 is distinct from area or new.budget_snapshot is distinct from budget
    or new.finish_level is distinct from finish or new.rate_per_m2 is distinct from rate
    or new.total is distinct from round(area*rate)
    or within is distinct from (new.total <= budget) then
    raise exception 'Estimate must match the saved concept, confirmed budget/finish, and pinned pricing release';
  end if;
  return new;
end;
$$;
create trigger estimate_snapshot_validated before insert on public.cost_estimates
for each row execute function private.validate_estimate();

create function private.check_concept_estimate() returns trigger
language plpgsql set search_path = '' as $$
declare concept uuid;
begin
  if tg_table_name = 'house_concepts' then concept := new.id; else concept := old.concept_id; end if;
  if exists(select 1 from public.house_concepts where id=concept)
    and not exists(select 1 from public.cost_estimates where concept_id=concept) then
    raise exception 'Save the house concept and its estimate in the same transaction';
  end if;
  return null;
end;
$$;
create constraint trigger concept_estimate_required after insert on public.house_concepts
deferrable initially deferred for each row execute function private.check_concept_estimate();
create constraint trigger concept_estimate_retained after delete on public.cost_estimates
deferrable initially deferred for each row execute function private.check_concept_estimate();

-- RLS: homeowners see their own project tree; admins publish pricing, not read other users' designs.
do $$
declare t text;
begin
  foreach t in array array['profiles','projects','consultation_drafts','design_briefs','pricing_releases',
    'generation_runs','house_concepts','cost_estimates','cost_estimate_lines','concept_assets','project_selections','concept_exports'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end;
$$;
grant usage on schema public to authenticated, service_role;
grant update(full_name) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));

grant insert(title), update(title,status) on public.projects to authenticated;
create policy projects_read on public.projects for select to authenticated using (owner_id=(select auth.uid()));
create policy projects_create on public.projects for insert to authenticated with check (owner_id=(select auth.uid()));
create policy projects_update on public.projects for update to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['consultation_drafts','design_briefs','generation_runs','house_concepts','project_selections'] loop
    execute format('create policy owner_read on public.%I for select to authenticated using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))',t);
  end loop;
  foreach t in array array['cost_estimates','concept_assets','concept_exports'] loop
    execute format('create policy owner_read on public.%I for select to authenticated using (exists(select 1 from public.house_concepts c where c.id=concept_id))',t);
  end loop;
end;
$$;
create policy estimate_lines_read on public.cost_estimate_lines for select to authenticated
using (exists(select 1 from public.cost_estimates e where e.id=estimate_id));

grant insert(version,context,currency,basic_rate_per_m2,standard_rate_per_m2,premium_rate_per_m2,assumptions,exclusions,effective_on,published_by)
on public.pricing_releases to authenticated;
create policy pricing_read on public.pricing_releases for select to authenticated using (true);
create policy pricing_publish on public.pricing_releases for insert to authenticated
with check ((select private.is_admin()) and published_by=(select auth.uid()));

grant insert(project_id,concept_id), update(concept_id,selected_at), delete on public.project_selections to authenticated;
create policy selection_create on public.project_selections for insert to authenticated
with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()) and p.status='active'));
create policy selection_update on public.project_selections for update to authenticated
using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()) and p.status='active'))
with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()) and p.status='active'));
create policy selection_delete on public.project_selections for delete to authenticated
using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));

-- Explicit EXECUTE grants; no function inherits PUBLIC execution rights.
revoke all on function private.touch_updated_at(), private.handle_new_user(), private.create_draft(),
  private.reject_snapshot_update(), private.check_estimate_lines(),
  private.validate_estimate(), private.check_concept_estimate(),
  private.save_draft(uuid,integer,jsonb), private.confirm_brief(uuid,integer,boolean),
  public.my_role(), public.save_consultation_draft(uuid,integer,jsonb), public.confirm_design_brief(uuid,integer,boolean)
from public, anon, authenticated;
grant execute on function private.save_draft(uuid,integer,jsonb), private.confirm_brief(uuid,integer,boolean),
  public.my_role(), public.save_consultation_draft(uuid,integer,jsonb), public.confirm_design_brief(uuid,integer,boolean)
to authenticated;

insert into public.pricing_releases(version,context,basic_rate_per_m2,standard_rate_per_m2,premium_rate_per_m2,assumptions,exclusions,effective_on)
values ('demo-v1','School prototype: illustrative South African area rates',9500,12500,17000,
  'Gross floor area multiplied by a demo finish rate. Total includes a 10% contingency allocation. Not verified market pricing.',
  'Land purchase, finance, site-specific abnormal works, and statutory approval costs are not independently calculated.',date '2026-11-03');

commit;
