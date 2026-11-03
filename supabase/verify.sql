-- Run in Supabase SQL Editor AFTER schema.sql. Read-only configuration checks.
do $$
declare t text; n integer;
begin
  foreach t in array array['profiles','projects','consultation_drafts','design_briefs','pricing_releases',
    'generation_runs','house_concepts','cost_estimates','cost_estimate_lines','concept_assets','project_selections','concept_exports'] loop
    if not exists(select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace
      where s.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'Missing table or RLS disabled: %',t;
    end if;
    if has_table_privilege('anon','public.'||t,'SELECT') then
      raise exception 'Unexpected anonymous SELECT grant: %',t;
    end if;
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and cmd='SELECT') then
      raise exception 'Missing authenticated read policy: %',t;
    end if;
  end loop;
  foreach t in array array['consultation_drafts','design_briefs','generation_runs','house_concepts',
    'cost_estimates','cost_estimate_lines','concept_assets','concept_exports'] loop
    if has_table_privilege('authenticated','public.'||t,'INSERT')
      or has_table_privilege('authenticated','public.'||t,'UPDATE')
      or has_table_privilege('authenticated','public.'||t,'DELETE') then
      raise exception 'Unexpected direct browser write grant: %',t;
    end if;
  end loop;
  if has_column_privilege('authenticated','public.projects','owner_id','UPDATE')
    or has_column_privilege('authenticated','public.projects','owner_id','INSERT')
    or has_table_privilege('authenticated','private.administrators','INSERT') then
    raise exception 'Ownership or role escalation grant detected';
  end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid=p.pronamespace
  where s.nspname='public' and p.proname in ('my_role','save_consultation_draft','confirm_design_brief')
    and not p.prosecdef;
  if n <> 3 then raise exception 'Missing invoker RPC wrappers'; end if;
  if not exists(select 1 from public.pricing_releases where version='demo-v1') then
    raise exception 'Demo pricing seed missing';
  end if;
  raise notice 'SmartHouse schema, RLS, RPCs and grant checks passed';
end;
$$;

select tablename, policyname, cmd, roles from pg_policies
where schemaname='public' and tablename in ('projects','design_briefs','house_concepts','pricing_releases')
order by tablename,policyname;
